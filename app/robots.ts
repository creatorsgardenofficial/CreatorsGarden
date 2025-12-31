import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/', '/login', '/register', '/profile', '/bookmarks', '/feedback'],
      },
    ],
    sitemap: 'https://creators-garden-app.vercel.app/sitemap.xml',
  };
}

