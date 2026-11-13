import { createApiApp } from './_lib/app.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

const app = createApiApp();

export default app;
