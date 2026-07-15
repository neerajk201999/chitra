export * from "./ir/schema.js";
export * from "./motion/tokens.js";
export { compile, resolveSceneTimeline, totalDurationMs, type CompileResult } from "./compile/index.js";
export { openSession, renderScore, sceneHash, type RenderSession, type RenderResult, type TextRegion, type Quality } from "./render/index.js";
export { runStaticGates, runFrameGates, summarize, type Finding } from "./gates/index.js";
export { generateEvidence, type EvidenceResult } from "./evidence/index.js";
