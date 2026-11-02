export function ownerContact() {
  const supportEmail = process.env.SUPPORT_EMAIL?.trim() || "support@example.com";
  const securityEmail = process.env.SECURITY_EMAIL?.trim() || "security@example.com";
  const ownerName = process.env.APP_OWNER_NAME?.trim() || "[App owner legal name]";
  return {
    supportEmail,
    securityEmail,
    ownerName,
    supportIsPlaceholder: supportEmail === "support@example.com",
    securityIsPlaceholder: securityEmail === "security@example.com",
    ownerIsPlaceholder: ownerName.startsWith("["),
  };
}
