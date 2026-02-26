import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@benedicte/html-diff': resolve(__dirname, './src/index.ts'),
    },
  },
});
