import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: vercel(),
  site: process.env.SITE_URL || 'https://decayfix.sprintlabsai.com',
  integrations: [
    react(),
    sitemap({
      filter: (page) =>
        !page.includes('/dashboard') &&
        !page.includes('/billing') &&
        !page.includes('/login') &&
        !page.includes('/admin') &&
        !page.includes('/settings') &&
        !page.includes('/api'),
      serialize: (item) => {
        const url = item.url;
        if (url === 'https://decayfix.sprintlabsai.com/' || url === 'https://decayfix.sprintlabsai.com') {
          item.changefreq = 'weekly';
          item.priority = 1.0;
        } else if (url.includes('/pricing')) {
          item.changefreq = 'weekly';
          item.priority = 0.9;
        } else if (url.includes('/for/')) {
          item.changefreq = 'monthly';
          item.priority = 0.85;
        } else if (url.includes('/blog')) {
          item.changefreq = 'monthly';
          item.priority = 0.8;
        } else {
          item.changefreq = 'monthly';
          item.priority = 0.5;
        }
        return item;
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'lucide-react'],
    },
  },
});
