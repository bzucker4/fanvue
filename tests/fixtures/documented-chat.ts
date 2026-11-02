/**
 * Shapes copied from Fanvue's chat-message guide.
 * https://api.fanvue.com/docs/tutorials/working-with-messages
 *
 * The priced example puts mediaPreviewUuid inside mediaUuids. The preview is free.
 * purchasedAt null means the priced message was sent and not purchased.
 * BROADCAST is a mass message that the per-chat history includes.
 */

export const FAN_UUID = "f47ac10b-58cc-4372-a567-0e02b2c3d479";

export const MEDIA = {
  preview: "0b4a3c1e-2f6d-4b8a-9c1d-5e7f8a9b0c1d",
  vase: "11111111-1111-4111-8111-111111111111",
  notebook: "22222222-2222-4222-8222-222222222222",
  lamp: "33333333-3333-4333-8333-333333333333",
  notebookAgain: "44444444-4444-4444-8444-444444444444",
  bowl: "55555555-5555-4555-8555-555555555555",
  olive: "66666666-6666-4666-8666-666666666666",
  postcard: "77777777-7777-4777-8777-777777777777",
  clip: "88888888-8888-4888-8888-888888888888",
} as const;

export const purchasedBundleMessage = {
  uuid: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  text: "Still life set",
  sentAt: "2026-03-04T18:21:09.000Z",
  hasMedia: true,
  mediaType: "image",
  mediaUuids: [MEDIA.preview, MEDIA.vase, MEDIA.notebook, MEDIA.lamp],
  mediaPreviewUuid: MEDIA.preview,
  type: "SINGLE_RECIPIENT",
  pricing: { USD: { price: 1500 } },
  purchasedAt: "2026-03-04T18:40:00.000Z",
};

export const sentUnpurchasedMessage = {
  uuid: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  text: "Olive sprig",
  sentAt: "2026-03-05T12:00:00.000Z",
  hasMedia: true,
  mediaType: "image",
  mediaUuids: [MEDIA.olive],
  mediaPreviewUuid: null,
  type: "SINGLE_RECIPIENT",
  pricing: { USD: { price: 600 } },
  purchasedAt: null,
};

export const purchasedBroadcastMessage = {
  uuid: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
  text: "Postcard",
  sentAt: "2026-03-06T09:00:00.000Z",
  hasMedia: true,
  mediaType: "image",
  mediaUuids: [MEDIA.postcard],
  mediaPreviewUuid: null,
  type: "BROADCAST",
  pricing: { USD: { price: 800 } },
  purchasedAt: "2026-03-06T09:05:00.000Z",
};

export const purchasedVideoMessage = {
  uuid: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  text: "Clip",
  sentAt: "2026-03-07T09:00:00.000Z",
  hasMedia: true,
  mediaType: "video",
  mediaUuids: [MEDIA.clip],
  mediaPreviewUuid: null,
  type: "SINGLE_RECIPIENT",
  pricing: { USD: { price: 900 } },
  purchasedAt: "2026-03-07T09:06:00.000Z",
};

export const documentedMessages = [
  purchasedBundleMessage,
  sentUnpurchasedMessage,
  purchasedBroadcastMessage,
  purchasedVideoMessage,
];

export const mediaCatalog = [
  { uuid: MEDIA.preview, status: "ready", mediaType: "image", name: "Cotton swatch" },
  { uuid: MEDIA.vase, status: "ready", mediaType: "image", name: "Stoneware vase" },
  { uuid: MEDIA.notebook, status: "ready", mediaType: "image", name: "Linen notebook" },
  { uuid: MEDIA.lamp, status: "ready", mediaType: "image", name: "Brass lamp" },
  { uuid: MEDIA.notebookAgain, status: "ready", mediaType: "image", name: "Linen notebook, second upload" },
  { uuid: MEDIA.bowl, status: "ready", mediaType: "image", name: "Oak bowl" },
  { uuid: MEDIA.olive, status: "ready", mediaType: "image", name: "Olive sprig" },
  { uuid: MEDIA.postcard, status: "ready", mediaType: "image", name: "Postcard" },
  { uuid: MEDIA.clip, status: "ready", mediaType: "video", name: "Short clip" },
];
