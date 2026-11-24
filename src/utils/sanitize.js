const HTML_TAGS = /<[^>]*>/g;
const UNSANITIZED_KEYS = new Set(['password', 'currentPassword']);

function isControlChar(char) {
  const code = char.charCodeAt(0);
  const isAllowedWhitespace = code === 9 || code === 10 || code === 13;
  return (code < 32 && !isAllowedWhitespace) || code === 127;
}

function sanitizeString(value) {
  const withoutControlChars = [...value].filter((char) => !isControlChar(char)).join('');
  return withoutControlChars.replace(HTML_TAGS, '').trim();
}

/** Trims strings and strips control characters and HTML tags; passwords are left untouched. */
export function sanitizeValue(value, key) {
  if (typeof value === 'string') return UNSANITIZED_KEYS.has(key) ? value : sanitizeString(value);
  if (Array.isArray(value)) return value.map((item) => sanitizeValue(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, sanitizeValue(v, k)]));
  }
  return value;
}
