import { describe, expect, it } from "vitest";
import { auditBundle } from "@/lib/audit/engine";
import { confirmedComponent, upsertEdge } from "@/lib/audit/duplicates";
import { demoAuditInput, demoIds, DEMO_CREATOR_ID } from "@/lib/demo/catalog";
import type { AuditRequest } from "@/lib/audit/types";

function item(request: AuditRequest, uploadId: string) {
  const report = auditBundle(request);
  const found = report.items.find((entry) => entry.uploadId === uploadId);
  if (!found) throw new Error(`Missing ${uploadId}`);
  return found;
}

describe("demo purchase story", () => {
  it("flags B2 as a suggestion and C as purchased before confirmation", () => {
    const request = demoAuditInput();
    expect(item(request, demoIds.uploads.b2).status).toBe("possible_duplicate_requiring_review");
    expect(item(request, demoIds.uploads.c).status).toBe("confirmed_purchase_overlap");
    expect(item(request, demoIds.uploads.d).status).toBe("no_known_purchase_overlap");
    expect(item(request, demoIds.uploads.b2).purchaseEvidence).toHaveLength(0);
    expect(item(request, demoIds.uploads.c).purchaseEvidence[0]?.paidMedia.map((media) => media.label)).toEqual([
      "Stoneware vase",
      "Linen notebook",
      "Brass lamp",
    ]);
    expect(item(request, demoIds.uploads.c).purchaseEvidence[0]?.preview?.label).toBe("Cotton swatch");
  });

  it("flags B2 and C after the notebook reupload is confirmed, and leaves D unmatched", () => {
    const request = demoAuditInput();
    request.edges = upsertEdge(request.edges, {
      creatorId: DEMO_CREATOR_ID,
      uploadIdA: demoIds.uploads.b,
      uploadIdB: demoIds.uploads.b2,
      status: "confirmed",
    });
    const notebook = item(request, demoIds.uploads.b2);
    const lamp = item(request, demoIds.uploads.c);
    const bowl = item(request, demoIds.uploads.d);
    expect(notebook.status).toBe("confirmed_purchase_overlap");
    expect(notebook.purchaseEvidence[0]?.matchedBecause).toBe("confirmed_duplicate");
    expect(notebook.purchaseEvidence[0]?.messageId).toBe(demoIds.messages.purchase);
    expect(lamp.status).toBe("confirmed_purchase_overlap");
    expect(bowl.status).toBe("no_known_purchase_overlap");
    expect(bowl.summary).toContain("recorded purchases");
    expect(bowl.summary.toLowerCase()).not.toContain("never seen");
  });

  it("does not merge a chain of suggestions into a confirmed identity", () => {
    const before = demoAuditInput();
    expect(item({ ...before, bundleUploadIds: [demoIds.uploads.g] }, demoIds.uploads.g).status).toBe(
      "no_known_purchase_overlap",
    );
    const confirmed = upsertEdge(before.edges, {
      creatorId: DEMO_CREATOR_ID,
      uploadIdA: demoIds.uploads.b,
      uploadIdB: demoIds.uploads.b2,
      status: "confirmed",
    });
    const fernEdge = confirmed.find((edge) => edge.id === "edge-b2-g");
    expect(fernEdge?.status).toBe("suggested");
    const component = confirmedComponent(demoIds.uploads.g, confirmed);
    expect(component.has(demoIds.uploads.b)).toBe(false);
    expect(component.has(demoIds.uploads.b2)).toBe(false);
    const after = auditBundle({
      ...before,
      edges: confirmed,
      bundleUploadIds: [demoIds.uploads.g],
    });
    const fern = after.items.find((entry) => entry.uploadId === demoIds.uploads.g);
    expect(fern?.status).toBe("possible_duplicate_requiring_review");
  });

  it("reverses a confirmation without dissolving an unrelated confirmed pair", () => {
    let edges = upsertEdge(demoAuditInput().edges, {
      creatorId: DEMO_CREATOR_ID,
      uploadIdA: demoIds.uploads.b,
      uploadIdB: demoIds.uploads.b2,
      status: "confirmed",
    });
    edges = upsertEdge(edges, {
      creatorId: DEMO_CREATOR_ID,
      uploadIdA: demoIds.uploads.a,
      uploadIdB: demoIds.uploads.d,
      status: "confirmed",
      id: "edge-a-d",
    });
    edges = upsertEdge(edges, {
      creatorId: DEMO_CREATOR_ID,
      uploadIdA: demoIds.uploads.b,
      uploadIdB: demoIds.uploads.b2,
      status: "reversed",
    });
    const request = { ...demoAuditInput(), edges };
    expect(item(request, demoIds.uploads.b2).status).toBe("no_known_purchase_overlap");
    expect(confirmedComponent(demoIds.uploads.a, edges).has(demoIds.uploads.d)).toBe(true);
  });
});

describe("previews, sends, refunds, and unsupported media", () => {
  it("does not treat the free preview as a purchased attachment", () => {
    const request = {
      ...demoAuditInput(),
      bundleUploadIds: [demoIds.uploads.preview],
    };
    const preview = item(request, demoIds.uploads.preview);
    expect(preview.status).toBe("no_known_purchase_overlap");
    expect(preview.purchaseEvidence).toHaveLength(0);
  });

  it("does not treat a priced send as a purchase", () => {
    const request = { ...demoAuditInput(), bundleUploadIds: [demoIds.uploads.e] };
    const sent = item(request, demoIds.uploads.e);
    expect(sent.status).toBe("no_known_purchase_overlap");
    expect(sent.unpurchasedSends).toHaveLength(1);
    expect(sent.purchaseEvidence).toHaveLength(0);
  });

  it("keeps a refunded broadcast purchase as purchase evidence", () => {
    const request = { ...demoAuditInput(), bundleUploadIds: [demoIds.uploads.f] };
    const postcard = item(request, demoIds.uploads.f);
    expect(postcard.status).toBe("confirmed_purchase_overlap");
    expect(postcard.purchaseEvidence[0]?.messageType).toBe("BROADCAST");
    expect(postcard.purchaseEvidence[0]?.reversals[0]?.kind).toBe("refund");
  });

  it("marks video as unsupported", () => {
    const request = { ...demoAuditInput(), bundleUploadIds: [demoIds.uploads.video] };
    expect(item(request, demoIds.uploads.video).status).toBe("incomplete_or_unsupported_history");
  });
});

describe("coverage and creator isolation", () => {
  it("does not call missing broadcast history a clean negative", () => {
    const request = demoAuditInput();
    request.coverage = { ...request.coverage, broadcastsIncluded: false };
    request.purchases = request.purchases.filter((purchase) => purchase.messageType !== "BROADCAST");
    request.bundleUploadIds = [demoIds.uploads.f];
    expect(item(request, demoIds.uploads.f).status).toBe("incomplete_or_unsupported_history");
  });

  it("keeps positive broadcast evidence even if the coverage flag was wrong", () => {
    const request = demoAuditInput();
    request.coverage = { ...request.coverage, broadcastsIncluded: false };
    request.bundleUploadIds = [demoIds.uploads.f];
    expect(item(request, demoIds.uploads.f).status).toBe("confirmed_purchase_overlap");
  });

  it("ignores another creator's purchase of the same upload ids", () => {
    const base = demoAuditInput();
    const request: AuditRequest = {
      ...base,
      creatorId: "creator-a",
      uploads: base.uploads.map((upload) => ({ ...upload, creatorId: "creator-a" })),
      edges: base.edges.map((edge) => ({ ...edge, creatorId: "creator-a" })),
      fans: base.fans.map((fan) => ({ ...fan, creatorId: "creator-a" })),
      sentOffers: [],
      reversals: [],
      purchases: base.purchases.map((purchase) => ({ ...purchase, creatorId: "creator-b" })),
      coverage: { ...base.coverage, creatorId: "creator-a" },
      bundleUploadIds: [demoIds.uploads.c],
    };
    expect(item(request, demoIds.uploads.c).status).toBe("no_known_purchase_overlap");
  });

  it("requires an audience before it will report no known purchase", () => {
    const request = { ...demoAuditInput(), audienceFanIds: [] };
    expect(item(request, demoIds.uploads.d).status).toBe("incomplete_or_unsupported_history");
  });
});
