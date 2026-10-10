import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { seoPlugin } from './seo/plugin';
export default defineConfig(({mode}) => {
 const env = loadEnv(mode, process.cwd(), 'VITE_');
 return { plugins: [react(), seoPlugin(env.VITE_SITE_URL)], server: { port: 5173, strictPort: true }, build: { chunkSizeWarningLimit: 650 } };
});
