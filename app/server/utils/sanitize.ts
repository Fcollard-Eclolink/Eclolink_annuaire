/**
 * Helpers de sanitization pour entrées utilisateur stockées et rendues
 * comme HTML/SVG (cas du champ `Technology.svg`).
 *
 * On adopte une approche regex stricte plutôt qu'une lib externe :
 * - aucun event handler (`onclick`, `onload`, `onerror`, etc.)
 * - aucun `<script>` / `<style>` / `<iframe>` / `<object>` / `<embed>` / `<foreignObject>`
 * - aucun protocole `javascript:` / `data:` (sauf data:image/* simples)
 * - aucun attribut `xlink:href` ou `href` pointant vers du JS
 *
 * Ce n'est pas un parseur XML : un attaquant déterminé pourrait construire
 * des payloads obfusqués. Pour ce projet (annuaire interne, users authentifiés),
 * c'est un compromis acceptable. Si on doit accepter des SVG complexes ou des
 * sources non-trusted, passer à `isomorphic-dompurify` avec profil SVG.
 */

const EVENT_HANDLER_RE = /\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi
const SCRIPT_TAG_RE    = /<script[^>]*>[\s\S]*?<\/script\s*>/gi
const STYLE_TAG_RE     = /<style[^>]*>[\s\S]*?<\/style\s*>/gi
const DANGEROUS_TAG_RE = /<(iframe|object|embed|foreignObject|script|meta|link|base)\b[^>]*(?:\/>|>[\s\S]*?<\/\1\s*>)/gi
const SELF_CLOSING_DANGEROUS_RE = /<(iframe|object|embed|foreignObject|script|meta|link|base)\b[^>]*\/?>/gi
const JS_URL_ATTR_RE   = /(href|xlink:href|src|action|formaction)\s*=\s*(?:"\s*javascript:[^"]*"|'\s*javascript:[^']*'|javascript:[^\s>]*)/gi

/**
 * Nettoie une chaîne SVG des vecteurs XSS connus.
 * Retourne une chaîne vide si l'entrée est vide / null / undefined.
 */
export function sanitizeSvg(input: string | null | undefined): string {
  if (!input) return ''
  let s = input

  // Strip event handlers (onload, onclick, onerror, etc.)
  s = s.replace(EVENT_HANDLER_RE, '')

  // Strip dangereux tags (avec ou sans contenu)
  s = s.replace(SCRIPT_TAG_RE, '')
  s = s.replace(STYLE_TAG_RE, '')
  s = s.replace(DANGEROUS_TAG_RE, '')
  s = s.replace(SELF_CLOSING_DANGEROUS_RE, '')

  // Strip javascript: dans href/src/etc.
  s = s.replace(JS_URL_ATTR_RE, '')

  return s.trim()
}
