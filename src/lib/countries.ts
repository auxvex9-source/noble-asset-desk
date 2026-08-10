export type Country = { name: string; code: string; currency: string; locale: string };

export const COUNTRIES: Country[] = [
  { name: "United States", code: "US", currency: "USD", locale: "en-US" },
  { name: "United Kingdom", code: "GB", currency: "GBP", locale: "en-GB" },
  { name: "Canada", code: "CA", currency: "CAD", locale: "en-CA" },
  { name: "Australia", code: "AU", currency: "AUD", locale: "en-AU" },
  { name: "Germany", code: "DE", currency: "EUR", locale: "de-DE" },
  { name: "France", code: "FR", currency: "EUR", locale: "fr-FR" },
  { name: "Spain", code: "ES", currency: "EUR", locale: "es-ES" },
  { name: "Italy", code: "IT", currency: "EUR", locale: "it-IT" },
  { name: "Netherlands", code: "NL", currency: "EUR", locale: "nl-NL" },
  { name: "Ireland", code: "IE", currency: "EUR", locale: "en-IE" },
  { name: "Switzerland", code: "CH", currency: "CHF", locale: "de-CH" },
  { name: "Sweden", code: "SE", currency: "SEK", locale: "sv-SE" },
  { name: "Norway", code: "NO", currency: "NOK", locale: "nb-NO" },
  { name: "Denmark", code: "DK", currency: "DKK", locale: "da-DK" },
  { name: "Poland", code: "PL", currency: "PLN", locale: "pl-PL" },
  { name: "Turkey", code: "TR", currency: "TRY", locale: "tr-TR" },
  { name: "Iran", code: "IR", currency: "IRR", locale: "fa-IR" },
  { name: "United Arab Emirates", code: "AE", currency: "AED", locale: "ar-AE" },
  { name: "Saudi Arabia", code: "SA", currency: "SAR", locale: "ar-SA" },
  { name: "Qatar", code: "QA", currency: "QAR", locale: "ar-QA" },
  { name: "Israel", code: "IL", currency: "ILS", locale: "he-IL" },
  { name: "India", code: "IN", currency: "INR", locale: "en-IN" },
  { name: "Pakistan", code: "PK", currency: "PKR", locale: "en-PK" },
  { name: "Bangladesh", code: "BD", currency: "BDT", locale: "bn-BD" },
  { name: "China", code: "CN", currency: "CNY", locale: "zh-CN" },
  { name: "Hong Kong", code: "HK", currency: "HKD", locale: "zh-HK" },
  { name: "Japan", code: "JP", currency: "JPY", locale: "ja-JP" },
  { name: "South Korea", code: "KR", currency: "KRW", locale: "ko-KR" },
  { name: "Singapore", code: "SG", currency: "SGD", locale: "en-SG" },
  { name: "Malaysia", code: "MY", currency: "MYR", locale: "ms-MY" },
  { name: "Indonesia", code: "ID", currency: "IDR", locale: "id-ID" },
  { name: "Philippines", code: "PH", currency: "PHP", locale: "en-PH" },
  { name: "Thailand", code: "TH", currency: "THB", locale: "th-TH" },
  { name: "Vietnam", code: "VN", currency: "VND", locale: "vi-VN" },
  { name: "New Zealand", code: "NZ", currency: "NZD", locale: "en-NZ" },
  { name: "South Africa", code: "ZA", currency: "ZAR", locale: "en-ZA" },
  { name: "Nigeria", code: "NG", currency: "NGN", locale: "en-NG" },
  { name: "Ghana", code: "GH", currency: "GHS", locale: "en-GH" },
  { name: "Kenya", code: "KE", currency: "KES", locale: "en-KE" },
  { name: "Egypt", code: "EG", currency: "EGP", locale: "ar-EG" },
  { name: "Morocco", code: "MA", currency: "MAD", locale: "ar-MA" },
  { name: "Brazil", code: "BR", currency: "BRL", locale: "pt-BR" },
  { name: "Mexico", code: "MX", currency: "MXN", locale: "es-MX" },
  { name: "Argentina", code: "AR", currency: "ARS", locale: "es-AR" },
  { name: "Chile", code: "CL", currency: "CLP", locale: "es-CL" },
  { name: "Colombia", code: "CO", currency: "COP", locale: "es-CO" },
  { name: "Russia", code: "RU", currency: "RUB", locale: "ru-RU" },
  { name: "Ukraine", code: "UA", currency: "UAH", locale: "uk-UA" },
];

export function countryByName(name?: string | null): Country | undefined {
  if (!name) return undefined;
  return COUNTRIES.find((c) => c.name.toLowerCase() === name.toLowerCase());
}

export function formatMoney(amount: number, currency = "USD", locale?: string) {
  try {
    return new Intl.NumberFormat(locale ?? undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}
