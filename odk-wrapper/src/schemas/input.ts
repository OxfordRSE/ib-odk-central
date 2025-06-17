// src/schemas/input.ts
import { z } from 'zod';
import { extendZodWithOpenApi } from 'zod-openapi';

extendZodWithOpenApi(z);

export const ODKRequestSchema = z
  .object({
    odkCentralUrl: z
      .string()
      .url()
      .openapi({
        description: 'The URL of the ODK Central instance with your data.',
        example: 'https://my-odk-central.com/',
      }),
    email: z
      .string()
      .email()
      .openapi({
        description: 'Your login email for ODK Central.',
        example: 'my-email@example.com',
      }),
    password: z
      .string()
      .min(1)
      .openapi({
        description: 'Your ODK Central password.',
        example: 'password1234',
      }),
    projectId: z
      .number()
      .int()
      .positive()
      .openapi({
        description: 'The ID number of the project you want data from.',
        example: 1,
      }),
    formName: z
      .string()
      .min(1)
      .openapi({
        description: 'The xmlFormId of the form you want data from.',
        example: 'My interesting survey',
      }),
    decryptionKeys: z
      .record(z.string(), z.string())
      .transform((val) => {
        const result: Record<number, string> = {};
        for (const [key, value] of Object.entries(val)) {
          const numKey = Number(key);
          if (!Number.isNaN(numKey)) {
            result[numKey] = value;
          } else {
            throw new Error(`Invalid key '${key}' in decryptionKeys; expected a number.`);
          }
        }
        return result;
      })
      .openapi({
        description: 'Decryption keys for centrally managed encryption.',
        example: { 1: 'password1234' },
      }),
    idFieldId: z
      .string()
      .min(1)
      .openapi({
        description:
          'The ID of the field that should be used to identify longitudinally linked submissions.',
        example: 'id',
      }),
    dropFieldIds: z
      .array(z.string())
      .optional()
      .openapi({
        description:
          'The IDs of any fields that should be removed from the data. The ID field is replaced with a UUID and cannot be removed.',
        example: ['another-id-field'],
      }),
  })
  .openapi({
    ref: 'ODKRequest',
    description: 'Schema for ODK Central data processing request.',
  });

export type ODKRequest = z.infer<typeof ODKRequestSchema>;
