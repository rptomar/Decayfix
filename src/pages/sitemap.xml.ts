import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const prerender = false;

interface SitemapItem {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: string;
}

export const GET: APIRoute = async () => {
  const baseUrl = 'https://decayfix.sprintlabsai.com';
  const today = new Date().toISOString().split('T')[0];

  // Static marketing & service pages (strict canonical URLs without trailing slashes)
  const staticPages: SitemapItem[] = [
    { loc: `${baseUrl}/`, changefreq: 'weekly', priority: '1.0', lastmod: today },
    { loc: `${baseUrl}/pricing`, changefreq: 'weekly', priority: '0.9', lastmod: today },
    { loc: `${baseUrl}/blog`, changefreq: 'daily', priority: '0.85', lastmod: today },
    { loc: `${baseUrl}/for/saas`, changefreq: 'monthly', priority: '0.8', lastmod: today },
    { loc: `${baseUrl}/for/ecommerce`, changefreq: 'monthly', priority: '0.8', lastmod: today },
    { loc: `${baseUrl}/for/agencies`, changefreq: 'monthly', priority: '0.8', lastmod: today },
    { loc: `${baseUrl}/for/publishers`, changefreq: 'monthly', priority: '0.8', lastmod: today },
    { loc: `${baseUrl}/contact`, changefreq: 'monthly', priority: '0.5', lastmod: today },
    { loc: `${baseUrl}/support`, changefreq: 'monthly', priority: '0.5', lastmod: today },
    { loc: `${baseUrl}/privacy`, changefreq: 'yearly', priority: '0.4', lastmod: '2026-09-12' },
    { loc: `${baseUrl}/terms`, changefreq: 'yearly', priority: '0.4', lastmod: '2026-09-12' },
  ];

  // Dynamic blog collection pages
  let blogItems: SitemapItem[] = [];
  try {
    const blogPosts = await getCollection('blog');
    blogItems = blogPosts.map((post) => {
      const lastmodDate = post.data.dateModified || post.data.datePublished || today;
      return {
        loc: `${baseUrl}/blog/${post.id}`,
        lastmod: lastmodDate,
        changefreq: 'monthly',
        priority: '0.8',
      };
    });
  } catch (err) {
    console.error('Failed to load blog posts for sitemap:', err);
  }

  const allItems = [...staticPages, ...blogItems];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allItems
  .map(
    (item) => `  <url>
    <loc>${item.loc}</loc>
    ${item.lastmod ? `<lastmod>${item.lastmod}</lastmod>` : ''}
    ${item.changefreq ? `<changefreq>${item.changefreq}</changefreq>` : ''}
    ${item.priority ? `<priority>${item.priority}</priority>` : ''}
  </url>`
  )
  .join('\n')}
</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
};
