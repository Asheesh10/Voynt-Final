import { defineConfig } from 'vite';

export default defineConfig({
    optimizeDeps: {
        include: [
            '@splinetool/react-spline',
            '@splinetool/runtime',
        ],
        esbuildOptions: {
            target: 'esnext',
        },
    },
    build: {
        target: 'esnext',
    },
});
