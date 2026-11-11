import type { BusinessHour, Service, SiteSettings } from './types';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function businessJsonLd(s: SiteSettings, services: Service[], hours: BusinessHour[], site: URL | undefined) {
  const url = site?.href ?? 'https://betsypeinados.com/';
  return {
    '@context': 'https://schema.org',
    '@type': 'HairSalon',
    '@id': `${url}#negocio`,
    name: s.business_name,
    description: s.hero_subtitle,
    url,
    image: new URL('/apple-touch-icon.png', url).href,
    telephone: `+${s.whatsapp}`,
    email: s.email,
    priceRange: '$$',
    currenciesAccepted: 'COP',
    address: {
      '@type': 'PostalAddress',
      streetAddress: s.address,
      addressLocality: s.city,
      addressRegion: s.region,
      addressCountry: 'CO',
    },
    areaServed: { '@type': 'City', name: s.city },
    sameAs: [`https://www.instagram.com/${s.instagram}/`],
    openingHoursSpecification: hours
      .filter((h) => h.enabled)
      .map((h) => ({
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: DAYS[h.weekday],
        opens: h.open_time.slice(0, 5),
        closes: h.close_time.slice(0, 5),
      })),
    potentialAction: {
      '@type': 'ReserveAction',
      target: { '@type': 'EntryPoint', urlTemplate: new URL('/reservar', url).href, actionPlatform: ['http://schema.org/DesktopWebPlatform', 'http://schema.org/MobileWebPlatform'] },
      result: { '@type': 'Reservation', name: 'Cita de peinado' },
    },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Servicios de peinado',
      itemListElement: services.map((sv) => ({
        '@type': 'Offer',
        itemOffered: { '@type': 'Service', name: sv.name, description: sv.description },
        ...(sv.price_from != null ? { priceSpecification: { '@type': 'PriceSpecification', minPrice: sv.price_from, priceCurrency: 'COP' } } : {}),
      })),
    },
  };
}

export function faqJsonLd(faq: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };
}
