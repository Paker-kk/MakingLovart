import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const requestedPort = Number(env.VITE_PORT || 4173);

    return {
        server: {
            host: env.VITE_HOST || '127.0.0.1',
            port: Number.isFinite(requestedPort) ? requestedPort : 4173,
            strictPort: false,
        },
        plugins: [react()],
        optimizeDeps: {
            entries: ['index.html'],
        },
        define: {
            'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
            'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        },
        resolve: {
            alias: {
                '@': path.resolve(__dirname, '.'),
            },
        },
    };
});
