/** A payment needs purchased evidence for its buyer, never just an unpaid offer. */
export function hydrationCanResolve(
  kind: string,
  expectedFanId: string | null,
  purchaseFanId: string | null,
  sentFanId: string | null,
): boolean {
  if (kind === "message_purchase") {
    return expectedFanId !== null && purchaseFanId === expectedFanId;
  }
  if (kind !== "message_signal") return false;
  if (expectedFanId === null) return false;
  return purchaseFanId === expectedFanId || sentFanId === expectedFanId;
}
