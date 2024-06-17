import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { crx } from '@crxjs/vite-plugin';
import zipPack from 'vite-plugin-zip-pack';
import manifest from './manifest.json';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    define: {
      'process.env.USE_MOCK': env.USE_MOCK,
      'process.env.OPENAI_API_KEY': JSON.stringify(env.OPENAI_API_KEY),
    },
    plugins: [react(), crx({ manifest }), zipPack()],
    server: {
      port: 3000,
    },
  };
});
