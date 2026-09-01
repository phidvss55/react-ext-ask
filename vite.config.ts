import { copyFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-extension-manifest',
      closeBundle() {
        const outputDirectory = resolve(projectRoot, 'dist');
        mkdirSync(outputDirectory, { recursive: true });
        copyFileSync(resolve(projectRoot, 'manifest.json'), resolve(outputDirectory, 'manifest.json'));
      },
    },
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(projectRoot, 'index.html'),
        'service-worker': resolve(projectRoot, 'src/background/service-worker.ts'),
      },
      output: {
        entryFileNames: (chunk) =>
          chunk.name === 'service-worker' ? 'background/service-worker.js' : 'assets/[name]-[hash].js',
      },
    },
  },
});
