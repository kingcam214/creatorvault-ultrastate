import { startRender, getRenderJob } from "../server/services/realRenderEngine";
import path from "path";

const assetsDir = path.resolve(process.cwd(), "client", "public", "assets");
const videosDir = path.resolve(process.cwd(), "client", "public", "videos");

const clips = [
  {
    src: path.join(assetsDir, "hero-transformation.mp4"),
    trimStart: 0,
    trimEnd: 1.5,
    focus: "none",
    punch: true,
    flashIn: true,
    lightLeak: false,
    glitch: true,
    caption: "THE OLD WAY IS DEAD",
  },
  {
    src: path.join(assetsDir, "preview-silhouette.mp4"),
    trimStart: 0.5,
    trimEnd: 2.0,
    focus: "none",
    punch: false,
    flashIn: false,
    lightLeak: true,
    glitch: false,
    caption: "NO MORE GUESSING",
  },
  {
    src: path.join(videosDir, "platform", "vaultx-hero.mp4"),
    trimStart: 1.0,
    trimEnd: 2.5,
    focus: "none",
    punch: true,
    flashIn: false,
    lightLeak: true,
    glitch: false,
    caption: "OWN YOUR REVENUE",
  },
  {
    src: path.join(assetsDir, "hero-transformation.mp4"),
    trimStart: 1.5,
    trimEnd: 3.5,
    focus: "none",
    punch: true,
    flashIn: false,
    lightLeak: false,
    glitch: false,
    caption: "CREATORVAULT ULTRASTATE",
  }
];

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const job = startRender({
    clips,
    aspect: "9:16",
    colorGrade: "cinematic_heat",
    captionText: "CREATORVAULT",
    captionStyle: "bold_center",
    watermarkText: "CreatorVault OS",
    animatedCaptions: true,
    fadeInOut: true,
    chromaAberration: true,
    letterbox: true,
    polish: true,
    transitions: true,
  });

  const deadline = Date.now() + 300_000;
  while (Date.now() < deadline) {
    const current = getRenderJob(job.id);
    if (current?.status === "succeeded" && current.outputUrl) {
      console.log(JSON.stringify({ status: current.status, outputUrl: current.outputUrl, progress: current.progress }));
      return;
    }
    if (current?.status === "failed") {
      throw new Error(current.error || "Long fixture trailer render failed");
    }
    await sleep(1000);
  }
  throw new Error("Long fixture trailer render timed out");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
