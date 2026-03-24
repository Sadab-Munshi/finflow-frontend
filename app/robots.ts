import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/login', '/signup', '/support', '/privacy', '/terms', '/disclaimer'],
      disallow: [
        '/dashboard',
        '/add',
        '/history',
        '/budgets',
        '/insights',
        '/reports',
        '/settings',
        '/transaction',
        '/api',
        '/admin',
      ],
    },
    sitemap: 'https://app.sadabmunshi.online/sitemap.xml',
  }
}
