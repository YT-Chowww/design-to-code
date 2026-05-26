#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const VALID_PHASES = new Set(["preview", "target"]);
const VALID_OVERALL = new Set(["PASSED", "FAILED", "DEGRADED", "SKIPPED"]);
const VALID_ITEM_STATUS = new Set(["PASSED", "FAILED", "DEGRADED", "SKIPPED", "PARTIAL"]);
const VALID_MCP_STATUS = new Set(["AVAILABLE", "PARTIAL", "MISSING_CONFIG", "MISSING_SERVER", "FAILED", "SKIPPED"]);
const REQUIRED_TOOLS = ["navigate", "screenshot", "resize"];
const DIFF_CATEGORIES = new Set(["layout", "typography", "color", "component"]);
const STATES = new Set(["default", "hover", "active", "disabled", "selected", "open", "focus", "loading"]);

function usage() {
  console.error("Usage: node scripts/check-verify-report.mjs <verification-report.json>");
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

function requireString(report, field, errors) {
  if (typeof report[field] !== "string" || report[field].trim() === "") {
    errors.push(`${field} must be a non-empty string`);
  }
}

function validateStatus(value, validStatuses, field, errors) {
  if (!validStatuses.has(value)) {
    errors.push(`${field} must be one of ${Array.from(validStatuses).join(", ")}`);
  }
}

function validateViewport(viewport, field, errors) {
  if (!isObject(viewport)) {
    errors.push(`${field} must be an object`);
    return;
  }

  for (const key of ["width", "height"]) {
    if (!Number.isFinite(viewport[key]) || viewport[key] <= 0) {
      errors.push(`${field}.${key} must be a positive number`);
    }
  }
}

function validateMcpProbe(mcpProbe, report, errors) {
  if (!isObject(mcpProbe)) {
    errors.push("mcpProbe must be an object");
    return;
  }

  requireString(mcpProbe, "fallbackManualUrl", errors);
  validateStatus(mcpProbe.status, VALID_MCP_STATUS, "mcpProbe.status", errors);

  if (mcpProbe.status === "AVAILABLE" || mcpProbe.status === "PARTIAL") {
    requireString(mcpProbe, "configPath", errors);
    requireString(mcpProbe, "serverName", errors);
    if (!Array.isArray(mcpProbe.tools)) {
      errors.push("mcpProbe.tools must be an array");
    } else {
      for (const tool of REQUIRED_TOOLS) {
        if (!mcpProbe.tools.some((name) => String(name).toLowerCase().includes(tool))) {
          errors.push(`mcpProbe.tools must include a ${tool}-capable tool when MCP is ${mcpProbe.status}`);
        }
      }
    }
  }

  if (mcpProbe.status !== "AVAILABLE" && report.overallStatus === "PASSED") {
    errors.push("overallStatus cannot be PASSED when Chrome MCP probe is not AVAILABLE");
  }

  if (mcpProbe.status !== "AVAILABLE" && typeof mcpProbe.reason !== "string" && !Array.isArray(mcpProbe.missingTools)) {
    errors.push("mcpProbe.reason or mcpProbe.missingTools is required when MCP is not AVAILABLE");
  }
}

function validateScreenshot(item, index, errors) {
  const field = `screenshots[${index}]`;
  if (!isObject(item)) {
    errors.push(`${field} must be an object`);
    return;
  }

  requireString(item, "breakpoint", errors);
  validateViewport(item.viewport, `${field}.viewport`, errors);
  validateStatus(item.status, VALID_ITEM_STATUS, `${field}.status`, errors);

  if (item.status === "SKIPPED") {
    if (typeof item.reason !== "string" || item.reason.trim() === "") {
      errors.push(`${field}.reason is required when status is SKIPPED`);
    }
    return;
  }

  for (const key of ["referenceImagePath", "actualImagePath", "diffImagePath"]) {
    if (typeof item[key] !== "string" || item[key].trim() === "") {
      errors.push(`${field}.${key} must be a non-empty string when screenshot is not SKIPPED`);
    }
  }

  if (!Number.isFinite(item.score) || item.score < 0 || item.score > 100) {
    errors.push(`${field}.score must be a number from 0 to 100`);
  }
}

function validateStateCheck(item, index, errors) {
  const field = `stateChecks[${index}]`;
  if (!isObject(item)) {
    errors.push(`${field} must be an object`);
    return;
  }

  if (!STATES.has(item.state)) {
    errors.push(`${field}.state must be one of ${Array.from(STATES).join(", ")}`);
  }
  validateStatus(item.status, VALID_ITEM_STATUS, `${field}.status`, errors);

  if (item.status === "SKIPPED") {
    if (typeof item.reason !== "string" || item.reason.trim() === "") {
      errors.push(`${field}.reason is required when status is SKIPPED`);
    }
    return;
  }

  requireString(item, "trigger", errors);
  requireString(item, "actualImagePath", errors);
  if (!Number.isFinite(item.score) || item.score < 0 || item.score > 100) {
    errors.push(`${field}.score must be a number from 0 to 100`);
  }
}

function validateDiff(diff, report, errors) {
  if (!isObject(diff)) {
    errors.push("diff must be an object");
    return;
  }

  validateStatus(diff.status, VALID_ITEM_STATUS, "diff.status", errors);

  if (!Number.isFinite(diff.pixelRatio) || diff.pixelRatio < 0) {
    errors.push("diff.pixelRatio must be a non-negative number");
  }

  if (!Array.isArray(diff.regions)) {
    errors.push("diff.regions must be an array");
    return;
  }

  diff.regions.forEach((region, index) => {
    const field = `diff.regions[${index}]`;
    if (!isObject(region)) {
      errors.push(`${field} must be an object`);
      return;
    }
    if (!DIFF_CATEGORIES.has(region.category)) {
      errors.push(`${field}.category must be one of ${Array.from(DIFF_CATEGORIES).join(", ")}`);
    }
    if (!isObject(region.bounds)) {
      errors.push(`${field}.bounds must be an object`);
    } else {
      for (const key of ["x", "y", "width", "height"]) {
        if (!Number.isFinite(region.bounds[key])) {
          errors.push(`${field}.bounds.${key} must be a number`);
        }
      }
    }
  });

  const hasDiffImage = report.screenshots?.some((item) => item.status !== "SKIPPED" && item.diffImagePath);
  const humanPassed = report.humanReview?.status === "PASSED";
  if (report.overallStatus === "PASSED" && !hasDiffImage && !humanPassed) {
    errors.push("overallStatus PASSED requires a diff image or humanReview.status PASSED");
  }
}

function validateReport(report) {
  const errors = [];

  ["designId", "runId", "url"].forEach((field) => requireString(report, field, errors));
  if (!VALID_PHASES.has(report.phase)) {
    errors.push("phase must be preview or target");
  }
  validateStatus(report.overallStatus, VALID_OVERALL, "overallStatus", errors);

  validateMcpProbe(report.mcpProbe, report, errors);

  if (!isObject(report.thresholds)) {
    errors.push("thresholds must be an object");
  } else {
    if (!Number.isFinite(report.thresholds.pixelRatio) || report.thresholds.pixelRatio < 0) {
      errors.push("thresholds.pixelRatio must be a non-negative number");
    }
    if (!Number.isFinite(report.thresholds.overallScore) || report.thresholds.overallScore <= 0) {
      errors.push("thresholds.overallScore must be a positive number");
    }
  }

  if (!Array.isArray(report.screenshots) || report.screenshots.length === 0) {
    errors.push("screenshots must be a non-empty array");
  } else {
    report.screenshots.forEach((item, index) => validateScreenshot(item, index, errors));
    if (report.overallStatus === "PASSED" && report.screenshots.some((item) => item.status === "FAILED")) {
      errors.push("overallStatus cannot be PASSED when a screenshot FAILED");
    }
    if (report.overallStatus === "PASSED" && report.screenshots.every((item) => item.status === "SKIPPED")) {
      errors.push("overallStatus cannot be PASSED when all screenshots are SKIPPED");
    }
    const breakpoints = new Set(report.screenshots.map((item) => item.breakpoint));
    if (report.requiresResponsive === true) {
      for (const breakpoint of ["desktop", "tablet", "mobile"]) {
        if (!breakpoints.has(breakpoint)) {
          errors.push(`screenshots must include ${breakpoint} when requiresResponsive is true`);
        }
      }
    }
  }

  if (!Array.isArray(report.stateChecks)) {
    errors.push("stateChecks must be an array");
  } else {
    report.stateChecks.forEach((item, index) => validateStateCheck(item, index, errors));
    if (report.requiresStates === true) {
      const states = new Set(report.stateChecks.map((item) => item.state));
      if (!states.has("default")) {
        errors.push("stateChecks must include default when requiresStates is true");
      }
    }
    if (report.overallStatus === "PASSED" && report.stateChecks.some((item) => item.status === "FAILED")) {
      errors.push("overallStatus cannot be PASSED when a state check FAILED");
    }
  }

  validateDiff(report.diff, report, errors);

  return errors;
}

const reportArg = process.argv[2];
if (!reportArg) {
  usage();
  process.exit(1);
}

const reportPath = path.resolve(process.cwd(), reportArg);
let report;

try {
  report = readJson(reportPath);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const errors = validateReport(report);
if (errors.length > 0) {
  console.error(`Verify report check failed: ${reportArg}`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`OK ${reportArg}`);
