import { createApiApp } from './_lib/app';

export const config = {
  api: {
    bodyParser: false,
  },
};

const app = createApiApp();

export default app;
