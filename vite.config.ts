import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import zipPack from 'vite-plugin-zip-pack';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    define: {
      'process.env.USE_MOCK': env.USE_MOCK,
    },
    plugins: [react(), zipPack()],
    server: {
      port: 3000,
    },
  };
});
