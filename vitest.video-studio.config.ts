import { defineConfig } from "vitest/config";
import base from "./vitest.config";

export default defineConfig({
  ...base,
  test: {
    ...base.test,
    environment: "node",
    include: [
      "client/src/components/video-studio/__tests__/VideoStudioTimeline.test.tsx",
    ],
    fileParallelism: false,
    testTimeout: 15000,
  },
});
