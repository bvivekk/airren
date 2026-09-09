export function toE164(raw: string, defaultCountry = "+91"): string {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) {
    return "";
  }
  if (trimmed.startsWith("+")) {
    return `+${digits}`;
  }
  if (digits.length === 10) {
    return `${defaultCountry}${digits}`;
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+${digits}`;
  }
  return `+${digits}`;
}

export function guestCheckoutContact(phoneNumber: string | undefined | null): string | undefined {
  if (!phoneNumber) {
    return undefined;
  }
  const contact = toE164(phoneNumber);
  return contact.length >= 8 ? contact : undefined;
}
