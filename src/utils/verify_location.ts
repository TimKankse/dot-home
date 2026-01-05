
const LOCALE_TO_COUNTRY: Record<string, string> = {
  'en-US': 'United States',
};

const TIMEZONE_TO_COUNTRY: Record<string, string> = {
  "Europe/Stockholm": "Sweden",
};

// Simulation
const timeZone = "Europe/Stockholm";
const locale = "en-US";

// New Logic
const country = TIMEZONE_TO_COUNTRY[timeZone] || LOCALE_TO_COUNTRY[locale] || '';
const locationName = country;

console.log("Timezone:", timeZone);
console.log("Locale:", locale);
console.log("Detected Country (New Logic):", locationName);

// Test fallback
console.log("---");
const timeZoneUnknown = "Mars/Crater";
const countryFallback = TIMEZONE_TO_COUNTRY[timeZoneUnknown] || LOCALE_TO_COUNTRY[locale] || '';
console.log("Unknown Timezone:", timeZoneUnknown);
console.log("Fallback Country:", countryFallback);
