export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'INR' | 'AED' | 'AUD' | 'CAD' | 'CHF' | 'SGD';

export interface FxRateInfo {
  code: CurrencyCode;
  name: string;
  symbol: string;
  // Rate relative to USD (1 USD = rate units of currency)
  rateFromUsd: number;
}

export const fxRates: FxRateInfo[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$', rateFromUsd: 1 },
  { code: 'EUR', name: 'Euro', symbol: '€', rateFromUsd: 0.92 },
  { code: 'GBP', name: 'British Pound', symbol: '£', rateFromUsd: 0.78 },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', rateFromUsd: 151.2 },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', rateFromUsd: 83.4 },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', rateFromUsd: 3.67 },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', rateFromUsd: 1.53 },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', rateFromUsd: 1.36 },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr', rateFromUsd: 0.88 },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', rateFromUsd: 1.35 },
];

export const fxFixtureMeta = {
  source: 'bundled-local-mock',
  asOf: '2026-11-11',
  note: 'Deterministic mock exchange rates for offline/demo use only. Not real-time financial data.',
};
