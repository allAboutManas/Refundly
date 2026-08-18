/**
 * Auto-detect the e-commerce platform from an order ID / order number.
 *
 * Each marketplace formats its order IDs distinctively, so we can usually infer
 * the platform without asking. This is a best-effort helper for pre-filling the
 * platform field — it returns `null` when the format is ambiguous, and the user
 * can always override the choice.
 *
 * Reference formats (from real sample IDs):
 *   Amazon    403-2345345-5105954     3-7-7 digits, hyphen-separated
 *   Flipkart  OD333563261719682100    "OD" + a long run of digits
 *   Myntra    132089115422902139801   ~21 plain digits
 *   Meesho    127760831760899584      ~18 plain digits
 */

/** Platform slugs this detector can recognise (must match `platforms.slug`). */
export type DetectablePlatformSlug = 'amazon' | 'flipkart' | 'myntra' | 'meesho'

export function detectPlatformSlug(input: string): DetectablePlatformSlug | null {
  const raw = input.trim()
  if (!raw) return null

  // Amazon India: three groups of digits (3-7-7) joined by hyphens.
  if (/^\d{3}-\d{7}-\d{7}$/.test(raw)) return 'amazon'

  // Flipkart: "OD" prefix (case-insensitive) followed by a long digit run.
  if (/^OD\d{8,}$/i.test(raw)) return 'flipkart'

  // The remaining marketplaces use plain numeric IDs. Tolerate stray spaces or
  // hyphens that sneak in on copy/paste, then distinguish by length.
  const digits = raw.replace(/[\s-]/g, '')
  if (!/^\d+$/.test(digits)) return null

  if (digits.length >= 20) return 'myntra' // ~21 digits
  if (digits.length >= 15) return 'meesho' // ~18 digits

  return null
}
