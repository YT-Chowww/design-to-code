#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const candidateFields = {
  iconCandidates: ["confidence", "evidence"],
  chartCandidates: ["confidence", "evidence"],
  responsiveFrames: ["confidence", "evidence"],
  interactionStates: ["confidence", "evidence"]
};

function usage() {
  console.error("Usage: node scripts/check-extract-normalized.mjs <normalized.json>");
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

function hasNodeReference(item) {
  return typeof item.nodeId === "string" || Array.isArray(item.nodeIds) || typeof item.frameNodeId === "string";
}

function validateConfidence(field, index, item, errors) {
  if (typeof item.confidence !== "number" || item.confidence < 0 || item.confidence > 1) {
    errors.push(`${field}[${index}].confidence must be a number between 0 and 1`);
  }
}

function validateEvidence(field, index, item, errors) {
  if (!Array.isArray(item.evidence)) {
    errors.push(`${field}[${index}].evidence must be an array`);
  }
}

function validateCandidateArray(normalized, field, errors) {
  const value = normalized[field];
  if (value === undefined) {
    return;
  }

  if (!Array.isArray(value)) {
    errors.push(`${field} must be an array when present`);
    return;
  }

  for (const [index, item] of value.entries()) {
    if (!isObject(item)) {
      errors.push(`${field}[${index}] must be an object`);
      continue;
    }

    if (!hasNodeReference(item)) {
      errors.push(`${field}[${index}] must include nodeId, nodeIds, or frameNodeId`);
    }

    for (const requiredField of candidateFields[field]) {
      if (item[requiredField] === undefined) {
        errors.push(`${field}[${index}].${requiredField} is required`);
      }
    }

    validateConfidence(field, index, item, errors);
    validateEvidence(field, index, item, errors);
  }
}

function validateIconCandidate(item, index, errors) {
  if (item.kind !== undefined && !["svg", "vector", "component", "iconfont-text", "image", "unknown"].includes(item.kind)) {
    errors.push(`iconCandidates[${index}].kind is unsupported`);
  }
  if (item.nameCandidates !== undefined && !Array.isArray(item.nameCandidates)) {
    errors.push(`iconCandidates[${index}].nameCandidates must be an array when present`);
  }
}

function validateChartCandidate(item, index, errors) {
  if (item.chartType !== undefined && typeof item.chartType !== "string") {
    errors.push(`chartCandidates[${index}].chartType must be a string when present`);
  }
  if (item.series !== undefined && !Array.isArray(item.series)) {
    errors.push(`chartCandidates[${index}].series must be an array when present`);
  }
}

function validateResponsiveFrame(item, index, errors) {
  if (item.breakpoint !== undefined && !["desktop", "tablet", "mobile", "wide", "custom", "unknown"].includes(item.breakpoint)) {
    errors.push(`responsiveFrames[${index}].breakpoint is unsupported`);
  }
  for (const dimension of ["width", "height"]) {
    if (item[dimension] !== undefined && typeof item[dimension] !== "number") {
      errors.push(`responsiveFrames[${index}].${dimension} must be a number when present`);
    }
  }
  if (item.matchedFrameIds !== undefined && !Array.isArray(item.matchedFrameIds)) {
    errors.push(`responsiveFrames[${index}].matchedFrameIds must be an array when present`);
  }
}

function validateInteractionState(item, index, errors) {
  const supportedStates = ["default", "hover", "active", "disabled", "selected", "open", "focus", "pressed", "loading", "custom"];
  if (item.state !== undefined && !supportedStates.includes(item.state)) {
    errors.push(`interactionStates[${index}].state is unsupported`);
  }
  if (item.variantProperties !== undefined && !isObject(item.variantProperties)) {
    errors.push(`interactionStates[${index}].variantProperties must be an object when present`);
  }
}

function validateFallbackBoundaries(normalized, errors) {
  const mode = normalized.source?.mode;
  if (!["image-fallback", "manual"].includes(mode)) {
    return;
  }

  for (const field of ["responsiveFrames", "interactionStates"]) {
    for (const [index, item] of (normalized[field] ?? []).entries()) {
      if (item.confidence > 0.75) {
        errors.push(`${field}[${index}].confidence must be <= 0.75 in ${mode} mode unless rerun with structured data`);
      }
    }
  }
}

function validateScopeAssessment(normalized, errors) {
  const assessment = normalized.scopeAssessment;
  if (assessment === undefined) {
    return;
  }
  if (!isObject(assessment)) {
    errors.push("scopeAssessment must be an object when present");
    return;
  }
  for (const field of ["selectedNodeCoverage", "missingRequirements"]) {
    if (!Array.isArray(assessment[field])) {
      errors.push(`scopeAssessment.${field} must be an array`);
    }
  }
  if (!["verified", "partially-verified"].includes(assessment.verificationCeiling)) {
    errors.push("scopeAssessment.verificationCeiling must be verified or partially-verified");
  }
  if (typeof assessment.reason !== "string") {
    errors.push("scopeAssessment.reason must be a string");
  }
  if ((assessment.missingRequirements ?? []).length > 0 && assessment.verificationCeiling !== "partially-verified") {
    errors.push("scopeAssessment.verificationCeiling must be partially-verified when missingRequirements is not empty");
  }
}

function validateNormalized(normalized) {
  const errors = [];

  for (const field of ["designId", "runId"]) {
    if (typeof normalized[field] !== "string" || normalized[field].length === 0) {
      errors.push(`${field} must be a non-empty string`);
    }
  }

  if (!isObject(normalized.source)) {
    errors.push("source must be an object");
  }

  for (const field of Object.keys(candidateFields)) {
    validateCandidateArray(normalized, field, errors);
  }

  for (const [index, item] of (normalized.iconCandidates ?? []).entries()) {
    validateIconCandidate(item, index, errors);
  }
  for (const [index, item] of (normalized.chartCandidates ?? []).entries()) {
    validateChartCandidate(item, index, errors);
  }
  for (const [index, item] of (normalized.responsiveFrames ?? []).entries()) {
    validateResponsiveFrame(item, index, errors);
  }
  for (const [index, item] of (normalized.interactionStates ?? []).entries()) {
    validateInteractionState(item, index, errors);
  }

  validateFallbackBoundaries(normalized, errors);
  validateScopeAssessment(normalized, errors);

  return errors;
}

const args = process.argv.slice(2);
const normalizedArg = args.find((arg) => !arg.startsWith("--"));

if (!normalizedArg) {
  usage();
  process.exit(2);
}

const normalizedPath = path.resolve(process.cwd(), normalizedArg);
const normalized = readJson(normalizedPath);
const errors = validateNormalized(normalized);

if (errors.length > 0) {
  console.error(`Extract normalized check failed: ${normalizedArg}`);
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`Extract normalized check passed: ${normalizedArg}`);
