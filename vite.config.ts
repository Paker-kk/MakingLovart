import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/runninghub-api': {
            target: 'https://www.runninghub.cn',
            changeOrigin: true,
            rewrite: (p: string) => p.replace(/^\/runninghub-api/, '/openapi/v2'),
            secure: true,
          },
        },
      },
      plugins: [react()],
      // 排除独立 HTML 文件，避免 esbuild 扫描其内联脚本报错
      optimizeDeps: {
        entries: ['index.html'],
      },
      define: {
        // NOTE: These are embedded at build time. In production,
        // prefer runtime config via Settings panel (setGeminiRuntimeConfig).
        // Only set for local dev / AI Studio embed scenarios — never commit real keys.
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || ''),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || '')
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      test: {
        globals: true,
        environment: 'node',
        setupFiles: ['./tests/setup.ts'],
      },
    };
});
