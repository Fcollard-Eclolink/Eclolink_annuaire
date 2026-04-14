// ── Référentiel des technologies ──────────────────────────────────
// slug  → icône depuis cdn.simpleicons.org
// svg   → SVG inline (pour les logos non disponibles sur Simple Icons)

const TECHS = [
  { id: 'wordpress',   label: 'WordPress',   slug: 'wordpress'   },
  {
    id: 'divi', label: 'Divi',
    svg: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" fill="#7B5EA7"/><path d="M8 7h4.5C15.5 7 17.5 9.2 17.5 12s-2 5-4.5 5H8V7zm2 2v6h2.5c1.5 0 2.5-1.3 2.5-3s-1-3-2.5-3H10z" fill="white"/></svg>`
  },
  { id: 'elementor',   label: 'Elementor',   slug: 'elementor'   },
  {
    id: 'wpbakery', label: 'WP Bakery',
    svg: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="3" fill="#0073AA"/><path d="M3.5 8l2.2 7.5 1.8-5 1.8 5L11.5 8H9.8L8.5 12.5 7 8H5.8l-1.5 4.5L3 8h.5zm10 0v7.5h2.8c1.6 0 2.7-1 2.7-2.3 0-.9-.5-1.6-1.2-2 .4-.4.7-1 .7-1.6 0-1.1-1-1.6-2.3-1.6H13.5zm1.4 1.3h1.3c.7 0 1 .4 1 .9s-.3 1-1 1h-1.3V9.3zm0 3.1h1.3c.9 0 1.4.4 1.4 1.2s-.5 1.2-1.4 1.2h-1.3V12.4z" fill="white"/></svg>`
  },
  { id: 'prestashop',  label: 'PrestaShop',  slug: 'prestashop'  },
  { id: 'woocommerce', label: 'WooCommerce', slug: 'woocommerce' },
  { id: 'drupal',      label: 'Drupal',      slug: 'drupal'      },
  { id: 'symfony',     label: 'Symfony',     slug: 'symfony'     },
  { id: 'laravel',     label: 'Laravel',     slug: 'laravel'     },
  {
    id: 'nuxt', label: 'Nuxt',
    svg: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M13.468 3.809L8.35 12.68 6.423 9.505 2 17.5h5.957c.07 1.128.993 2 2.116 2 1.12 0 2.044-.872 2.116-2H22L13.468 3.809zM7.957 16H5.08l3.662-6.34.98 1.699L7.957 16zm4.116 0H9.43l2.043-3.539L13.516 16h-1.443zm2.578 0 2.276-3.942.98-1.698L21.206 16h-6.555z" fill="#00DC82"/></svg>`
  },
  { id: 'vue',         label: 'Vue',         slug: 'vuedotjs'    },
  { id: 'directus',    label: 'Directus',    slug: 'directus'    },
  { id: 'next',        label: 'Next.js',     slug: 'nextdotjs'   },
  { id: 'react',       label: 'React',       slug: 'react'       },
  { id: 'docker',      label: 'Docker',      slug: 'docker'      },
];

const SI      = 'https://cdn.simpleicons.org';
const SVG_EXT = `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`;
const SVG_GL  = `<img src="${SI}/gitlab/FC6D26" width="12" height="12" alt="GitLab" style="display:block">`;
// Copier dans le presse-papier
const SVG_COPY = `<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
// Planète — lien site principal
const SVG_SITE = `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><line x1="3" y1="12" x2="21" y2="12"/></svg>`;
// Clé à molette — lien back-office
const SVG_BO   = `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`;

// ── Helper : rendu de l'icône d'une techno ────────────────────────
function techIconHTML(t, size) {
  if (!t) return '';
  if (t.svg) {
    // SVG inline — on injecte width/height via style pour ne pas casser le viewBox
    return t.svg.replace('<svg ', `<svg width="${size}" height="${size}" style="display:inline-block;vertical-align:middle;flex-shrink:0" `);
  }
  return `<img src="${SI}/${t.slug}" width="${size}" height="${size}" alt="" onerror="this.style.display='none'" style="display:inline-block;vertical-align:middle;flex-shrink:0">`;
}

// ── Tech dropdown (modal) ─────────────────────────────────────────
function toggleTechDropdown() {
  document.getElementById('tech-dropdown')?.classList.toggle('open');
}

function updateTechBox() {
  const checked = Array.from(document.querySelectorAll('#tech-dropdown input:checked'));
  const box     = document.getElementById('tech-box');
  if (!box) return;
  if (!checked.length) {
    box.innerHTML = '<span class="tech-placeholder">Sélectionner...</span>';
  } else {
    box.innerHTML = checked.map(cb => {
      const t = TECHS.find(x => x.id === cb.value);
      return t ? `<span class="tech-badge">${techIconHTML(t, 12)}${esc(t.label)}</span>` : '';
    }).join('');
  }
}

function getSelectedTechs() {
  return Array.from(document.querySelectorAll('#tech-dropdown input:checked')).map(cb => cb.value);
}
