#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const validStatuses = new Set([
  "planned",
  "registered-pending-verification",
  "partially-verified",
  "verified"
]);
const validRoadmapStatuses = new Set(["[ ]", "[~]", "[>]", "[x]"]);
const validVerificationStatuses = new Set(["PENDING", "PARTIAL", "PASSED", "FAILED", "SKIPPED", "DEGRADED"]);
const validStages = new Set([
  "extract",
  "generate",
  "preview-validate",
  "preview-verify",
  "merge",
  "target-validate",
  "target-verify"
]);

const [, , registryArg] = process.argv;

function usage() {
  console.error("Usage: node scripts/check-figma-examples.mjs <figma-examples.json>");
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`Cannot read JSON ${filePath}: ${error.message}`);
  }
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeNodeId(value) {
  return nonEmptyString(value) ? value.replace("-", ":") : "";
}

function parseFigmaUrl(value) {
  try {
    const url = new URL(value);
    const parts = url.pathname.split("/").filter(Boolean);
    const fileKey = parts[0] === "design" || parts[0] === "file" ? parts[1] : "";
    const nodeId = normalizeNodeId(url.searchParams.get("node-id") ?? "");
    return {
      isFigma: url.hostname === "www.figma.com" || url.hostname === "figma.com",
      fileKey,
      nodeId
    };
  } catch {
    return {
      isFigma: false,
      fileKey: "",
      nodeId: ""
    };
  }
}

function requireString(item, field, scope, errors) {
  if (!nonEmptyString(item[field])) {
    errors.push(`${scope}.${field} is required`);
  }
}

function requireArray(item, field, scope, errors) {
  if (!Array.isArray(item[field]) || item[field].length === 0) {
    errors.push(`${scope}.${field} must be a non-empty array`);
    return [];
  }
  return item[field];
}

function requireEvidenceFile(relativePath, scope, errors) {
  const filePath = path.resolve(process.cwd(), relativePath);
  if (!fs.existsSync(filePath)) {
    errors.push(`${scope}: missing evidence artifact ${relativePath}`);
    return;
  }
  const stat = fs.statSync(filePath);
  if (!stat.isFile() || stat.size === 0) {
    errors.push(`${scope}: empty or non-file evidence artifact ${relativePath}`);
  }
}

function validateVerificationEvidence(example, scope, errors) {
  if (example.roadmapStatus !== "[x]" && example.status !== "verified") {
    return;
  }

  if (example.roadmapStatus !== "[x]" || example.status !== "verified") {
    errors.push(`${scope}: verified examples must use status=verified and roadmapStatus=[x] together`);
    return;
  }

  if (example.verification?.status !== "PASSED") {
    errors.push(`${scope}.verification.status must be PASSED for [x] examples`);
  }
  if (example.requiresScopeAssessment === true) {
    const assessment = example.scopeAssessment;
    if (!isObject(assessment)) {
      errors.push(`${scope}.scopeAssessment is required when requiresScopeAssessment is true`);
    } else if ((assessment.missingRequirements ?? []).length > 0) {
      errors.push(`${scope}.scopeAssessment.missingRequirements must be empty for [x] examples`);
    }
  }

  const evidence = example.verification?.evidence;
  if (!isObject(evidence)) {
    errors.push(`${scope}.verification.evidence is required for [x] examples`);
    return;
  }

  for (const field of ["validatedAt", "validatorCommand", "result", "runId", "manifest"]) {
    if (!nonEmptyString(evidence[field])) {
      errors.push(`${scope}.verification.evidence.${field} is required`);
    }
  }
  if (evidence.result !== "PASSED") {
    errors.push(`${scope}.verification.evidence.result must be PASSED`);
  }

  const stageResults = evidence.stageResults;
  if (!isObject(stageResults)) {
    errors.push(`${scope}.verification.evidence.stageResults must be an object`);
  } else {
    for (const stage of example.requiredStages ?? []) {
      if (!isObject(stageResults[stage]) || stageResults[stage].status !== "PASSED") {
        errors.push(`${scope}.verification.evidence.stageResults.${stage}.status must be PASSED`);
      }
      if (!nonEmptyString(stageResults[stage]?.report)) {
        errors.push(`${scope}.verification.evidence.stageResults.${stage}.report is required`);
      }
    }
  }

  if (!Array.isArray(evidence.artifacts) || evidence.artifacts.length === 0) {
    errors.push(`${scope}.verification.evidence.artifacts must be a non-empty array`);
  } else {
    for (const artifact of evidence.artifacts) {
      if (!nonEmptyString(artifact)) {
        errors.push(`${scope}.verification.evidence.artifacts must contain non-empty paths`);
      } else {
        requireEvidenceFile(artifact, `${scope}.verification.evidence`, errors);
      }
    }
  }

  if (nonEmptyString(evidence.manifest)) {
    requireEvidenceFile(evidence.manifest, `${scope}.verification.evidence`, errors);
  }
}

function validateExample(example, index, seenKeys, errors) {
  const scope = `examples[${index}]`;

  if (!isObject(example)) {
    errors.push(`${scope} must be an object`);
    return;
  }

  for (const field of ["slug", "roadmapName", "roadmapStatus", "status"]) {
    requireString(example, field, scope, errors);
  }

  if (nonEmptyString(example.status) && !validStatuses.has(example.status)) {
    errors.push(`${scope}.status has unsupported value: ${example.status}`);
  }

  if (nonEmptyString(example.roadmapStatus) && !validRoadmapStatuses.has(example.roadmapStatus)) {
    errors.push(`${scope}.roadmapStatus has unsupported value: ${example.roadmapStatus}`);
  }

  if (!isObject(example.figma)) {
    errors.push(`${scope}.figma must be an object`);
  } else {
    for (const field of ["title", "url", "fileKey", "nodeId"]) {
      requireString(example.figma, field, `${scope}.figma`, errors);
    }

    const parsed = parseFigmaUrl(example.figma.url);
    if (!parsed.isFigma) {
      errors.push(`${scope}.figma.url must be a figma.com URL`);
    }
    if (nonEmptyString(example.figma.fileKey) && parsed.fileKey !== example.figma.fileKey) {
      errors.push(`${scope}.figma.fileKey does not match URL`);
    }
    if (nonEmptyString(example.figma.nodeId) && parsed.nodeId !== example.figma.nodeId) {
      errors.push(`${scope}.figma.nodeId does not match URL node-id`);
    }
    if (!parsed.nodeId) {
      errors.push(`${scope}.figma.url must include node-id`);
    }

    const uniqueKey = `${example.figma.fileKey}:${example.figma.nodeId}`;
    if (seenKeys.has(uniqueKey)) {
      errors.push(`${scope}.figma duplicates another registered node: ${uniqueKey}`);
    }
    seenKeys.add(uniqueKey);

    if (example.figma.relatedNodes !== undefined) {
      if (!Array.isArray(example.figma.relatedNodes)) {
        errors.push(`${scope}.figma.relatedNodes must be an array when present`);
      } else {
        for (const [relatedIndex, related] of example.figma.relatedNodes.entries()) {
          const relatedScope = `${scope}.figma.relatedNodes[${relatedIndex}]`;
          if (!isObject(related)) {
            errors.push(`${relatedScope} must be an object`);
            continue;
          }
          for (const field of ["role", "url", "nodeId"]) {
            requireString(related, field, relatedScope, errors);
          }
          const parsedRelated = parseFigmaUrl(related.url);
          if (!parsedRelated.isFigma) {
            errors.push(`${relatedScope}.url must be a figma.com URL`);
          }
          if (parsedRelated.fileKey !== example.figma.fileKey) {
            errors.push(`${relatedScope}.url file key must match figma.fileKey`);
          }
          if (normalizeNodeId(related.nodeId) !== parsedRelated.nodeId) {
            errors.push(`${relatedScope}.nodeId does not match URL node-id`);
          }
          const relatedKey = `${example.figma.fileKey}:${normalizeNodeId(related.nodeId)}`;
          if (seenKeys.has(relatedKey)) {
            errors.push(`${relatedScope} duplicates another registered node: ${relatedKey}`);
          }
          seenKeys.add(relatedKey);
        }
      }
    }
  }

  requireArray(example, "coverage", scope, errors);
  requireArray(example, "designRequirements", scope, errors);

  for (const stage of requireArray(example, "requiredStages", scope, errors)) {
    if (!validStages.has(stage)) {
      errors.push(`${scope}.requiredStages contains unsupported stage: ${stage}`);
    }
  }

  if (typeof example.targetProjectRequired !== "boolean") {
    errors.push(`${scope}.targetProjectRequired must be a boolean`);
  }
  if (example.targetProjectRequired && !nonEmptyString(example.targetProjectStatus)) {
    errors.push(`${scope}.targetProjectStatus is required when targetProjectRequired is true`);
  }

  if (!isObject(example.verification)) {
    errors.push(`${scope}.verification must be an object`);
  } else {
    requireString(example.verification, "status", `${scope}.verification`, errors);
    if (
      nonEmptyString(example.verification.status) &&
      !validVerificationStatuses.has(example.verification.status)
    ) {
      errors.push(`${scope}.verification.status has unsupported value: ${example.verification.status}`);
    }
  }
  validateVerificationEvidence(example, scope, errors);

  if (example.requiresScopeAssessment !== undefined && typeof example.requiresScopeAssessment !== "boolean") {
    errors.push(`${scope}.requiresScopeAssessment must be a boolean when present`);
  }
  if (example.requiresScopeAssessment === true) {
    const assessment = example.scopeAssessment;
    if (!isObject(assessment)) {
      errors.push(`${scope}.scopeAssessment is required when requiresScopeAssessment is true`);
    } else {
      if (!Array.isArray(assessment.selectedNodeCoverage)) {
        errors.push(`${scope}.scopeAssessment.selectedNodeCoverage must be an array`);
      }
      if (!Array.isArray(assessment.missingRequirements)) {
        errors.push(`${scope}.scopeAssessment.missingRequirements must be an array`);
      }
      if (!["verified", "partially-verified"].includes(assessment.verificationCeiling)) {
        errors.push(`${scope}.scopeAssessment.verificationCeiling must be verified or partially-verified`);
      }
      if ((assessment.missingRequirements ?? []).length > 0 && assessment.verificationCeiling !== "partially-verified") {
        errors.push(`${scope}.scopeAssessment.verificationCeiling must be partially-verified when requirements are missing`);
      }
    }
  }

  if (example.roadmapStatus === "[>]" && example.status === "planned") {
    errors.push(`${scope} cannot have roadmapStatus [>] while status is planned`);
  }
}

if (!registryArg) {
  usage();
  process.exit(2);
}

const registryPath = path.resolve(process.cwd(), registryArg);
const registry = readJson(registryPath);
const errors = [];

if (!isObject(registry)) {
  errors.push("registry root must be an object");
} else {
  if (registry.version !== 1) {
    errors.push("registry.version must be 1");
  }
  if (!Array.isArray(registry.examples) || registry.examples.length === 0) {
    errors.push("registry.examples must be a non-empty array");
  } else {
    const seenKeys = new Set();
    registry.examples.forEach((example, index) => validateExample(example, index, seenKeys, errors));
  }
  if (registry.deferredExamples !== undefined && !Array.isArray(registry.deferredExamples)) {
    errors.push("registry.deferredExamples must be an array when present");
  }
}

if (errors.length > 0) {
  console.error(`Figma example registry check failed: ${registryPath}`);
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`OK ${registryPath}`);
