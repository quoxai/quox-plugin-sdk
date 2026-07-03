import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import quoxPlugin from 'quox-plugin-vite';

export default defineConfig({
    plugins: [
        react(),
        quoxPlugin({ pluginId: '${pluginName}' }),
    ],
});
