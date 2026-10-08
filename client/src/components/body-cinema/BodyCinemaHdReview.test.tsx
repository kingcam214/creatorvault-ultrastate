import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BodyDirectedLifecycleRecord } from "@shared/bodyCinemaCandidateLifecycle";
import {
  BODY_FOCUS_LIBRARY,
  BODY_FOCUS_TREATMENTS,
  BODY_VISUAL_IDENTITIES,
  type BodyDirectedSourceMap,
  type BodyDirectedUsableRange,
} from "@shared/bodyCinemaBodyDirection";
import {
  bodyCinemaHdExecuteSchema,
  type BodyCinemaHdJob,
} from "@shared/bodyCinemaHd";
import {
  BodyCinemaHdReview,
  defaultHdSegments,
  hdFocusDuration,
  hdFocusWindows,
  hdSupportedWindows,
  validateHdSegments,
} from "./BodyCinemaHdReview";

const hooks = vi.hoisted(() => ({ values: [] as unknown[], cursor: 0 }));
const api = vi.hoisted(() => ({
  job: null as BodyCinemaHdJob | null,
  loading: false,
  error: null as Error | null,
  get: vi.fn(),
  prepare: vi.fn(),
  execute: vi.fn(),
  refetch: vi.fn(),
}));

// No DOM/browser or live router: controlled React hook cells make event handlers
// inspectable in the same node-only test runner as the existing director tests.
vi.mock("react", async importOriginal => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useId: () => "hd-test-title",
    useEffect: () => undefined,
    useMemo: <T,>(factory: () => T) => factory(),
    useRef: <T,>(value: T) => ({ current: value }),
    useState: <S,>(
      initial: S | (() => S)
    ): [S, React.Dispatch<React.SetStateAction<S>>] => {
      const index = hooks.cursor++;
      if (!(index in hooks.values))
        hooks.values[index] =
          typeof initial === "function" ? (initial as () => S)() : initial;
      const set: React.Dispatch<React.SetStateAction<S>> = value => {
        hooks.values[index] =
          typeof value === "function"
            ? (value as (previous: S) => S)(hooks.values[index] as S)
            : value;
      };
      return [hooks.values[index] as S, set];
    },
  };
});
vi.mock("@/lib/trpc", () => ({
  trpc: {
    bodyCinema: {
      lifecycle: {
        getHdRender: {
          useQuery: (...args: unknown[]) => {
            api.get(...args);
            return {
              data: api.job,
              isLoading: api.loading,
              isError: Boolean(api.error),
              error: api.error,
              refetch: api.refetch,
            };
          },
        },
        prepareHdRender: {
          useMutation: () => ({ isPending: false, mutateAsync: api.prepare }),
        },
        executeHdRender: {
          useMutation: () => ({ isPending: false, mutateAsync: api.execute }),
        },
      },
    },
  },
}));

const date = "2026-10-08T12:00:00.000Z";
const nativeCrop = { left: 0, top: 0, width: 1, height: 1 };
const diagnostics = {
  width: 720,
  height: 1280,
  brightness: 0.5,
  sharpness: 0.8,
  contrast: 0.5,
  subjectCoverage: 0.7,
};
const range: BodyDirectedUsableRange = {
  id: "native-1",
  startMs: 1000,
  endMs: 15000,
  visibleFocusIds: ["full_body"],
  movementType: "held_pose",
  framingQuality: 0.9,
  lightingQuality: 0.5,
  stability: 0.9,
  evidence: ["Frozen native source context"],
  visibilityProvenance: "measured_pose",
  crop: nativeCrop,
  measuredRegions: ["full_body", "face", "torso", "arms", "hips", "legs"],
  allowedSourceContextCrop: {
    label: "ORIGINAL SOURCE CONTEXT",
    crop: nativeCrop,
    evidence: {
      leftFrameFingerprint: "left-frame",
      rightFrameFingerprint: "right-frame",
      leftCanvasDiagnostics: diagnostics,
      rightCanvasDiagnostics: diagnostics,
    },
  },
};
const sourceMap: BodyDirectedSourceMap = {
  version: "body_cinema.body_directed_source_map.v1",
  provenance: "browser_local_pose_and_creator_marks",
  source: {
    assetId: "owned-source",
    sha256: "a".repeat(64),
    width: 720,
    height: 1280,
    durationSeconds: 18,
  },
  usableRanges: [range],
  excludedRanges: [],
  limitations: ["Measured source evidence only"],
  detailObservations: [],
  bestEligibleTreatmentIds: ["main_character"],
};
const focus = BODY_FOCUS_LIBRARY.find(item => item.id === "full_body")!;
const treatment = BODY_FOCUS_TREATMENTS.find(
  item => item.id === "main_character"
)!;
const mood = BODY_VISUAL_IDENTITIES.find(item => item.id === "la_reina")!;
const record: BodyDirectedLifecycleRecord = {
  id: "00000000-0000-4000-8000-000000000001",
  projectId: "00000000-0000-4000-8000-000000000002",
  creatorId: 1,
  kind: "body_directed_v2",
  state: "frozen",
  source: {
    ...sourceMap.source,
    sha256: "a".repeat(64),
    fileName: "source.mp4",
    sizeBytes: 10000,
    mimeType: "video/mp4",
    receiptId: "receipt-original",
    classification: "owned_original",
  },
  rights: {
    version: "body_cinema.body_directed_assertion.v1",
    ownSource: true,
    performerLikenessConsent: true,
    treatmentScope: "body_directed_source_analysis_and_plan_only",
    intendedUse: "source_analysis_and_plan_only",
    acknowledgesNoIndependentVerification: true,
    verificationStatus: "creator_asserted_not_independently_verified",
    assertedAt: date,
  },
  analysis: {
    version: "body_cinema.body_directed_analysis.v1",
    sourceMap,
    sourceMapHash: "b".repeat(64),
    frameEvidence: [1000, 8000, 15000].map(timestampMs => ({
      timestampMs,
      width: 720,
      height: 1280,
      landmarks: [],
    })),
    detailObservations: [],
  },
  treatment: {
    version: "body_cinema.body_directed_plan.v1",
    registryVersion: "historic-v1",
    treatmentName: "Frozen entrance",
    source: sourceMap.source,
    bodyFocus: { ...focus, label: "Frozen focus" },
    bodyTreatment: { ...treatment, name: "Frozen entrance" },
    visualIdentity: { ...mood, name: "Frozen regal mood" },
    sourceMap,
    selectedTimecodes: [{ rangeId: range.id, startMs: 1000, endMs: 1400 }],
    editBlueprint: {
      version: "body_cinema.body_directed_edit_blueprint.v1",
      heroRangeId: range.id,
      shots: [
        {
          id: "original-shot",
          order: 1,
          sourceRangeId: range.id,
          startMs: 1000,
          endMs: 1400,
          intent: "Original immutable cut",
          framing: "Original frame",
          crop: nativeCrop,
          transition: "cut",
          pacing: "recorded",
          movementInstruction: "hold",
        },
      ],
      slowMotion: { eligible: false, reason: "Native timing only" },
      limitations: ["Plan only"],
      excludedRanges: [],
    },
    preservationConstraints: {
      identity: "preserve",
      face: "preserve",
      bodyAndAnatomy: "preserve",
      naturalSkinAndTexture: "preserve",
      wardrobe: "preserve",
      environment: "preserve",
      sourceMotionAndTiming: "preserve",
      sourceCameraAndFraming: "preserve",
      generatedBodyOrIdentityChanges: "not_authorized",
      providerCall: "not_authorized",
    },
    providerReadyDirection: "Plan only",
    outputLadder: {
      status: "planning_only",
      sourceBound: true,
      candidateGenerated: false,
      providerCallMade: false,
      nextAuthorizedStep: "Private review requires separate authorization",
    },
    status: "planning_only",
    noCandidateGenerated: true,
  },
  treatmentHash: "c".repeat(64),
  candidate: null,
  handoff: null,
  createdAt: date,
  updatedAt: date,
};
const prepared: BodyCinemaHdJob = {
  version: "body_cinema.hd_job.v1",
  id: "00000000-0000-4000-8000-000000000003",
  lifecycleId: record.id,
  creatorId: record.creatorId,
  treatmentHash: record.treatmentHash!,
  recipe: {
    version: "body_cinema.hd_recipe.v1",
    sourceSha256: record.source.sha256,
    sourceAssetId: record.source.assetId,
    bodyFocusId: "full_body",
    bodyFocusLabel: "Historic saved full form",
    editStyleId: "main_character",
    editStyleName: "Historic locked cinema",
    visualGradeId: "obsidian",
    segments: [
      { startMs: 1000, endMs: 4500 },
      { startMs: 4500, endMs: 8000 },
      { startMs: 8000, endMs: 11500 },
    ],
    width: 1080,
    height: 1920,
    durationSeconds: 10.5,
    framing: "complete_native_source",
  },
  recipeHash: "d".repeat(64),
  status: "prepared",
  createdAt: date,
  startedAt: null,
  completedAt: null,
  error: null,
  candidate: null,
  ownerAcceptance: "not_reviewed",
  externalCostUsd: 0,
  providerCallMade: false,
};
const ready: BodyCinemaHdJob = {
  ...prepared,
  status: "ready",
  completedAt: date,
  candidate: {
    assetId: "private-hd-candidate",
    sha256: "e".repeat(64),
    sizeBytes: 99999,
    width: 1080,
    height: 1920,
    durationSeconds: 10.5,
    frameRate: 30,
    frameCount: 315,
    hasAudio: true,
    gradeVersion: "historic-grade-v1",
  },
};

type ElementProps = {
  children?: React.ReactNode;
  onClick?: () => void | Promise<void>;
  onChange?: (event: { target: { checked: boolean; value: string } }) => void;
  disabled?: boolean;
  type?: string;
  "aria-label"?: string;
  src?: string;
  controls?: boolean;
  playsInline?: boolean;
  autoPlay?: boolean;
};
function elements(node: React.ReactNode): React.ReactElement<ElementProps>[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!React.isValidElement<ElementProps>(node)) return [];
  return [node, ...elements(node.props.children)];
}
function text(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(text).join("");
  return React.isValidElement<ElementProps>(node)
    ? text(node.props.children)
    : "";
}
function tree(
  currentRecord = record,
  onSeek?: (segment: { startMs: number; endMs: number }) => void
): React.ReactNode {
  hooks.cursor = 0;
  const boundary = BodyCinemaHdReview({ record: currentRecord, onSeek });
  if (typeof boundary.type !== "function") return boundary;
  return (
    boundary.type as (props: {
      record: BodyDirectedLifecycleRecord;
      onSeek?: typeof onSeek;
    }) => React.ReactNode
  )(boundary.props);
}
function button(node: React.ReactNode, label: string) {
  const match = elements(node).find(
    element => element.type === "button" && text(element).includes(label)
  );
  if (!match) throw new Error(`Missing button: ${label}`);
  return match;
}
function markup(): string {
  hooks.cursor = 0;
  return renderToStaticMarkup(<BodyCinemaHdReview record={record} />);
}

beforeEach(() => {
  vi.clearAllMocks();
  hooks.values = [];
  hooks.cursor = 0;
  api.job = null;
  api.loading = false;
  api.error = null;
  api.refetch.mockResolvedValue({ data: null });
  api.prepare.mockResolvedValue(prepared);
  api.execute.mockResolvedValue({
    ...prepared,
    status: "rendering",
    startedAt: date,
  });
});

describe("private HD review", () => {
  it.each(["prepared", "rendering", "failed"] as const)(
    "never exposes a candidate video while %s",
    status => {
      api.job = {
        ...prepared,
        status,
        error: status === "failed" ? "Verified render failed" : null,
      };
      expect(markup()).not.toContain("<video");
      expect(markup()).not.toContain("/hd-candidate");
    }
  );

  it("renders locked names and exact duration from the job, not a current registry or plan", () => {
    api.job = prepared;
    const html = markup();
    expect(html).toContain("Historic locked cinema");
    expect(html).toContain("Historic saved full form");
    expect(html).toContain("obsidian");
    expect(html).toContain("10.5 seconds");
    expect(html).not.toContain("Frozen entrance");
    expect(html).not.toContain('type="number"');
    expect(html).not.toContain("Save HD blueprint");
  });

  it("shows only the complete private candidate with native video controls once verified ready", () => {
    api.job = ready;
    const node = tree();
    const video = elements(node).find(element => element.type === "video");
    expect(video?.props.src).toBe(
      `/api/body-cinema/lifecycle/${record.id}/hd-candidate`
    );
    expect(video?.props.controls).toBe(true);
    expect(video?.props.playsInline).toBe(true);
    expect(video?.props.autoPlay).toBeUndefined();
    const html = markup();
    expect(html).toContain("Upscaled to the HD canvas");
    expect(html).toContain(
      "1080p encoding preserves source detail; it cannot recreate detail absent from your original."
    );
    expect(html).toContain("No automatic acceptance, handoff, or publication.");
    const labels = elements(node)
      .filter(element => element.type === "button")
      .map(element => text(element));
    expect(labels.some(label => /accept|handoff|publish/i.test(label))).toBe(
      false
    );
    expect(record.candidate).toBeNull();
    expect(record.handoff).toBeNull();
  });

  it("requires the explicit watch/rights checkbox even when the render handler is invoked directly", async () => {
    api.job = prepared;
    const render = button(tree(), "Render private HD candidate");
    expect(render.props.disabled).toBe(true);
    await render.props.onClick?.();
    expect(api.execute).not.toHaveBeenCalled();
  });

  it("sends the exact saved recipe and all required true-only private authorization fields", async () => {
    api.job = prepared;
    const node = tree();
    const checkbox = elements(node).find(
      element => element.type === "input" && element.props.type === "checkbox"
    );
    expect(text(node)).toContain(
      "I watched every selected source range. Complete head and chin remain visible; I own the source and have performer consent for this private review."
    );
    checkbox?.props.onChange?.({ target: { checked: true, value: "" } });
    const render = button(tree(), "Render private HD candidate");
    expect(render.props.disabled).toBe(false);
    await render.props.onClick?.();
    expect(api.execute).toHaveBeenCalledWith({
      id: record.id,
      jobId: prepared.id,
      recipeHash: prepared.recipeHash,
      authorization: {
        version: "body_cinema.hd_private_review_authorization.v1",
        ownSource: true,
        performerLikenessConsent: true,
        watchedSelectedNativeRanges: true,
        completeHeadAndChinVisible: true,
        purpose: "private_hd_candidate_review",
        externalCostCeilingUsd: 0,
        noPublication: true,
        acknowledgesNoIndependentVerification: true,
      },
    });
    expect(
      bodyCinemaHdExecuteSchema.safeParse(api.execute.mock.calls[0][0]).success
    ).toBe(true);
    await Promise.resolve();
    expect(text(tree())).toContain("Rendering privately on the server");
    expect(elements(tree()).some(element => element.type === "video")).toBe(
      false
    );
  });

  it("keeps failures visible and does not offer a retry, editable recipe or another render", () => {
    api.job = {
      ...prepared,
      status: "failed",
      error: "Candidate byte verification failed",
    };
    const html = markup();
    expect(html).toContain('role="alert"');
    expect(html).toContain("Candidate byte verification failed");
    expect(html).toContain("No retry is available here");
    expect(html).not.toContain("Render private HD candidate");
    expect(html).not.toContain("Save HD blueprint");
    expect(
      elements(tree())
        .filter(element => element.type === "button")
        .every(element => text(element) === "Play source range")
    ).toBe(true);
  });

  it("saves exact millisecond source cuts as a separate blueprint without changing original shots", async () => {
    const original = JSON.stringify(record.treatment);
    const save = button(tree(), "Save HD blueprint");
    expect(save.props.disabled).toBe(false);
    await save.props.onClick?.();
    expect(api.prepare).toHaveBeenCalledWith({
      id: record.id,
      treatmentHash: record.treatmentHash,
      segments: defaultHdSegments(hdSupportedWindows(record)),
    });
    expect(JSON.stringify(record.treatment)).toBe(original);
    await Promise.resolve();
    expect(text(tree())).toContain("Historic locked cinema");
  });

  it("replays saved status on query and polls only rendering", () => {
    api.job = ready;
    tree();
    const [input, options] = api.get.mock.calls[0] as [
      { id: string },
      {
        enabled: boolean;
        refetchInterval: (query: {
          state: { data: BodyCinemaHdJob | null };
        }) => number | false;
      },
    ];
    expect(input).toEqual({ id: record.id });
    expect(options.enabled).toBe(true);
    expect(
      options.refetchInterval({
        state: { data: { ...prepared, status: "rendering" } },
      })
    ).toBe(2500);
    for (const data of [
      null,
      prepared,
      ready,
      { ...prepared, status: "failed" as const },
    ])
      expect(options.refetchInterval({ state: { data } })).toBe(false);
  });

  it("blocks a context-conflicting job instead of replaying another plan's candidate", () => {
    api.job = { ...ready, treatmentHash: "f".repeat(64) };
    expect(markup()).toContain("does not match this saved plan");
    expect(markup()).not.toContain("<video");
    expect(markup()).not.toContain("Save HD blueprint");
  });

  it("surfaces unknown-grade preparation errors rather than guessing a supported grade", async () => {
    const unknown = {
      ...record,
      treatment: {
        ...record.treatment!,
        visualIdentity: {
          ...record.treatment!.visualIdentity,
          id: "historic-unsupported-grade",
          name: "Historic unsupported mood",
        },
      },
    };
    api.prepare.mockRejectedValueOnce(
      new Error("Unsupported HD grade: historic-unsupported-grade")
    );
    await button(tree(unknown), "Save HD blueprint").props.onClick?.();
    await Promise.resolve();
    expect(text(tree(unknown))).toContain(
      "Unsupported HD grade: historic-unsupported-grade"
    );
    expect(api.execute).not.toHaveBeenCalled();
  });
});

describe("source-supported HD timing", () => {
  it("blocks preparation below the native HD source floor", async () => {
    const low = {
      ...record,
      source: { ...record.source, width: 360, height: 640 },
    };
    const node = tree(low);
    expect(text(node)).toContain("below the HD lane's native resolution floor");
    expect(button(node, "Save HD blueprint").props.disabled).toBe(true);
    await button(node, "Save HD blueprint").props.onClick?.();
    expect(api.prepare).not.toHaveBeenCalled();
  });
  it("allows separately watched native sections in pose sampling gaps without inventing focus support", () => {
    const samplingReason =
      "No adjacent in-bounds, high-confidence landmark samples support this interval.";
    const current = {
      ...record,
      analysis: {
        ...record.analysis!,
        sourceMap: {
          ...sourceMap,
          excludedRanges: [{ startMs: 0, endMs: 1000, reason: samplingReason }],
        },
      },
    };
    expect(hdSupportedWindows(current)).toEqual([{ startMs: 0, endMs: 18000 }]);
    expect(hdFocusWindows(current)).toEqual([{ startMs: 1000, endMs: 15000 }]);
    expect(
      hdFocusDuration([{ startMs: 0, endMs: 1000 }], hdFocusWindows(current))
    ).toBe(0);
    expect(text(tree(current))).toContain(
      "Native-source cuts are separately authorized; body-focus evidence is not inferred in unmeasured source sections."
    );
  });

  it("merges frozen focus intervals without bridging express source defects", () => {
    const intervals = [
      { ...range, id: "one", startMs: 1000, endMs: 5000 },
      { ...range, id: "two", startMs: 5000.0005, endMs: 9000 },
      { ...range, id: "three", startMs: 11000, endMs: 16000 },
      {
        ...range,
        id: "raw-crop",
        startMs: 9000,
        endMs: 11000,
        allowedSourceContextCrop: undefined,
      },
    ];
    const current = {
      ...record,
      analysis: {
        ...record.analysis!,
        sourceMap: {
          ...sourceMap,
          usableRanges: intervals,
          excludedRanges: [
            { startMs: 3000, endMs: 3500, reason: "Excluded gap" },
          ],
        },
      },
    };
    expect(hdSupportedWindows(current)).toEqual([
      { startMs: 0, endMs: 3000 },
      { startMs: 3500, endMs: 18000 },
    ]);
    expect(hdFocusWindows(current)).toEqual([
      { startMs: 1000, endMs: 3000 },
      { startMs: 3500, endMs: 16000 },
    ]);
    expect(intervals[0].endMs).toBe(5000);
  });

  it("uses all native context, but counts only frozen focus and required-region support", () => {
    const current = {
      ...record,
      analysis: {
        ...record.analysis!,
        sourceMap: {
          ...sourceMap,
          usableRanges: [
            {
              ...range,
              visibleFocusIds: ["legs"],
              measuredRegions: ["legs" as const],
            },
            {
              ...range,
              id: "focus-only",
              startMs: 8000,
              endMs: 11000,
              allowedSourceContextCrop: undefined,
            },
            {
              ...range,
              id: "wrong-regions",
              startMs: 12000,
              endMs: 15000,
              measuredRegions: ["face" as const],
              allowedSourceContextCrop: undefined,
            },
          ],
        },
      },
    };
    const windows = hdSupportedWindows(current);
    expect(windows).toEqual([{ startMs: 0, endMs: 18000 }]);
    expect(hdFocusWindows(current)).toEqual([{ startMs: 8000, endMs: 11000 }]);
    expect(
      hdFocusDuration(defaultHdSegments(windows), hdFocusWindows(current))
    ).toBe(3000);
  });

  it("defaults to four sequential provisional native cuts, without rewriting the saved plan", () => {
    expect(defaultHdSegments(hdSupportedWindows(record))).toEqual([
      { startMs: 0, endMs: 3250 },
      { startMs: 3250, endMs: 6500 },
      { startMs: 6500, endMs: 9750 },
      { startMs: 9750, endMs: 13000 },
    ]);
    const windows = [
      { startMs: 0, endMs: 3000 },
      { startMs: 4000, endMs: 7000 },
      { startMs: 8000, endMs: 10000 },
      { startMs: 11000, endMs: 13000 },
    ];
    const segments = defaultHdSegments(windows);
    expect(segments).toHaveLength(4);
    expect(validateHdSegments(segments, windows, [])).toBeNull();
    expect(defaultHdSegments([{ startMs: 0, endMs: 9000 }])).toEqual([]);
  });

  it("rejects invalid values, short shots, totals, repetition and unsupported ranges", () => {
    const windows = hdSupportedWindows(record);
    expect(
      validateHdSegments(
        [{ startMs: NaN, endMs: 3500 }, ...prepared.recipe.segments.slice(1)],
        windows,
        []
      )
    ).not.toBeNull();
    expect(
      validateHdSegments(
        [{ startMs: 1000, endMs: 1999 }, ...prepared.recipe.segments.slice(1)],
        windows,
        []
      )
    ).not.toBeNull();
    expect(
      validateHdSegments(
        Array.from({ length: 3 }, () => ({ startMs: 1000, endMs: 4500 })),
        windows,
        []
      )
    ).toContain("overlap");
    expect(
      validateHdSegments(prepared.recipe.segments, windows, [
        { startMs: 3000, endMs: 3100 },
      ])
    ).toContain("excluded");
    expect(
      validateHdSegments(
        prepared.recipe.segments,
        [{ startMs: 2000, endMs: 15000 }],
        []
      )
    ).toContain("owned original");
  });
});
