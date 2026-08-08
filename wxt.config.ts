import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'wxt';

export default defineConfig({
  publicDir: 'public',
  entrypointsDir: 'src/entrypoints',
  manifestVersion: 3,
  manifest: {
    name: 'Barra/AI',
    version: '1.4.0',
    description: 'Barra/AI - summon AI with a slash',
    icons: {
      '16': 'icons/icon_16.png',
      '32': 'icons/icon_32.png',
      '48': 'icons/icon_48.png',
      '128': 'icons/icon_128.png',
    },
    permissions: ['storage', 'notifications', 'declarativeNetRequest'],
    host_permissions: [
      'http://localhost/*',
      'http://127.0.0.1/*',
      'http://0.0.0.0/*',
    ],
    action: {
      default_icon: {
        '16': 'icons/icon_16.png',
        '48': 'icons/icon_48.png',
        '128': 'icons/icon_128.png',
      },
    },
  },
  vite: ({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');

    return {
      define: {
        'process.env.USE_MOCK': JSON.stringify(env.USE_MOCK),
      },
      plugins: [react()],
    };
  },
});
