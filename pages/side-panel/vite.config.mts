import { resolve } from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import { withPageConfig } from '@extension/vite-config';

const rootDir = resolve(__dirname);
const srcDir = resolve(rootDir, 'src');

export default defineConfig(({ mode }) => {
  // Load environment variables from the root directory
  const env = loadEnv(mode, resolve(rootDir, '..', '..'), 'VITE_');
  
  return withPageConfig({
    resolve: {
      alias: {
        '@src': srcDir,
      },
    },
    publicDir: resolve(rootDir, 'public'),
    build: {
      outDir: resolve(rootDir, '..', '..', 'dist', 'side-panel'),
    },
    define: {
      'import.meta.env.VITE_AUTH_WEBSITE_URL': JSON.stringify(env.VITE_AUTH_WEBSITE_URL || 'https://www.useverseai.com'),
    },
  });
});
