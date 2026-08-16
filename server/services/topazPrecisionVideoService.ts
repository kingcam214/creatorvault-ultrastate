import { readFile, stat } from "fs/promises";
import {
  buildTopazPrecisionRequest,
  isTopazPrecisionConfigurationAvailable,
  type TopazPrecisionOptions,
  type TopazPrecisionRequest,
  type TopazPrecisionSource,
} from "./bodyCinemaTopazPrecisionPolicy";

const TOPAZ_VIDEO_API_ROOT = "https://api.topazlabs.com/video";
const MAX_TOPAZ_SOURCE_BYTES = 500 * 1024 * 1024;

export type TopazPrecisionPreparedRequest = {
  request: TopazPrecisionRequest;
  source: TopazPrecisionSource;
};

export type TopazVideoRequestRecord = {
  providerRequestId: string;
  raw: Record<string, unknown>;
};

export type TopazVideoAcceptedUpload = {
  providerRequestId: string;
  uploadUrls: string[];
  raw: Record<string, unknown>;
};

export type TopazVideoStatus = {
  providerRequestId: string;
  state: string;
  outputUrl: string | null;
  raw: Record<string, unknown>;
};

export class TopazPrecisionProviderError extends Error {
  readonly status: number | null;
  readonly code: string;

  constructor(message: string, input: { status?: number | null; code?: string } = {}) {
    super(message);
    this.name = "TopazPrecisionProviderError";
    this.status = input.status ?? null;
    this.code = input.code || "topaz_precision_provider_error";
  }
}

function configuredApiKey(): string {
  const apiKey = process.env.TOPAZ_API_KEY;
  if (!isTopazPrecisionConfigurationAvailable(apiKey)) {
    throw new TopazPrecisionProviderError("Topaz precision finishing is not configured. A server-owned Topaz API key is required before any request can be prepared for submission.", { code: "topaz_not_configured" });
  }
  return String(apiKey).trim();
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function extractRequestId(record: Record<string, unknown>): string {
  const candidate = record.id || record.requestId || record.request_id;
  const value = String(candidate || "").trim();
  if (!value) throw new TopazPrecisionProviderError("Topaz returned no request identifier. CreatorVault will not continue without a durable provider correlation id.", { code: "topaz_missing_request_id" });
  return value;
}

function extractUploadUrls(record: Record<string, unknown>): string[] {
  const candidates = [record.uploadUrls, record.upload_urls, record.urls, record.url];
  for (const candidate of candidates) {
    const values = Array.isArray(candidate) ? candidate : candidate ? [candidate] : [];
    const urls = values.map((value) => String(value || "").trim()).filter((value) => /^https:\/\//i.test(value));
    if (urls.length) return urls;
  }
  throw new TopazPrecisionProviderError("Topaz accepted the request but returned no secure upload URL. CreatorVault will not charge or retry blindly.", { code: "topaz_missing_upload_url" });
}

function extractOutputUrl(record: Record<string, unknown>): string | null {
  const nested = asRecord(record.output);
  const download = asRecord(record.download);
  const candidates = [record.outputUrl, record.output_url, record.downloadUrl, record.download_url, nested.url, download.url];
  for (const candidate of candidates) {
    const value = String(candidate || "").trim();
    if (/^https:\/\//i.test(value)) return value;
  }
  return null;
}

async function requestTopaz(path: string, init: RequestInit): Promise<Record<string, unknown>> {
  const apiKey = configuredApiKey();
  const response = await fetch(`${TOPAZ_VIDEO_API_ROOT}${path}`, {
    ...init,
    headers: {
      "X-API-Key": apiKey,
      accept: "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await response.text();
  let payload: Record<string, unknown> = {};
  try { payload = asRecord(text ? JSON.parse(text) : {}); } catch { payload = { raw: text.slice(0, 8_000) }; }
  if (!response.ok) {
    const providerMessage = String(payload.message || payload.error || payload.detail || text || `HTTP ${response.status}`).slice(0, 8_000);
    const code = response.status === 429
      ? "topaz_rate_limited"
      : response.status === 401 || response.status === 403
        ? "topaz_access_denied"
        : response.status >= 500
          ? "topaz_service_unavailable"
          : "topaz_request_rejected";
    throw new TopazPrecisionProviderError(`Topaz precision request failed: ${providerMessage}`, { status: response.status, code });
  }
  return payload;
}

export async function prepareTopazPrecisionVideoRequest(input: {
  sourceFilePath: string;
  source: Omit<TopazPrecisionSource, "sizeBytes">;
  options: TopazPrecisionOptions;
}): Promise<TopazPrecisionPreparedRequest> {
  const metadata = await stat(input.sourceFilePath);
  if (!metadata.isFile()) throw new Error("Topaz precision finishing requires a readable CreatorVault source video file.");
  if (metadata.size > MAX_TOPAZ_SOURCE_BYTES) throw new Error("This source exceeds Topaz’s documented 500 MB Video API request limit.");
  const source: TopazPrecisionSource = { ...input.source, sizeBytes: metadata.size };
  return { source, request: buildTopazPrecisionRequest(source, input.options) };
}

/** This request is documented as free to create. It never accepts, uploads, or starts processing. */
export async function createTopazPrecisionVideoRequest(input: TopazPrecisionPreparedRequest): Promise<TopazVideoRequestRecord> {
  const raw = await requestTopaz("/", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input.request),
  });
  return { providerRequestId: extractRequestId(raw), raw };
}

/** This is the first chargeable Topaz transition and must only run after a governed one-use permit exists. */
export async function acceptTopazPrecisionVideoRequest(providerRequestId: string): Promise<TopazVideoAcceptedUpload> {
  const id = String(providerRequestId || "").trim();
  if (!id) throw new Error("A Topaz request identifier is required before acceptance.");
  const raw = await requestTopaz(`/${encodeURIComponent(id)}/accept`, { method: "PATCH" });
  return { providerRequestId: id, uploadUrls: extractUploadUrls(raw), raw };
}

/** Uploads one protected MP4 exactly as stored by CreatorVault; no local visual processing is performed. */
export async function uploadAndCompleteTopazPrecisionVideo(input: {
  accepted: TopazVideoAcceptedUpload;
  sourceFilePath: string;
}): Promise<void> {
  if (input.accepted.uploadUrls.length !== 1) {
    throw new TopazPrecisionProviderError("CreatorVault currently supports only a single-part Topaz precision upload. The provider returned a multipart contract, so no upload was attempted.", { code: "topaz_multipart_upload_unimplemented" });
  }
  const content = await readFile(input.sourceFilePath);
  if (content.byteLength > MAX_TOPAZ_SOURCE_BYTES) throw new Error("This source exceeds Topaz’s documented 500 MB Video API request limit.");
  const uploadResponse = await fetch(input.accepted.uploadUrls[0], {
    method: "PUT",
    headers: { "content-type": "video/mp4" },
    body: content,
  });
  if (!uploadResponse.ok) {
    throw new TopazPrecisionProviderError(`Topaz source upload failed with HTTP ${uploadResponse.status}.`, {
      status: uploadResponse.status,
      code: uploadResponse.status >= 500 ? "topaz_upload_unavailable" : "topaz_upload_rejected",
    });
  }
  const eTag = String(uploadResponse.headers.get("etag") || "").trim();
  if (!eTag) throw new TopazPrecisionProviderError("Topaz source upload returned no eTag. Processing was not started.", { code: "topaz_upload_missing_etag" });
  await requestTopaz(`/${encodeURIComponent(input.accepted.providerRequestId)}/complete-upload/`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ uploadResults: [{ partNum: 1, eTag }] }),
  });
}

export async function getTopazPrecisionVideoStatus(providerRequestId: string): Promise<TopazVideoStatus> {
  const id = String(providerRequestId || "").trim();
  if (!id) throw new Error("A Topaz request identifier is required to inspect provider status.");
  const raw = await requestTopaz(`/${encodeURIComponent(id)}/status`, { method: "GET" });
  const state = String(raw.status || raw.state || raw.requestStatus || "unknown");
  return { providerRequestId: id, state, outputUrl: extractOutputUrl(raw), raw };
}
