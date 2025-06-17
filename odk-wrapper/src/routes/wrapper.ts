// src/routes/wrapper.ts
import express from 'express';
import fs from 'fs';
import path from 'path';
import { ODKRequestSchema } from '../schemas/input';
import {
  authenticateODK,
  downloadAndUnzipSubmissions,
  processCSV, zipDirectory,
} from '../utils/odk';
import os from "os";

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const parsed = ODKRequestSchema.parse(req.body);
    parsed.odkCentralUrl = parsed.odkCentralUrl.replace(/\/$/, ''); // Ensure no trailing slash

    const token = await authenticateODK(parsed.odkCentralUrl, parsed.email, parsed.password);
    const rootTempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'odk-'));
    const tempDir = path.join(rootTempDir, parsed.formName);

    await downloadAndUnzipSubmissions(
      tempDir,
      parsed.odkCentralUrl,
      parsed.projectId,
      parsed.formName,
      token,
      parsed.decryptionKeys
    );

    const csvPath = path.join(tempDir, `${parsed.formName}.csv`);
    await processCSV(csvPath, parsed.idFieldId, parsed.dropFieldIds);

    const zipPath = path.join(rootTempDir, 'processed.zip');
    await zipDirectory(tempDir, zipPath);

    res.download(zipPath, `${parsed.formName}.zip`, () => {
      // Cleanup
      setTimeout(() => fs.rmSync(rootTempDir, { recursive: true, force: true }), 1000);
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'An error occurred while processing the request.', parent: err });
  }
});

export default router;
