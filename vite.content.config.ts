import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    minify: false,
    emptyOutDir: false,
    outDir: 'dist',
    cssCodeSplit: false,
    rollupOptions: {
      input: {
        content: resolve(__dirname, 'src/content/index.tsx'),
      },
      output: {
        entryFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
        format: 'iife',
        name: 'HachimiContent',
      },
    },
  },
})
