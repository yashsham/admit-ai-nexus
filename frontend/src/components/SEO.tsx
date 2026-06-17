import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
  schema?: object;
}

export const SEO = ({
  title = 'AdmitConnect AI - Intelligent College Admission Campaign Management',
  description = 'Revolutionize your college admission outreach with AI-powered campaign management, automated follow-ups, and real-time analytics. Boost enrollment with smart WhatsApp, voice, and email campaigns.',
  keywords = 'college admission software, AI campaign management, student recruitment, WhatsApp marketing, voice campaigns, admission analytics, enrollment automation, higher education CRM',
  image = '/og-image.jpg',
  url = 'https://admitconnect.ai',
  type = 'website',
  schema
}: SEOProps) => {
  const fullTitle = title.includes('AdmitConnect AI') ? title : `${title} | AdmitConnect AI`;

  const defaultSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "AdmitConnect AI",
    "description": description,
    "url": url,
    "applicationCategory": "Educational Software",
    "operatingSystem": "Web Browser",
    "offers": {
      "@type": "Offer",
      "category": "SaaS",
      "price": "0",
      "priceCurrency": "USD"
    },
    "creator": {
      "@type": "Organization",
      "name": "AdmitConnect AI",
      "url": url
    }
  };

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="robots" content="index, follow" />
      <meta name="author" content="AdmitConnect AI" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      
      {/* Canonical URL */}
      <link rel="canonical" href={url} />
      
      {/* Open Graph Tags */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content="AdmitConnect AI" />
      
      {/* Twitter Card Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      
      {/* Additional Meta Tags */}
      <meta name="theme-color" content="#000000" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      
      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(schema || defaultSchema)}
      </script>
    </Helmet>
  );
};

// Page-specific SEO configurations
export const pageSEO = {
  home: {
    title: 'AdmitConnect AI - Intelligent College Admission Campaign Management',
    description: 'Transform your college admissions process with AI-powered campaign management. Automate WhatsApp, voice, and email outreach with intelligent analytics and real-time tracking.',
    keywords: 'college admission AI, student recruitment automation, admission campaign management, WhatsApp marketing education, voice call automation, enrollment analytics'
  },
  
  dashboard: {
    title: 'Dashboard - AdmitConnect AI',
    description: 'Manage your admission campaigns, track performance metrics, and analyze student engagement data from your comprehensive dashboard.',
    keywords: 'admission dashboard, campaign analytics, student metrics, enrollment tracking'
  },
  
  about: {
    title: 'About Us - AdmitConnect AI',
    description: 'Learn about AdmitConnect AI\'s mission to revolutionize college admissions through intelligent automation and data-driven insights.',
    keywords: 'about admitconnect, college admission technology, AI education solutions'
  },
  
  services: {
    title: 'Our Services - AdmitConnect AI',
    description: 'Discover our comprehensive suite of AI-powered services for college admission campaigns, including automated outreach, analytics, and student engagement tools.',
    keywords: 'admission services, AI campaign tools, student outreach automation, enrollment services'
  },
  
  pricing: {
    title: 'Pricing Plans - AdmitConnect AI',
    description: 'Choose the perfect plan for your institution. Flexible pricing options for colleges and universities of all sizes.',
    keywords: 'admission software pricing, AI campaign costs, college enrollment plans'
  }
};

// Generate FAQ Schema
export const generateFAQSchema = (faqs: Array<{question: string, answer: string}>) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": faqs.map(faq => ({
    "@type": "Question",
    "name": faq.question,
    "acceptedAnswer": {
      "@type": "Answer",
      "text": faq.answer
    }
  }))
});

// Generate Organization Schema
export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "AdmitConnect AI",
  "url": "https://admitconnect.ai",
  "logo": "https://admitconnect.ai/logo.png",
  "description": "AI-powered college admission campaign management platform",
  "foundingDate": "2024",
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "customer service",
    "email": "support@admitconnect.ai"
  },
  "sameAs": [
    "https://linkedin.com/company/admitconnect-ai",
    "https://twitter.com/admitconnectai"
  ]
};