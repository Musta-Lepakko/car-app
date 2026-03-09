import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(function (_a) {
    var mode = _a.mode;
    var env = loadEnv(mode, process.cwd(), '');
    var target = env.VITE_BACKEND_ORIGIN || 'http://localhost:3001';
    return {
        plugins: [react()],
        server: {
            port: 5173,
            proxy: {
                '/api': target,
                '/health': target
            }
        }
    };
});
