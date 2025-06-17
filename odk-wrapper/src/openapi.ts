// src/openapi.ts
import { extendZodWithOpenApi, createDocument } from 'zod-openapi';
import { z } from 'zod';
import { ODKRequestSchema } from './schemas/input';

extendZodWithOpenApi(z);

export const openApiDocument = createDocument({
  openapi: '3.0.0',
  info: {
    title: 'ODK Central Wrapper API',
    version: '1.0.0',
    description: 'API for processing ODK Central data exports',
  },
  paths: {
    '/': {
      post: {
        summary: 'Process ODK Central data export',
        requestBody: {
          content: {
            'application/json': {
              schema: ODKRequestSchema,
            },
          },
          required: true,
        },
        responses: {
          '200': {
            description: 'Processed ODK data',
            content: {
              'application/json': {
                schema: z.object({
                  message: z.string().openapi({
                    example: 'ODK data processing not yet implemented.',
                  }),
                }),
              },
            },
          },
          '400': {
            description: 'Invalid request',
            content: {
              'application/json': {
                schema: z.object({
                  error: z.string().openapi({
                    example: 'Invalid input data.',
                  }),
                }),
              },
            },
          },
          '500': {
            description: 'Server error',
            content: {
              'application/json': {
                schema: z.object({
                  error: z.string().openapi({
                    example: 'Unknown error occurred.',
                  }),
                }),
              },
            },
          },
        },
      },
    },
  },
});
