import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  const url = context.url;

  // Enforce trailing slash removal for SEO canonicalization (301 Permanent Redirect)
  if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
    const cleanPath = url.pathname.replace(/\/+$/, '');
    const destination = `${cleanPath}${url.search}`;
    return context.redirect(destination, 301);
  }

  // Redirect legacy sitemap paths to the canonical sitemap.xml
  if (url.pathname === '/sitemap-index.xml' || url.pathname === '/sitemap-0.xml') {
    return context.redirect('/sitemap.xml', 301);
  }

  return next();
});
