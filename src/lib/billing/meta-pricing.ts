/**
 * Approximate Meta WhatsApp per-message pricing (2025 model) in USD, by
 * market and template category. These are estimates for budgeting — Meta's
 * exact rates change and are billed per delivered message. Service
 * (customer-initiated) conversations are free.
 *
 * Source of magnitude: Meta's published per-message rate cards. Kept as a
 * static table so estimates work offline; tweak as Meta updates rates.
 */

export type TemplateCategory = 'Marketing' | 'Utility' | 'Authentication'

interface MarketRate {
  code: string
  label: string
  marketing: number
  utility: number
  authentication: number
}

// A representative spread of high-volume WhatsApp markets.
export const MARKET_RATES: MarketRate[] = [
  { code: 'IN', label: 'India',          marketing: 0.0107, utility: 0.0014, authentication: 0.0014 },
  { code: 'BR', label: 'Brazil',         marketing: 0.0625, utility: 0.0080, authentication: 0.0315 },
  { code: 'ID', label: 'Indonesia',      marketing: 0.0411, utility: 0.0200, authentication: 0.0300 },
  { code: 'MX', label: 'Mexico',         marketing: 0.0436, utility: 0.0080, authentication: 0.0238 },
  { code: 'US', label: 'United States',  marketing: 0.0250, utility: 0.0040, authentication: 0.0135 },
  { code: 'GB', label: 'United Kingdom', marketing: 0.0705, utility: 0.0220, authentication: 0.0358 },
  { code: 'DE', label: 'Germany',        marketing: 0.0768, utility: 0.0550, authentication: 0.0550 },
  { code: 'AE', label: 'UAE',            marketing: 0.0384, utility: 0.0157, authentication: 0.0157 },
  { code: 'ZA', label: 'South Africa',   marketing: 0.0379, utility: 0.0070, authentication: 0.0146 },
  { code: 'NG', label: 'Nigeria',        marketing: 0.0516, utility: 0.0042, authentication: 0.0379 },
  { code: 'OTHER', label: 'Other / mixed', marketing: 0.0500, utility: 0.0100, authentication: 0.0250 },
]

const CATEGORY_KEY: Record<TemplateCategory, keyof Pick<MarketRate, 'marketing' | 'utility' | 'authentication'>> = {
  Marketing: 'marketing',
  Utility: 'utility',
  Authentication: 'authentication',
}

export function ratePerMessage(marketCode: string, category: TemplateCategory): number {
  const market = MARKET_RATES.find((m) => m.code === marketCode) ?? MARKET_RATES.find((m) => m.code === 'OTHER')!
  return market[CATEGORY_KEY[category]]
}

export function estimateBroadcastCost(
  recipients: number,
  marketCode: string,
  category: TemplateCategory,
): { perMessage: number; total: number } {
  const perMessage = ratePerMessage(marketCode, category)
  return { perMessage, total: perMessage * recipients }
}

export function formatUsd(v: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: v < 1 ? 4 : 2,
    maximumFractionDigits: v < 1 ? 4 : 2,
  }).format(v)
}
