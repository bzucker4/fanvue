import { upsertEdge } from "../audit/duplicates";
import type {
  AuditCoverage,
  AuditEdge,
  AuditFan,
  AuditPurchase,
  AuditReversal,
  AuditUpload,
  UnpurchasedSend,
} from "../audit/types";

export const DEMO_CREATOR_ID = "demo-creator";

export const demoIds = {
  uploads: {
    a: "upload-a",
    b: "upload-b",
    b2: "upload-b2",
    c: "upload-c",
    d: "upload-d",
    preview: "upload-preview",
    e: "upload-e",
    f: "upload-f",
    g: "upload-g",
    video: "upload-video",
  },
  media: {
    a: "11111111-1111-4111-8111-111111111111",
    b: "22222222-2222-4222-8222-222222222222",
    b2: "23232323-2323-4232-8232-232323232323",
    c: "33333333-3333-4333-8333-333333333333",
    d: "44444444-4444-4444-8444-444444444444",
    preview: "55555555-5555-4555-8555-555555555555",
    e: "66666666-6666-4666-8666-666666666666",
    f: "77777777-7777-4777-8777-777777777777",
    g: "88888888-8888-4888-8888-888888888888",
    video: "99999999-9999-4999-8999-999999999999",
  },
  fans: {
    jordan: "fan-jordan",
    riley: "fan-riley",
  },
  messages: {
    purchase: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    sent: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    broadcast: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
  },
} as const;

export interface DemoPhoto {
  upload: AuditUpload;
  sampleAsset: string;
  caption: string;
  roleNote: string;
}

const creatorId = DEMO_CREATOR_ID;

function upload(
  id: string,
  mediaId: string,
  label: string,
  kind: AuditUpload["kind"],
): AuditUpload {
  return { id, creatorId, mediaId, label, kind };
}

export function demoPhotos(): DemoPhoto[] {
  const { uploads, media } = demoIds;
  return [
    {
      upload: upload(uploads.a, media.a, "Stoneware vase", "image"),
      sampleAsset: "/demo/vase.svg",
      caption: "Still life A",
      roleNote: "Paid attachment in Jordan Hale's purchased set.",
    },
    {
      upload: upload(uploads.b, media.b, "Linen notebook", "image"),
      sampleAsset: "/demo/notebook.svg",
      caption: "Still life B",
      roleNote: "Paid attachment Jordan Hale purchased. Original upload.",
    },
    {
      upload: upload(uploads.b2, media.b2, "Linen notebook, second upload", "image"),
      sampleAsset: "/demo/notebook-reupload.svg",
      caption: "Still life B2",
      roleNote: "A later upload of the notebook. Suggested duplicate of B until you confirm it.",
    },
    {
      upload: upload(uploads.c, media.c, "Brass lamp", "image"),
      sampleAsset: "/demo/lamp.svg",
      caption: "Still life C",
      roleNote: "Paid attachment in Jordan Hale's purchased set.",
    },
    {
      upload: upload(uploads.d, media.d, "Oak bowl", "image"),
      sampleAsset: "/demo/bowl.svg",
      caption: "Still life D",
      roleNote: "No purchased PPV attachment in the sample history.",
    },
    {
      upload: upload(uploads.preview, media.preview, "Cotton swatch", "image"),
      sampleAsset: "/demo/swatch.svg",
      caption: "Free preview",
      roleNote: "Shown free on the purchased message. Not a paid attachment.",
    },
    {
      upload: upload(uploads.e, media.e, "Olive sprig", "image"),
      sampleAsset: "/demo/olive.svg",
      caption: "Sent, not purchased",
      roleNote: "Attached to a priced message with no purchase timestamp.",
    },
    {
      upload: upload(uploads.f, media.f, "City postcard", "image"),
      sampleAsset: "/demo/postcard.svg",
      caption: "Broadcast purchase",
      roleNote: "Purchased from a broadcast message. A refund is recorded separately.",
    },
    {
      upload: upload(uploads.g, media.g, "Pressed fern", "image"),
      sampleAsset: "/demo/fern.svg",
      caption: "Suggestion chain",
      roleNote: "Suggested similar to B2 only. Not automatically treated as B.",
    },
    {
      upload: upload(uploads.video, media.video, "Studio clip", "video"),
      sampleAsset: "/demo/clip.svg",
      caption: "Video",
      roleNote: "Outside photo-bundle auditing.",
    },
  ];
}

export function demoFans(): AuditFan[] {
  return [
    {
      id: demoIds.fans.jordan,
      creatorId,
      displayName: "Jordan Hale",
      handle: "jordan.hale",
    },
    {
      id: demoIds.fans.riley,
      creatorId,
      displayName: "Riley Cho",
      handle: "riley.cho",
    },
  ];
}

export function demoPurchases(): AuditPurchase[] {
  const { uploads, fans, messages } = demoIds;
  return [
    {
      id: "purchase-set",
      creatorId,
      fanId: fans.jordan,
      messageId: messages.purchase,
      messageType: "SINGLE_RECIPIENT",
      purchasedAt: "2026-10-12T18:24:00.000Z",
      priceCents: 1200,
      currency: "USD",
      invoiceId: "FV-DEMO-1001",
      paidUploadIds: [uploads.a, uploads.b, uploads.c],
      previewUploadId: uploads.preview,
      textExcerpt: "Three still lifes from the studio table.",
    },
    {
      id: "purchase-broadcast",
      creatorId,
      fanId: fans.jordan,
      messageId: messages.broadcast,
      messageType: "BROADCAST",
      purchasedAt: "2026-10-20T14:05:00.000Z",
      priceCents: 800,
      currency: "USD",
      invoiceId: "FV-DEMO-1002",
      paidUploadIds: [uploads.f],
      previewUploadId: null,
      textExcerpt: "A postcard from the city walk.",
    },
  ];
}

export function demoReversals(): AuditReversal[] {
  return [
    {
      id: "reversal-broadcast",
      creatorId,
      purchaseId: "purchase-broadcast",
      invoiceId: "FV-DEMO-1002",
      kind: "refund",
      amountCents: 800,
    },
  ];
}

export function demoSentOffers(): UnpurchasedSend[] {
  return [
    {
      id: "sent-olive",
      creatorId,
      fanId: demoIds.fans.jordan,
      messageId: demoIds.messages.sent,
      messageType: "SINGLE_RECIPIENT",
      sentAt: "2026-10-18T16:40:00.000Z",
      priceCents: 600,
      paidUploadIds: [demoIds.uploads.e],
      previewUploadId: null,
    },
  ];
}

export function demoEdges(): AuditEdge[] {
  return upsertEdge(
    upsertEdge([], {
      creatorId,
      uploadIdA: demoIds.uploads.b,
      uploadIdB: demoIds.uploads.b2,
      status: "suggested",
      id: "edge-b-b2",
    }),
    {
      creatorId,
      uploadIdA: demoIds.uploads.b2,
      uploadIdB: demoIds.uploads.g,
      status: "suggested",
      id: "edge-b2-g",
    },
  );
}

export function demoCoverage(): AuditCoverage {
  return {
    creatorId,
    historyComplete: true,
    broadcastsIncluded: true,
    lastSynchronizedAt: "2026-10-28T15:04:00.000Z",
    gaps: [],
    unsupported: [
      "Video, audio, post purchases, tips, and subscriptions are outside this photo audit.",
      "Sample history is scripted demo data, not a Fanvue account.",
    ],
  };
}

export function demoBundleSelection() {
  return {
    name: "Spring still life",
    uploadIds: [demoIds.uploads.b2, demoIds.uploads.c, demoIds.uploads.d],
    audienceFanIds: [demoIds.fans.jordan],
  };
}

export function demoAuditInput() {
  return {
    creatorId,
    bundleUploadIds: demoBundleSelection().uploadIds,
    audienceFanIds: demoBundleSelection().audienceFanIds,
    uploads: demoPhotos().map((photo) => photo.upload),
    edges: demoEdges(),
    purchases: demoPurchases(),
    reversals: demoReversals(),
    sentOffers: demoSentOffers(),
    fans: demoFans(),
    coverage: demoCoverage(),
  };
}
