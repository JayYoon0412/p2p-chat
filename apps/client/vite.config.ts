import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: __dirname,
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: ['.ngrok-free.app', '.ngrok-free.dev', 'localhost', '.ngrok'],
  },
});
