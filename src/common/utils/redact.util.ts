/**
 * Redacts email address for logging purposes
 * Example: "user@example.com" -> "u***@e***.com"
 */
export function redactEmail(email: string): string {
  if (!email || !email.includes('@')) {
    return '***';
  }

  const [localPart, domainPart] = email.split('@');

  // Split domain by '.' to handle multi-part TLDs like 'co.uk'
  const domainParts = domainPart.split('.');

  if (domainParts.length < 2) {
    return '***';
  }

  const redactedLocal =
    localPart.length > 1
      ? `${localPart[0]}${'*'.repeat(Math.min(localPart.length - 1, 3))}`
      : '*';

  // Redact only the first part of domain, keep TLD intact
  const domainName = domainParts[0];
  const tld = domainParts.slice(1).join('.');

  const redactedDomain =
    domainName.length > 1
      ? `${domainName[0]}${'*'.repeat(Math.min(domainName.length - 1, 3))}`
      : '*';

  return `${redactedLocal}@${redactedDomain}.${tld}`;
}

/**
 * Redacts sensitive data for logging
 */
export function redactSensitiveData(data: any): any {
  if (typeof data === 'string') {
    // Check if it looks like an email
    if (data.includes('@')) {
      return redactEmail(data);
    }
    return data;
  }

  if (typeof data === 'object' && data !== null) {
    const redacted: any = Array.isArray(data) ? [] : {};

    for (const key in data) {
      const lowerKey = key.toLowerCase();

      // Redact sensitive fields completely
      if (
        lowerKey.includes('password') ||
        lowerKey.includes('token') ||
        lowerKey.includes('otp') ||
        lowerKey.includes('secret')
      ) {
        redacted[key] = '***';
      }
      // Redact email addresses
      else if (lowerKey.includes('email')) {
        redacted[key] =
          typeof data[key] === 'string' ? redactEmail(data[key]) : data[key];
      }
      // Recursively redact nested objects
      else {
        redacted[key] = redactSensitiveData(data[key]);
      }
    }

    return redacted;
  }

  return data;
}
