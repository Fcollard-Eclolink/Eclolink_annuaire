export interface SelectOption {
  value: string
  label: string
  slug : string
}

export interface TechOption {
  id   : string
  label: string
  slug ?: string
  svg  ?: string
}

export const HOSTERS: SelectOption[] = [
  { value: 'Gandi',   label: 'Gandi',   slug: 'gandi'   },
  { value: 'IONOS',   label: 'IONOS',   slug: 'ionos'   },
  { value: 'Namebay', label: 'Namebay', slug: 'namebay' },
  { value: 'OVH',     label: 'OVH',     slug: 'ovh'     },
]

export const WEB_SERVERS: SelectOption[] = [
  { value: 'Apache', label: 'Apache', slug: 'apache' },
  { value: 'Nginx',  label: 'Nginx',  slug: 'nginx'  },
]

export const DNS_PROVIDERS: SelectOption[] = [
  { value: 'Cloudflare', label: 'Cloudflare', slug: 'cloudflare' },
  { value: 'Gandi',      label: 'Gandi',      slug: 'gandi'      },
  { value: 'OVH',        label: 'OVH',        slug: 'ovh'        },
]

export const TECHS: TechOption[] = [
  { id: 'wordpress',   label: 'WordPress',   slug: 'wordpress'   },
  {
    id: 'divi', label: 'Divi',
    svg: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" fill="#7B5EA7"/><path d="M8 7h4.5C15.5 7 17.5 9.2 17.5 12s-2 5-4.5 5H8V7zm2 2v6h2.5c1.5 0 2.5-1.3 2.5-3s-1-3-2.5-3H10z" fill="white"/></svg>`,
  },
  { id: 'elementor',   label: 'Elementor',   slug: 'elementor'   },
  {
    id: 'wpbakery', label: 'WP Bakery',
    svg: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="3" fill="#0073AA"/><path d="M3.5 8l2.2 7.5 1.8-5 1.8 5L11.5 8H9.8L8.5 12.5 7 8H5.8l-1.5 4.5L3 8h.5zm10 0v7.5h2.8c1.6 0 2.7-1 2.7-2.3 0-.9-.5-1.6-1.2-2 .4-.4.7-1 .7-1.6 0-1.1-1-1.6-2.3-1.6H13.5zm1.4 1.3h1.3c.7 0 1 .4 1 .9s-.3 1-1 1h-1.3V9.3zm0 3.1h1.3c.9 0 1.4.4 1.4 1.2s-.5 1.2-1.4 1.2h-1.3V12.4z" fill="white"/></svg>`,
  },
  { id: 'prestashop',  label: 'PrestaShop',  slug: 'prestashop'  },
  { id: 'woocommerce', label: 'WooCommerce', slug: 'woocommerce' },
  { id: 'drupal',      label: 'Drupal',      slug: 'drupal'      },
  { id: 'symfony',     label: 'Symfony',     slug: 'symfony'     },
  { id: 'laravel',     label: 'Laravel',     slug: 'laravel'     },
  {
    id: 'nuxt', label: 'Nuxt',
    svg: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M13.468 3.809L8.35 12.68 6.423 9.505 2 17.5h5.957c.07 1.128.993 2 2.116 2 1.12 0 2.044-.872 2.116-2H22L13.468 3.809zM7.957 16H5.08l3.662-6.34.98 1.699L7.957 16zm4.116 0H9.43l2.043-3.539L13.516 16h-1.443zm2.578 0 2.276-3.942.98-1.698L21.206 16h-6.555z" fill="#00DC82"/></svg>`,
  },
  { id: 'vue',         label: 'Vue',         slug: 'vuedotjs'    },
  { id: 'directus',    label: 'Directus',    slug: 'directus'    },
  { id: 'next',        label: 'Next.js',     slug: 'nextdotjs'   },
  { id: 'react',       label: 'React',       slug: 'react'       },
  { id: 'docker',      label: 'Docker',      slug: 'docker'      },
]
