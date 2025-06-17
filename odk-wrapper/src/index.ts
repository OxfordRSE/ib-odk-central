// src/index.ts
import express from 'express';
import { json } from 'body-parser';
import wrapperRouter from './routes/wrapper';
import swaggerUi from 'swagger-ui-express';
import { openApiDocument } from './openapi';

const app = express();
const port = process.env.PORT || 3000;

app.use(json());

// Main API endpoint
app.use('/', wrapperRouter);

// Swagger docs
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  console.log(`Swagger docs at http://localhost:${port}/docs`);
});
