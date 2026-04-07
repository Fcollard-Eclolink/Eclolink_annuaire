// ── Référentiel des technologies ──────────────────────────────────
// Pour ajouter une techno : ajouter un objet { id, label, slug }
// Le slug correspond à l'identifiant Simple Icons (cdn.simpleicons.org)
const TECHS = [
  { id: 'wordpress',   label: 'WordPress',   slug: 'wordpress'   },
  { id: 'divi',        label: 'Divi',        slug: 'divi'        },
  { id: 'elementor',   label: 'Elementor',   slug: 'elementor'   },
  { id: 'wpbakery',    label: 'WP Bakery',   slug: 'wpbakery'    },
  { id: 'prestashop',  label: 'PrestaShop',  slug: 'prestashop'  },
  { id: 'woocommerce', label: 'WooCommerce', slug: 'woocommerce' },
  { id: 'drupal',      label: 'Drupal',      slug: 'drupal'      },
  { id: 'symfony',     label: 'Symfony',     slug: 'symfony'     },
  { id: 'laravel',     label: 'Laravel',     slug: 'laravel'     },
  { id: 'nuxt',        label: 'Nuxt',        slug: 'nuxtdotjs'   },
  { id: 'vue',         label: 'Vue',         slug: 'vuedotjs'    },
  { id: 'directus',    label: 'Directus',    slug: 'directus'    },
];

const SI     = 'https://cdn.simpleicons.org';
const SVG_EXT = `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`;
const SVG_GL  = `<img src="${SI}/gitlab/FC6D26" width="12" height="12" alt="GitLab" style="display:block">`;

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
      return t ? `<span class="tech-badge"><img src="${SI}/${t.slug}" width="12" height="12" alt="" onerror="this.style.display='none'">${esc(t.label)}</span>` : '';
    }).join('');
  }
}

function getSelectedTechs() {
  return Array.from(document.querySelectorAll('#tech-dropdown input:checked')).map(cb => cb.value);
}
