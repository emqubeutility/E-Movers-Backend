/** Regular expressions shared by every schema, each with the message shown when a value breaks it. */
export const PATTERNS = Object.freeze({
  phone: '^\\+[1-9][0-9]{7,14}$',
  personName: '^[^0-9<>]*[^0-9<>\\s][^0-9<>]*$',
  code: '^[A-Z][A-Z0-9_]*$',
  dottedCode: '^[A-Z][A-Z0-9_.]*$',
  iso2: '^[A-Z]{2}$',
  iso3: '^[A-Z]{3}$',
  dialCode: '^\\+[0-9]{1,5}$',
  postalCode: '^[A-Za-z0-9][A-Za-z0-9 -]{1,19}$',
  hexColor: '^#[0-9A-Fa-f]{6}$',
  iban: '^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$',
  swift: '^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$',
  taxNumber: '^[A-Za-z0-9-]{5,30}$',
  ianaZone: '^[A-Za-z_]+(/[A-Za-z0-9_+-]+)+$',
  url: '^https?://[^\\s]+$',
  path: '^/[^\\s]*$',
  sha256: '^[a-f0-9]{64}$',
  languageTag: '^[a-z]{2}(-[A-Z]{2})?$',
});

export const PATTERN_MESSAGES = Object.freeze({
  [PATTERNS.phone]: 'must be a phone number in international format, e.g. +971501234567',
  [PATTERNS.personName]: 'must not contain numbers',
  [PATTERNS.code]:
    'must be capital letters, numbers and underscores, starting with a letter, e.g. HEAD_OFFICE',
  [PATTERNS.dottedCode]:
    'must be capital letters, numbers, dots and underscores, e.g. SETUP.EMPLOYEE',
  [PATTERNS.iso2]: 'must be a 2-letter capital code, e.g. AE',
  [PATTERNS.iso3]: 'must be a 3-letter capital code, e.g. ARE',
  [PATTERNS.dialCode]: 'must be a dialling code, e.g. +971',
  [PATTERNS.postalCode]: 'must be 2-20 letters, numbers, spaces or hyphens',
  [PATTERNS.hexColor]: 'must be a hex colour, e.g. #6E39CB',
  [PATTERNS.iban]: 'must be a valid IBAN without spaces',
  [PATTERNS.swift]: 'must be an 8 or 11 character SWIFT/BIC code',
  [PATTERNS.taxNumber]: 'must be 5-30 letters, numbers or hyphens',
  [PATTERNS.ianaZone]: 'must be a time zone name, e.g. Asia/Dubai',
  [PATTERNS.url]: 'must be a web address starting with http:// or https://',
  [PATTERNS.path]: 'must be a path starting with /',
  [PATTERNS.sha256]: 'must be a 64-character lowercase hex checksum',
  [PATTERNS.languageTag]: 'must be a language code, e.g. en or en-GB',
});
