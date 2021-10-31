import { defineConfig, PluginOption } from 'vite';
import react from '@vitejs/plugin-react';

import { configureFakeApi } from './fake-api';

const apiPlugin: PluginOption = {
  name: 'api',
  configureServer: configureFakeApi,
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), apiPlugin],
});
