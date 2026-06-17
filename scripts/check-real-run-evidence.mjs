#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const VALID_REGISTRY_STATUSES = new Set([
  "registered-pending-verification",
  "partially-verified",
  "verified"
]);
const VALID_STAGE_STATUS = new Set(["PASSED"]);

function usage() {
  console.error(
    "Usage: node scripts/check-real-run-evidence.mjs <figma-examples.json> [--target-root=<path>] [--require-verified]"
  );
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`Cannot read JSON ${filePath}: ${error.message}`);
  }
}

function parseArgs(argv) {
  const options = {
    registryPath: "",
    targetRoot: "",
    requireVerified: false
  };

  for (const arg of argv) {
    if (arg === "--require-verified") {
      options.requireVerified = true;
    } else if (arg.startsWith("--target-root=")) {
      options.targetRoot = path.resolve(arg.slice("--target-root=".length));
    } else if (!arg.startsWith("--") && !options.registryPath) {
      options.registryPath = path.resolve(process.cwd(), arg);
    }
  }

  return options;
}

function pathCandidates(rawPath, bases) {
  if (!nonEmptyString(rawPath)) {
    return [];
  }
  if (path.isAbsolute(rawPath)) {
    return [rawPath];
  }
  return bases.filter(Boolean).map((base) => path.resolve(base, rawPath));
}

function resolveExistingFile(rawPath, bases) {
  for (const candidate of pathCandidates(rawPath, bases)) {
    if (fs.existsSync(candidate)) {
      const stat = fs.statSync(candidate);
      if (stat.isFile() && stat.size > 0) {
        return candidate;
      }
    }
  }
  return "";
}

function requireEvidenceFile(rawPath, bases, label, errors) {
  const resolved = resolveExistingFile(rawPath, bases);
  if (!resolved) {
    errors.push(`${label} is missing or empty: ${rawPath}`);
    return "";
  }
  return resolved;
}

function validateStageEvidence(example, evidence, bases, scope, errors) {
  if (!isObject(evidence.stageResults)) {
    errors.push(`${scope}.verification.evidence.stageResults must be an object`);
    return;
  }

  for (const stage of example.requiredStages ?? []) {
    const result = evidence.stageResults[stage];
    const field = `${scope}.verification.evidence.stageResults.${stage}`;
    if (!isObject(result)) {
      errors.push(`${field} must be an object`);
      continue;
    }
    if (!VALID_STAGE_STATUS.has(result.status)) {
      errors.push(`${field}.status must be PASSED before the example can be [x]`);
    }
    const reportPath = requireEvidenceFile(result.report, bases, `${field}.report`, errors);
    if (reportPath && reportPath.endsWith(".json")) {
      try {
        readJson(reportPath);
      } catch (error) {
        errors.push(error.message);
      }
    }
  }
}

// Pending examples are allowed: they keep roadmap items at `[>]`. Once an
// example claims `verified` or `[x]`, every required stage must be backed by
// concrete run artifacts so the status cannot be advanced by editing JSON only.
function validateVerifiedExample(example, index, bases, errors) {
  const scope = `examples[${index}]`;
  if (example.status !== "verified" && example.roadmapStatus !== "[x]") {
    return false;
  }

  if (example.status !== "verified" || example.roadmapStatus !== "[x]") {
    errors.push(`${scope}: status=verified and roadmapStatus=[x] must be updated together`);
    return true;
  }
  if (example.verification?.status !== "PASSED") {
    errors.push(`${scope}.verification.status must be PASSED for verified examples`);
  }

  const evidence = example.verification?.evidence;
  if (!isObject(evidence)) {
    errors.push(`${scope}.verification.evidence is required for verified examples`);
    return true;
  }

  for (const field of ["validatedAt", "validatorCommand", "result", "runId", "manifest"]) {
    if (!nonEmptyString(evidence[field])) {
      errors.push(`${scope}.verification.evidence.${field} is required`);
    }
  }
  if (evidence.result !== "PASSED") {
    errors.push(`${scope}.verification.evidence.result must be PASSED`);
  }

  const manifestPath = requireEvidenceFile(
    evidence.manifest,
    bases,
    `${scope}.verification.evidence.manifest`,
    errors
  );
  if (manifestPath) {
    try {
      const manifest = readJson(manifestPath);
      if (manifest.runId !== evidence.runId) {
        errors.push(`${scope}.verification.evidence.runId must match manifest.runId`);
      }
      if (nonEmptyString(manifest.designId) && nonEmptyString(example.figma?.nodeId)) {
        const nodeIdKey = example.figma.nodeId.replace(":", "-");
        if (!manifest.designId.includes(nodeIdKey) && !manifest.designId.includes(example.figma.nodeId)) {
          errors.push(`${scope}: manifest.designId does not reference the example node id`);
        }
      }
    } catch (error) {
      errors.push(error.message);
    }
  }

  if (!Array.isArray(evidence.artifacts) || evidence.artifacts.length === 0) {
    errors.push(`${scope}.verification.evidence.artifacts must be a non-empty array`);
  } else {
    for (const artifact of evidence.artifacts) {
      const artifactPath = requireEvidenceFile(
        artifact,
        bases,
        `${scope}.verification.evidence.artifacts`,
        errors
      );
      if (artifactPath && artifactPath.endsWith(".json")) {
        try {
          readJson(artifactPath);
        } catch (error) {
          errors.push(error.message);
        }
      }
    }
  }

  validateStageEvidence(example, evidence, bases, scope, errors);
  return true;
}

const options = parseArgs(process.argv.slice(2));
if (!options.registryPath) {
  usage();
  process.exit(2);
}

const registryDir = path.dirname(options.registryPath);
const bases = [process.cwd(), registryDir, options.targetRoot].filter(Boolean);
const errors = [];
let registry;

try {
  registry = readJson(options.registryPath);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

if (!isObject(registry) || !Array.isArray(registry.examples)) {
  errors.push("registry.examples must be a non-empty array");
} else {
  let verifiedCount = 0;
  let pendingCount = 0;

  registry.examples.forEach((example, index) => {
    const scope = `examples[${index}]`;
    if (!VALID_REGISTRY_STATUSES.has(example.status)) {
      errors.push(`${scope}.status must be a real-run status`);
      return;
    }
    if (validateVerifiedExample(example, index, bases, errors)) {
      verifiedCount += 1;
    } else {
      pendingCount += 1;
    }
  });

  if (options.requireVerified && pendingCount > 0) {
    errors.push(`--require-verified expected all examples to be verified, got ${pendingCount} pending`);
  }

  if (errors.length === 0) {
    console.log(
      `OK ${path.relative(process.cwd(), options.registryPath)}: ${verifiedCount} verified, ${pendingCount} pending`
    );
  }
}

if (errors.length > 0) {
  console.error(`Real run evidence check failed: ${path.relative(process.cwd(), options.registryPath)}`);
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}
