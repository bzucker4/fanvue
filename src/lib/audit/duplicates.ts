import type { AuditEdge, DuplicateStatus } from "./types";

export function canonicalPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export function edgeTouches(edge: AuditEdge, uploadId: string): boolean {
  return edge.leftUploadId === uploadId || edge.rightUploadId === uploadId;
}

export function otherSide(edge: AuditEdge, uploadId: string): string {
  return edge.leftUploadId === uploadId ? edge.rightUploadId : edge.leftUploadId;
}

/**
 * Confirmed content identity is the connected component of confirmed edges only.
 * Suggested, rejected, and reversed edges are not members of that component.
 */
export function confirmedComponent(startId: string, edges: AuditEdge[]): Set<string> {
  const component = new Set<string>([startId]);
  const queue = [startId];
  const confirmed = edges.filter((edge) => edge.status === "confirmed");
  while (queue.length > 0) {
    const current = queue.pop()!;
    for (const edge of confirmed) {
      if (!edgeTouches(edge, current)) continue;
      const next = otherSide(edge, current);
      if (component.has(next)) continue;
      component.add(next);
      queue.push(next);
    }
  }
  return component;
}

/** Direct suggestions only. A chain of similar photos is not collapsed. */
export function directSuggestions(uploadId: string, edges: AuditEdge[]): AuditEdge[] {
  return edges.filter((edge) => edge.status === "suggested" && edgeTouches(edge, uploadId));
}

export function upsertEdge(
  edges: AuditEdge[],
  input: { creatorId: string; uploadIdA: string; uploadIdB: string; status: DuplicateStatus; id?: string },
): AuditEdge[] {
  if (input.uploadIdA === input.uploadIdB) {
    throw new Error("An upload cannot be linked to itself.");
  }
  const [left, right] = canonicalPair(input.uploadIdA, input.uploadIdB);
  const next: AuditEdge = {
    id: input.id ?? `edge-${left}-${right}`,
    creatorId: input.creatorId,
    leftUploadId: left,
    rightUploadId: right,
    status: input.status,
  };
  const index = edges.findIndex(
    (edge) =>
      edge.creatorId === input.creatorId &&
      edge.leftUploadId === left &&
      edge.rightUploadId === right,
  );
  if (index === -1) return [...edges, next];
  const copy = edges.slice();
  copy[index] = { ...copy[index], status: input.status };
  return copy;
}
