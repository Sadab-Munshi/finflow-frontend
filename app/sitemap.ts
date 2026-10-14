import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://www.app.sadabmunshi.me',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1.0,
    },
    {
      url: 'https://www.app.sadabmunshi.me/login',
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.5,
    },
    {
      url: 'https://www.app.sadabmunshi.me/signup',
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.8,
    },
    ...['/terms', '/privacy', '/disclaimer', '/support', '/user-guide'].map(
      (path) => ({
        url: `https://www.app.sadabmunshi.me${path}`,
        lastModified: new Date(),
        changeFrequency: 'yearly' as const,
        priority: 0.3,
      })
    ),
  ]
}
