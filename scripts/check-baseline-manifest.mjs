#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const STAGE_ORDER = [
  "extract",
  "generate",
  "previewValidate",
  "previewVerify",
  "merge",
  "targetValidate",
  "targetVerify",
];

const STAGE_ARTIFACTS = {
  extract: ["rawFigma", "assetsManifest", "normalizedDesign", "designSpec"],
  generate: ["generationLog"],
  previewValidate: ["previewValidationReport"],
  previewVerify: ["previewVerificationReport"],
  merge: ["mergeReport"],
  targetValidate: ["targetValidationReport"],
  targetVerify: ["targetVerificationReport"],
};

const COMPLETE_STATUSES = {
  extract: new Set(["OK", "DEGRADED", "BACKFILLED"]),
  generate: new Set(["OK", "BACKFILLED"]),
  previewValidate: new Set(["OK", "WARN", "PASSED", "DEGRADED", "BACKFILLED"]),
  previewVerify: new Set(["PASSED", "FAILED", "SKIPPED", "BACKFILLED"]),
  merge: new Set(["OK", "SKIPPED", "BACKFILLED"]),
  targetValidate: new Set(["OK", "WARN", "PASSED", "FAILED", "DEGRADED", "SKIPPED", "BACKFILLED"]),
  targetVerify: new Set(["PASSED", "FAILED", "SKIPPED", "BACKFILLED"]),
};

const ALLOWED_STATUSES = new Set([
  "PENDING",
  "OK",
  "WARN",
  "PASSED",
  "FAILED",
  "SKIPPED",
  "DEGRADED",
  "BACKFILLED",
]);

function usage() {
  console.error("Usage: node scripts/check-baseline-manifest.mjs <manifest> [--next-step] [--expect-next-step=<STEP>]");
  process.exit(2);
}

const args = process.argv.slice(2);
const manifestArg = args.find((arg) => !arg.startsWith("--"));
const printNextStep = args.includes("--next-step");
const expectNextStep = args.find((arg) => arg.startsWith("--expect-next-step="))?.split("=")[1];

if (!manifestArg) {
  usage();
}

const cwd = process.cwd();
const manifestPath = path.resolve(cwd, manifestArg);
const manifestRoot = path.dirname(manifestPath);

function readJson(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${filePath}\n${error.message}`);
  }
}

function pathCandidates(rawPath) {
  if (!rawPath || typeof rawPath !== "string") {
    return [];
  }
  if (path.isAbsolute(rawPath)) {
    return [rawPath];
  }
  return [
    path.resolve(cwd, rawPath),
    path.resolve(manifestRoot, rawPath),
    path.resolve(manifestRoot, "..", "..", "..", rawPath),
  ];
}

function resolveArtifact(rawPath) {
  return pathCandidates(rawPath).find((candidate) => fs.existsSync(candidate));
}

function assertNonEmptyFile(rawPath, label) {
  const resolved = resolveArtifact(rawPath);
  if (!resolved) {
    throw new Error(`${label} is missing: ${rawPath}`);
  }
  const stat = fs.statSync(resolved);
  if (!stat.isFile() || stat.size === 0) {
    throw new Error(`${label} is empty or not a file: ${rawPath}`);
  }
  return resolved;
}

function isStageComplete(manifest, stage) {
  const status = manifest.status?.[stage] ?? "PENDING";
  return COMPLETE_STATUSES[stage].has(status);
}

function validateCompletedArtifacts(manifest, stage) {
  for (const artifactName of STAGE_ARTIFACTS[stage] ?? []) {
    const artifactPath = manifest.artifacts?.[artifactName];
    const resolved = assertNonEmptyFile(artifactPath, `${stage}.${artifactName}`);
    if (artifactPath.endsWith(".json")) {
      readJson(resolved, `${stage}.${artifactName}`);
    }
  }
}

function nextStep(manifest) {
  if (!isStageComplete(manifest, "extract")) {
    return "EXTRACT";
  }
  if (!isStageComplete(manifest, "generate")) {
    return "GENERATE";
  }
  if (!isStageComplete(manifest, "previewValidate")) {
    return "PREVIEW_VALIDATE";
  }

  const previewVerifyStatus = manifest.status?.previewVerify ?? "PENDING";
  if (previewVerifyStatus === "FAILED") {
    const iterations = Number(manifest.iteration?.previewVerify ?? manifest.iterations?.previewVerify ?? 1);
    const maxIterations = Number(manifest.config?.maxIterations ?? 3);
    return iterations < maxIterations ? "GENERATE_FROM_DRIFT" : "WAIT_FOR_USER";
  }
  if (!isStageComplete(manifest, "previewVerify")) {
    return "PREVIEW_VERIFY";
  }

  if (!["PASSED", "SKIPPED", "BACKFILLED"].includes(previewVerifyStatus)) {
    return "PREVIEW_VERIFY";
  }
  if (!isStageComplete(manifest, "merge")) {
    return "MERGE";
  }

  const targetValidateStatus = manifest.status?.targetValidate ?? "PENDING";
  if (targetValidateStatus === "FAILED" || targetValidateStatus === "DEGRADED") {
    return "STOP_TARGET_VALIDATE_FAILED";
  }
  if (!isStageComplete(manifest, "targetValidate")) {
    return "TARGET_VALIDATE";
  }
  if (!isStageComplete(manifest, "targetVerify")) {
    return "TARGET_VERIFY";
  }
  return "COMPLETE";
}

function validateManifest(manifest) {
  const errors = [];

  for (const field of ["runId", "designId", "input", "project", "artifacts", "status"]) {
    if (manifest[field] === undefined) {
      errors.push(`Missing top-level field: ${field}`);
    }
  }

  for (const stage of STAGE_ORDER) {
    const status = manifest.status?.[stage] ?? "PENDING";
    if (!ALLOWED_STATUSES.has(status)) {
      errors.push(`Invalid status.${stage}: ${status}`);
      continue;
    }
    if (isStageComplete(manifest, stage)) {
      try {
        validateCompletedArtifacts(manifest, stage);
      } catch (error) {
        errors.push(error.message);
      }
    }
  }

  for (let index = 1; index < STAGE_ORDER.length; index += 1) {
    const stage = STAGE_ORDER[index];
    const previous = STAGE_ORDER[index - 1];
    if (isStageComplete(manifest, stage) && !isStageComplete(manifest, previous)) {
      errors.push(`Stage ${stage} is complete before ${previous}`);
    }
  }

  const previewVerifyStatus = manifest.status?.previewVerify;
  if (isStageComplete(manifest, "merge") && !["PASSED", "SKIPPED", "BACKFILLED"].includes(previewVerifyStatus)) {
    errors.push("Merge requires status.previewVerify to be PASSED, SKIPPED, or BACKFILLED");
  }

  const targetValidateStatus = manifest.status?.targetValidate;
  const targetVerifyStatus = manifest.status?.targetVerify;
  if ((targetValidateStatus === "FAILED" || targetValidateStatus === "DEGRADED") && targetVerifyStatus === "PASSED") {
    errors.push("Target verify cannot be PASSED when target validate is FAILED or DEGRADED");
  }

  return errors;
}

const manifest = readJson(manifestPath, "manifest");
const errors = validateManifest(manifest);
const computedNextStep = nextStep(manifest);

if (expectNextStep && computedNextStep !== expectNextStep) {
  errors.push(`Expected next step ${expectNextStep}, got ${computedNextStep}`);
}

if (errors.length > 0) {
  console.error(`Baseline manifest check failed: ${manifestArg}`);
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

if (printNextStep) {
  console.log(computedNextStep);
} else {
  console.log(`OK ${manifestArg} next=${computedNextStep}`);
}
