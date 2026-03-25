import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/feed/hashtag/',
        ],
        disallow: [
          '/feed',
          '/dashboard',
          '/admin',
          '/settings',
          '/messages',
          '/notifications',
          '/profile',
          '/credits',
          '/invite',
          '/api/',
          '/onboarding',
          '/companies/new',
          '/callback',
          '/reset-password',
          '/checkout',
        ],
      },
    ],
    sitemap: 'https://metal-gear-five.vercel.app/sitemap.xml',
    host: 'https://metal-gear-five.vercel.app',
  }
}
