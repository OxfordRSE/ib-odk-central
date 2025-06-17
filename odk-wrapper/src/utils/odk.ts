// src/utils/odk.ts
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import os from 'os';
import unzipper from 'unzipper';
import csv from 'csvtojson';
import { Parser } from 'json2csv';
import archiver from 'archiver';

export async function authenticateODK(odkCentralUrl: string, email: string, password: string): Promise<string> {
  const response = await axios.post(`${odkCentralUrl}/v1/sessions`, { email, password });
  return response.data.token;
}

export async function downloadAndUnzipSubmissions(
  tempDir: string,
  odkCentralUrl: string,
  projectId: number,
  formName: string,
  token: string,
  decryptionKeys: Record<number, string>
): Promise<void> {
  fs.mkdirSync(tempDir, { recursive: true });
  const zipPath = path.join(`${tempDir}/..`, 'submissions.zip');

  // Construct decryption key query parameters
  const keyParams = new URLSearchParams();
  for (const [keyId, passphrase] of Object.entries(decryptionKeys)) {
    keyParams.append(keyId.toString(), passphrase);
  }

  const response = await axios.get(
    `${odkCentralUrl}/v1/projects/${projectId}/forms/${encodeURIComponent(formName)}/submissions.csv.zip?${keyParams.toString()}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'stream',
    }
  );

  const writer = fs.createWriteStream(zipPath);
  response.data.pipe(writer);

  await new Promise<void>((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });

  // Unzip the file
  await fs
    .createReadStream(zipPath)
    .pipe(unzipper.Extract({ path: tempDir }))
    .promise();
}


export async function processCSV(
  csvPath: string,
  idFieldId: string,
  dropFieldIds: string[] = []
): Promise<void> {
  const rows = await csv().fromFile(csvPath);

  // Map of idFieldId to KEY
  const idToKeyMap = new Map<string, string>();
  for (const row of rows) {
    const idValue = row[idFieldId];
    if (idValue && !idToKeyMap.has(idValue)) {
      idToKeyMap.set(idValue, row['KEY']);
    }
  }

  // Replace idFieldId with corresponding KEY and drop specified fields
  const processedRows = rows.map((row) => {
    const newRow: Record<string, string> = { ...row };
    const idValue = row[idFieldId];
    if (idValue && idToKeyMap.has(idValue)) {
      newRow[idFieldId] = idToKeyMap.get(idValue)!;
    }

    for (const field of dropFieldIds) {
      delete newRow[field];
    }

    return newRow;
  });

  // Convert back to CSV
  const parser = new Parser();
  parser.parse(processedRows);
  // Write the processed CSV back to the file
  fs.writeFileSync(csvPath, parser.parse(processedRows), 'utf8');
}

/**
 * Zips the contents of a directory.
 * @param inputDir - The directory to zip.
 * @param outputZipPath - The destination path for the zip file.
 * @returns A promise that resolves when the zip is complete.
 */
export async function zipDirectory(inputDir: string, outputZipPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputZipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => resolve());
    output.on('error', reject);
    archive.on('error', reject);

    archive.pipe(output);
    archive.directory(inputDir, false); // false to include contents without the folder itself
    archive.finalize();
  });
}