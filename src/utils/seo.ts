// SEO optimization utilities

export interface SeoMetrics {
  title: string;
  description: string;
  keywords: string[];
  imageUrl?: string;
  canonicalUrl?: string;
  structuredData?: Record<string, unknown>;
}

// Generate optimized meta tags
export const generateMetaTags = (seo: SeoMetrics) => {
  const tags = [
    { name: 'description', content: seo.description },
    { name: 'keywords', content: seo.keywords.join(', ') },
    { name: 'robots', content: 'index, follow' },
    { name: 'author', content: 'AdmitConnect AI' },

    // Open Graph tags
    { property: 'og:title', content: seo.title },
    { property: 'og:description', content: seo.description },
    { property: 'og:type', content: 'website' },
    { property: 'og:site_name', content: 'AdmitConnect AI' },

    // Twitter Card tags
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: seo.title },
    { name: 'twitter:description', content: seo.description },

    // Additional meta tags
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    { name: 'theme-color', content: '#3b82f6' },
    { name: 'msapplication-TileColor', content: '#3b82f6' },
  ];

  if (seo.imageUrl) {
    tags.push(
      { property: 'og:image', content: seo.imageUrl },
      { name: 'twitter:image', content: seo.imageUrl }
    );
  }

  if (seo.canonicalUrl) {
    // Canonical URL will be handled separately in the HTML head
  }

  return tags;
};

// Generate structured data for search engines
export const generateStructuredData = (type: string, data: Record<string, any>) => {
  const baseStructure = {
    '@context': 'https://schema.org',
    '@type': type,
    ...data
  };

  return JSON.stringify(baseStructure);
};

// Common structured data schemas
export const structuredDataSchemas = {
  organization: {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'AdmitConnect AI',
    description: 'AI-powered college admission automation platform',
    url: 'https://admitconnect.ai',
    logo: 'https://admitconnect.ai/logo.png',
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+1-555-0123',
      contactType: 'customer service',
      email: 'hello@admitconnect.ai'
    },
    sameAs: [
      'https://linkedin.com/company/admitconnect',
      'https://twitter.com/admitconnect'
    ]
  },

  softwareApplication: {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'AdmitConnect AI',
    description: 'Automate college admissions with AI-powered voice calls, WhatsApp messaging, and analytics',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock'
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      reviewCount: '127'
    }
  },

  faq: (questions: Array<{ question: string; answer: string }>) => ({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: questions.map(qa => ({
      '@type': 'Question',
      name: qa.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: qa.answer
      }
    }))
  })
};

// SEO audit utilities
export const auditSeoElements = () => {
  if (typeof window === 'undefined') return null;

  const audit = {
    title: {
      exists: !!document.title,
      length: document.title.length,
      optimal: document.title.length >= 30 && document.title.length <= 60
    },
    description: {
      exists: false,
      length: 0,
      optimal: false
    },
    h1: {
      exists: false,
      count: 0,
      optimal: false
    },
    images: {
      total: 0,
      withAlt: 0,
      missingAlt: 0
    },
    links: {
      total: 0,
      external: 0,
      internal: 0
    }
  };

  // Check meta description
  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription) {
    const content = metaDescription.getAttribute('content') || '';
    audit.description = {
      exists: true,
      length: content.length,
      optimal: content.length >= 120 && content.length <= 160
    };
  }

  // Check H1 tags
  const h1Tags = document.querySelectorAll('h1');
  audit.h1 = {
    exists: h1Tags.length > 0,
    count: h1Tags.length,
    optimal: h1Tags.length === 1
  };

  // Check images
  const images = document.querySelectorAll('img');
  audit.images.total = images.length;
  images.forEach(img => {
    if (img.getAttribute('alt')) {
      audit.images.withAlt++;
    } else {
      audit.images.missingAlt++;
    }
  });

  // Check links
  const links = document.querySelectorAll('a[href]');
  audit.links.total = links.length;
  links.forEach(link => {
    const href = link.getAttribute('href') || '';
    if (href.startsWith('http') && !href.includes(window.location.hostname)) {
      audit.links.external++;
    } else {
      audit.links.internal++;
    }
  });

  return audit;
};

// Performance-related SEO utilities
export const optimizeImageLoading = () => {
  if (typeof window === 'undefined') return;

  // Add loading="lazy" to images that don't have it
  const images = document.querySelectorAll('img:not([loading])');
  images.forEach(img => {
    img.setAttribute('loading', 'lazy');
  });

  // Add decoding="async" for better performance
  const allImages = document.querySelectorAll('img:not([decoding])');
  allImages.forEach(img => {
    img.setAttribute('decoding', 'async');
  });
};

// Generate sitemap data
export const generateSitemapData = (pages: Array<{ url: string; lastModified?: Date; priority?: number }>) => {
  const sitemap = {
    '@context': 'https://schema.org',
    '@type': 'SiteNavigationElement',
    url: pages.map(page => ({
      '@type': 'WebPage',
      url: page.url,
      lastModified: page.lastModified?.toISOString(),
      priority: page.priority || 0.5
    }))
  };

  return sitemap;
};

// Core Web Vitals tracking for SEO
export const trackCoreWebVitals = () => {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;

  const vitals = {
    LCP: 0, // Largest Contentful Paint
    FID: 0, // First Input Delay
    CLS: 0  // Cumulative Layout Shift
  };

  try {
    // Track LCP
    const lcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      vitals.LCP = lastEntry.startTime;

      // Log if LCP is poor (> 2.5s)
      if (vitals.LCP > 2500) {
        console.warn('Poor LCP detected:', vitals.LCP);
      }
    });
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

    // Track FID
    const fidObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      entries.forEach(entry => {
        const fidEntry = entry as any;
        vitals.FID = fidEntry.processingStart - fidEntry.startTime;

        // Log if FID is poor (> 100ms)
        if (vitals.FID > 100) {
          console.warn('Poor FID detected:', vitals.FID);
        }
      });
    });
    fidObserver.observe({ entryTypes: ['first-input'] });

    // Track CLS
    const clsObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      entries.forEach(entry => {
        const clsEntry = entry as any;
        if (!clsEntry.hadRecentInput) {
          vitals.CLS += clsEntry.value;

          // Log if CLS is poor (> 0.1)
          if (vitals.CLS > 0.1) {
            console.warn('Poor CLS detected:', vitals.CLS);
          }
        }
      });
    });
    clsObserver.observe({ entryTypes: ['layout-shift'] });

  } catch (error) {
    console.warn('Failed to track Core Web Vitals:', error);
  }

  return vitals;
};