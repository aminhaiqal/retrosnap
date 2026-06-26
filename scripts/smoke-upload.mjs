import crypto from "node:crypto";

const API_BASE_URL = (process.env.RETROSNAP_API_BASE_URL ?? "http://localhost:8080").replace(/\/$/, "");
const EVENT_ID = process.env.RETROSNAP_EVENT_ID ?? "demo-wedding-001";
const WIDTH = 96;
const HEIGHT = 64;
const IMAGE = Buffer.from(
  "/9j/2wBDAAUEBAQEAwUEBAQGBQUGCA0ICAcHCBALDAkNExAUExIQEhIUFx0ZFBYcFhISGiMaHB4fISEhFBkkJyQgJh0gISD/2wBDAQUGBggHCA8ICA8gFRIVICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICD/wAARCABAAGADASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAf/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCzAT9SAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH/2Q==",
  "base64",
);

async function jsonFetch(path, init = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`${init.method ?? "GET"} ${path} failed ${response.status}: ${text}`);
  }

  return text ? JSON.parse(text) : null;
}

function toUploadHeaders(headers) {
  const uploadHeaders = new Headers();

  for (const [key, value] of Object.entries(headers ?? {})) {
    const normalized = key.toLowerCase();
    if (normalized !== "host" && normalized !== "content-length") {
      uploadHeaders.set(key, value);
    }
  }

  if (!uploadHeaders.has("Content-Type")) {
    uploadHeaders.set("Content-Type", "image/jpeg");
  }

  return uploadHeaders;
}

const localPhotoId = `smoke-${crypto.randomUUID()}`;
const session = await jsonFetch(`/api/v1/events/${encodeURIComponent(EVENT_ID)}/guest-sessions`, {
  method: "POST",
  body: JSON.stringify({
    guestDisplayName: "Smoke Test Guest",
    clientGeneratedGuestId: `guest-${crypto.randomUUID()}`,
  }),
});

const auth = { Authorization: `Bearer ${session.guestToken}` };
const presign = await jsonFetch("/api/v1/uploads/presign", {
  method: "POST",
  headers: auth,
  body: JSON.stringify({
    eventId: EVENT_ID,
    guestSessionId: session.guestSessionId,
    localPhotoId,
    contentType: "image/jpeg",
    sizeBytes: IMAGE.byteLength,
    width: WIDTH,
    height: HEIGHT,
    capturedAt: new Date().toISOString(),
  }),
});

const putResponse = await fetch(presign.uploadUrl, {
  method: presign.method,
  headers: toUploadHeaders(presign.headers),
  body: IMAGE,
});

if (!putResponse.ok) {
  throw new Error(`Storage PUT failed ${putResponse.status}: ${await putResponse.text()}`);
}

const confirm = await jsonFetch("/api/v1/uploads/confirm", {
  method: "POST",
  headers: auth,
  body: JSON.stringify({
    photoId: presign.photoId,
    localPhotoId,
    eventId: EVENT_ID,
    guestSessionId: session.guestSessionId,
    objectKey: presign.objectKey,
    etag: putResponse.headers.get("etag") ?? "",
  }),
});

let status = confirm;
for (let attempt = 0; attempt < 20; attempt += 1) {
  status = await jsonFetch(`/api/v1/photos/${encodeURIComponent(presign.photoId)}/status`, {
    headers: auth,
  });
  if (status.uploadStatus === "processed") {
    break;
  }
  await new Promise((resolve) => setTimeout(resolve, 1500));
}

console.log(
  JSON.stringify(
    {
      eventId: EVENT_ID,
      photoId: presign.photoId,
      localPhotoId,
      uploadUrlHost: new URL(presign.uploadUrl).host,
      confirmedStatus: confirm.uploadStatus,
      finalStatus: status.uploadStatus,
    },
    null,
    2,
  ),
);
