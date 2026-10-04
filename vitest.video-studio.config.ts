import { defineConfig } from "vitest/config";
import base from "./vitest.config";

export default defineConfig({
  ...base,
  test: {
    ...base.test,
    environment: "node",
    include: [
      "client/src/components/video-studio/__tests__/VideoStudioTimeline.test.tsx",
      "client/src/pages/CreatorVideoStudioSourceIntake.test.tsx",
      "client/src/pages/CreatorWorkspace.test.tsx",
      "client/src/pages/TrailerDirectionPreview.test.tsx",
      "client/src/pages/VisualDna.test.ts",
      "scripts/videoUploadRouter.localProof.test.ts",
      "server/services/localTrailerCut.test.ts",
    ],
    fileParallelism: false,
    testTimeout: 15000,
  },
});
