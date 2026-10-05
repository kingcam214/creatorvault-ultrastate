import type { Express, Request, Response } from "express";
import { HttpError } from "../../shared/_core/errors";
import { sdk } from "../_core/sdk";
import {
  BodyCinemaLifecycleError,
  getBodyCinemaCandidateLifecycleService,
  type BodyCinemaPlaybackArtifact,
} from "../services/bodyCinemaCandidateLifecycle";

function privateHeaders(response: Response): void {
  response.setHeader("Cache-Control", "private, no-store, max-age=0");
  response.setHeader("Pragma", "no-cache");
  response.setHeader("Expires", "0");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Accept-Ranges", "bytes");
}

function safeDownloadName(value: string): string {
  return (
    value.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") ||
    "body-cinema-candidate.mp4"
  );
}

function parseRange(
  value: string | undefined,
  sizeBytes: number
): { start: number; end: number } | null {
  if (!value) return null;
  const match = /^bytes=(\d*)-(\d*)$/i.exec(value.trim());
  if (!match || (!match[1] && !match[2])) return null;
  if (!match[1]) {
    const suffix = Number(match[2]);
    return Number.isSafeInteger(suffix) && suffix > 0
      ? { start: Math.max(0, sizeBytes - suffix), end: sizeBytes - 1 }
      : null;
  }
  const start = Number(match[1]);
  const end = match[2] ? Number(match[2]) : sizeBytes - 1;
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start < 0 ||
    start >= sizeBytes ||
    end < start
  )
    return null;
  return { start, end: Math.min(end, sizeBytes - 1) };
}

function statusFor(error: unknown): number {
  if (error instanceof HttpError && [401, 403].includes(error.statusCode))
    return 401;
  if (error instanceof BodyCinemaLifecycleError) {
    if (error.code === "forbidden") return 403;
    if (error.code === "not_found") return 404;
    if (error.code === "conflict" || error.code === "precondition") return 409;
  }
  return 500;
}

async function closeArtifact(
  artifact: BodyCinemaPlaybackArtifact | null
): Promise<void> {
  await artifact?.handle.close().catch(() => undefined);
}

async function deliver(
  request: Request,
  response: Response,
  artifactType: "source" | "candidate"
): Promise<void> {
  let artifact: BodyCinemaPlaybackArtifact | null = null;
  privateHeaders(response);
  try {
    const user = await sdk.authenticateRequest(request);
    const lifecycleId = String(request.params.id || "").trim();
    if (!lifecycleId) {
      response
        .status(400)
        .json({ error: "Body Cinema lifecycle id is required." });
      return;
    }
    const service = await getBodyCinemaCandidateLifecycleService();
    const isDownload =
      artifactType === "candidate" &&
      String(request.query.download || "") === "1";
    if (isDownload) {
      const record = await service.getMine(Number(user.id), lifecycleId);
      if (!record || !["accepted", "handoff_ready"].includes(record.state)) {
        throw new BodyCinemaLifecycleError(
          "forbidden",
          "Only the exact accepted master is available for download."
        );
      }
    }
    artifact = await service.openPlayback({
      creatorId: Number(user.id),
      id: lifecycleId,
      artifact: artifactType,
    });
    response.type(artifact.mimeType);
    response.setHeader(
      "Content-Disposition",
      isDownload
        ? `attachment; filename="${safeDownloadName(artifact.fileName)}"`
        : "inline"
    );
    const range = parseRange(request.header("range"), artifact.sizeBytes);
    if (request.header("range") && !range) {
      response.setHeader("Content-Range", `bytes */${artifact.sizeBytes}`);
      response.status(416).end();
      await closeArtifact(artifact);
      artifact = null;
      return;
    }
    response.status(range ? 206 : 200);
    response.setHeader(
      "Content-Length",
      String(range ? range.end - range.start + 1 : artifact.sizeBytes)
    );
    if (range)
      response.setHeader(
        "Content-Range",
        `bytes ${range.start}-${range.end}/${artifact.sizeBytes}`
      );
    if (request.method === "HEAD") {
      response.end();
      await closeArtifact(artifact);
      artifact = null;
      return;
    }
    // Hash verification advances the file handle's position; always stream from an explicit offset.
    const opened = artifact;
    const stream = opened.handle.createReadStream({
      autoClose: false,
      start: range?.start ?? 0,
      ...(range ? { end: range.end } : {}),
    });
    let closed = false;
    const finish = () => {
      if (closed) return;
      closed = true;
      stream.destroy();
      void closeArtifact(opened);
    };
    stream.once("error", () => {
      finish();
      response.destroy();
    });
    stream.once("end", finish);
    stream.once("close", finish);
    response.once("close", finish);
    artifact = null;
    stream.pipe(response);
  } catch (error) {
    await closeArtifact(artifact);
    const status = statusFor(error);
    if (response.headersSent) {
      response.destroy();
      return;
    }
    response
      .status(status)
      .json({
        error:
          status === 401
            ? "Sign in to access protected Body Cinema media."
            : status === 403
              ? "This protected Body Cinema media is unavailable to the current creator in this state."
              : "This protected Body Cinema media is unavailable.",
      });
  }
}

/** Mount on the existing Express app before public static handlers. */
export function registerBodyCinemaCandidatePlayback(app: Express): void {
  const source = (request: Request, response: Response) =>
    deliver(request, response, "source");
  const candidate = (request: Request, response: Response) =>
    deliver(request, response, "candidate");
  app.get("/api/body-cinema/lifecycle/:id/source", source);
  app.head("/api/body-cinema/lifecycle/:id/source", source);
  app.get("/api/body-cinema/lifecycle/:id/candidate", candidate);
  app.head("/api/body-cinema/lifecycle/:id/candidate", candidate);
}
