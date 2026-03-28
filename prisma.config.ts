console.log('prisma.config.ts loaded, DATABASE_URL:', process.env.DATABASE_URL);

import 'dotenv/config';
import { defineConfig } from 'prisma/config';


export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});