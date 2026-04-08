// components/JsonLd.tsx
export function WebsiteJsonLd() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: 'FinFlow',
          url: 'https://app.sadabmunshi.online',
          description:
            'Track every rupee effortlessly. Add expenses by voice, photo, or text in Hindi, English, or Bengali.',
          applicationCategory: 'FinanceApplication',
          operatingSystem: 'Web, Android, iOS',
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'INR',
          },
          author: {
            '@type': 'Person',
            name: 'Sadab Munshi',
          },
          inLanguage: ['en', 'hi', 'bn'],
          audience: {
            '@type': 'Audience',
            geographicArea: {
              '@type': 'Country',
              name: 'India',
            },
          },
        }),
      }}
    />
  )
}

export function OrganizationJsonLd() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: 'FinFlow',
          url: 'https://app.sadabmunshi.online',
          logo: 'https://app.sadabmunshi.online/logo.png',
          sameAs: [],   // add your Twitter/LinkedIn URLs here later
        }),
      }}
    />
  )
}
