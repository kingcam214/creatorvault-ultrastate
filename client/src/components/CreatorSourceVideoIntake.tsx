import React, { type ChangeEvent, useRef, useState } from "react";
import {
  CheckCircle2,
  FileVideo,
  Loader2,
  Upload,
  XCircle,
} from "lucide-react";
import type { MediaAssetItem } from "./MediaPicker";

export type DirectUploadReceipt = {
  id: string;
  mediaAssetId?: string;
  sha256: string;
  verified: boolean;
  createdAt: string;
  codec?: string;
  width?: number;
  height?: number;
  durationSec?: number;
};

export type DirectVideoUploadResponse = {
  url: string;
  filename: string;
  storageId: string;
  mediaAssetId: string;
  size: number;
  mime: string;
  uploadReceipt: DirectUploadReceipt;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringField(
  value: Record<string, unknown>,
  field: string
): string | null {
  const candidate = value[field];
  return typeof candidate === "string" && candidate.trim() ? candidate : null;
}

function numberField(
  value: Record<string, unknown>,
  field: string
): number | undefined {
  const candidate = value[field];
  return typeof candidate === "number" && Number.isFinite(candidate)
    ? candidate
    : undefined;
}

function readErrorMessage(body: unknown, fallback: string): string {
  if (!isRecord(body)) return fallback;
  return stringField(body, "error") ?? fallback;
}

export function parseDirectVideoUploadResponse(
  payload: unknown
): DirectVideoUploadResponse {
  if (!isRecord(payload)) {
    throw new Error("CreatorVault did not return a saved source receipt.");
  }

  const url = stringField(payload, "url");
  const filename = stringField(payload, "filename");
  const storageId = stringField(payload, "storageId");
  const mediaAssetId = stringField(payload, "mediaAssetId");
  const mime = stringField(payload, "mime");
  const uploadReceipt = payload.uploadReceipt;

  if (
    !url ||
    !filename ||
    !storageId ||
    !mediaAssetId ||
    !mime ||
    !isRecord(uploadReceipt)
  ) {
    throw new Error(
      "CreatorVault did not return a complete saved source record."
    );
  }

  const receiptId = stringField(uploadReceipt, "id");
  const sha256 = stringField(uploadReceipt, "sha256");
  const createdAt = stringField(uploadReceipt, "createdAt");
  if (!receiptId || !sha256 || !createdAt || uploadReceipt.verified !== true) {
    throw new Error("CreatorVault could not verify this source video.");
  }

  return {
    url,
    filename,
    storageId,
    mediaAssetId,
    size: numberField(payload, "size") ?? 0,
    mime,
    uploadReceipt: {
      id: receiptId,
      mediaAssetId: stringField(uploadReceipt, "mediaAssetId") ?? mediaAssetId,
      sha256,
      verified: true,
      createdAt,
      codec: stringField(uploadReceipt, "codec") ?? undefined,
      width: numberField(uploadReceipt, "width"),
      height: numberField(uploadReceipt, "height"),
      durationSec: numberField(uploadReceipt, "durationSec"),
    },
  };
}

export function directUploadResponseToMediaAsset(
  response: DirectVideoUploadResponse
): MediaAssetItem {
  return {
    id: response.mediaAssetId,
    assetType: "video",
    mimeType: response.mime,
    fileName: response.filename,
    originalName: response.filename,
    thumbnailUrl: response.url,
    publicUrl: response.url,
    duration: response.uploadReceipt.durationSec ?? null,
    width: response.uploadReceipt.width ?? null,
    height: response.uploadReceipt.height ?? null,
    fileSize: response.size,
    createdAt: response.uploadReceipt.createdAt,
    status: "ready",
    storagePath: response.url,
    sourceType: "upload",
    classification: "creator_owned_or_generated",
    bodyCinemaEligible: false,
  };
}

export function trailerMakerSourcePath(mediaAssetId: string): string {
  return `/trailer-maker?sourceAssetId=${encodeURIComponent(mediaAssetId)}`;
}

async function uploadSourceVideo(
  file: File,
  onProgress: (value: number) => void
): Promise<DirectVideoUploadResponse> {
  const form = new FormData();
  form.append("file", file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = event => {
      if (event.lengthComputable && event.total > 0) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      let payload: unknown = null;
      try {
        payload = JSON.parse(xhr.responseText) as unknown;
      } catch {
        reject(
          new Error(
            `CreatorVault could not read the upload response (${xhr.status}).`
          )
        );
        return;
      }
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(
          new Error(
            readErrorMessage(payload, `Source upload stopped (${xhr.status}).`)
          )
        );
        return;
      }
      try {
        resolve(parseDirectVideoUploadResponse(payload));
      } catch (error) {
        reject(
          error instanceof Error
            ? error
            : new Error("CreatorVault could not verify this source video.")
        );
      }
    };
    xhr.onerror = () =>
      reject(
        new Error(
          "CreatorVault could not reach the saved-source upload service."
        )
      );
    xhr.open("POST", "/api/video/upload/direct");
    xhr.withCredentials = true;
    xhr.send(form);
  });
}

export interface CreatorSourceVideoIntakeProps {
  onSavedSource: (asset: MediaAssetItem) => Promise<void> | void;
}

export function CreatorSourceVideoIntake({
  onSavedSource,
}: CreatorSourceVideoIntakeProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<"idle" | "uploading" | "saved" | "error">(
    "idle"
  );
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const chooseFile = () => inputRef.current?.click();

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      setState("error");
      setMessage("Choose a video file to save as your source video.");
      return;
    }

    setState("uploading");
    setProgress(0);
    setFileName(file.name);
    setMessage(null);
    try {
      const response = await uploadSourceVideo(file, setProgress);
      const savedSource = directUploadResponseToMediaAsset(response);
      await onSavedSource(savedSource);
      setProgress(100);
      setState("saved");
      setMessage("Your source video is saved and selected below.");
    } catch (error) {
      setState("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "CreatorVault could not save this source video."
      );
    }
  };

  return (
    <section
      className="cv-dna cv-panel"
      aria-labelledby="source-video-intake-title"
      style={{
        borderRadius: 0,
        borderLeft: 0,
        borderRight: 0,
        borderBottom: 0,
        padding: "24px",
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={event => void handleFile(event)}
      />
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-xl">
          <p
            className="cv-eyebrow"
            style={{ margin: 0, color: "var(--accent-cyan)" }}
          >
            Source video intake
          </p>
          <h3
            id="source-video-intake-title"
            className="heading-xl"
            style={{ margin: "5px 0 0", fontSize: 28 }}
          >
            Add a source video from your device.
          </h3>
          <p
            className="body-md"
            style={{ margin: "8px 0 0", color: "var(--text-secondary)" }}
          >
            CreatorVault saves the video to your existing source library, then
            keeps that exact saved source connected to Trailer Maker.
          </p>
        </div>
        <button
          type="button"
          onClick={chooseFile}
          disabled={state === "uploading"}
          className="cv-cta"
          style={{ minHeight: 52, borderRadius: 2 }}
        >
          {state === "uploading" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {state === "uploading"
            ? `Saving ${progress}%`
            : "Choose source video"}
        </button>
      </div>

      {state === "uploading" && (
        <div className="mt-5" aria-live="polite">
          <div className="h-1.5 overflow-hidden bg-[var(--bg-elevated)]">
            <div
              className="h-full bg-[var(--accent-cyan)] transition-[width]"
              style={{ width: `${progress}%` }}
            />
          </div>
          {fileName && (
            <p className="badge-text mt-3 text-[var(--text-secondary)]">
              SAVING {fileName}
            </p>
          )}
        </div>
      )}

      {state === "saved" && message && (
        <p className="cv-state mt-5 flex items-center gap-2" role="status">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-[#00FF94]" />
          {message}
        </p>
      )}
      {state === "error" && message && (
        <p
          className="cv-state mt-5 flex items-center gap-2 border-[#FF3B3B]/35 text-[#FF8B8B]"
          role="alert"
        >
          <XCircle className="h-4 w-4 shrink-0" />
          {message}
        </p>
      )}
      {state === "idle" && (
        <p className="badge-text mt-5 flex items-center gap-2 text-[var(--text-muted)]">
          <FileVideo className="h-4 w-4 text-[var(--accent-cyan)]" />A SAVED
          SOURCE IS NOT PRESENTED AS A RENDERED OR FINAL RESULT.
        </p>
      )}
    </section>
  );
}
