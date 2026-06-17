#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const VALID_PHASES = new Set(["preview", "target"]);
const VALID_PACKAGE_MANAGERS = new Set(["npm", "pnpm", "yarn"]);
const VALID_SOURCES = new Set([
  "package-script",
  "project-adapter",
  "project-config",
  "merge-report",
  "framework-default",
  "missing"
]);
const VALID_CHECK_STATUSES = new Set(["PASSED", "FAILED", "DEGRADED", "SKIPPED", "PARTIAL"]);
const VALID_SERVER_STATUSES = new Set(["Running", "Failed", "NEEDS_MANUAL_START", "SKIPPED"]);
const VALID_OVERALL = new Set(["PASSED", "FAILED", "DEGRADED", "SKIPPED"]);
const REQUIRED_CHECKS = ["typeCheck", "lint", "format", "stylelint", "build", "devServer"];

function usage() {
  console.error("Usage: node scripts/check-validate-report.mjs <validation-report.json>");
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

function validateCommandEntry(entry, field, errors, options = {}) {
  if (!isObject(entry)) {
    errors.push(`${field} must be an object`);
    return;
  }

  if (!VALID_SOURCES.has(entry.source)) {
    errors.push(`${field}.source must be one of ${Array.from(VALID_SOURCES).join(", ")}`);
  }

  if (entry.source === "missing") {
    if (typeof entry.reason !== "string" || entry.reason.trim() === "") {
      errors.push(`${field}.reason is required when source is missing`);
    }
    if (entry.command !== undefined && String(entry.command).trim() !== "") {
      errors.push(`${field}.command must be empty when source is missing`);
    }
    return;
  }

  if (typeof entry.command !== "string" || entry.command.trim() === "") {
    errors.push(`${field}.command is required when source is ${entry.source}`);
  }

  if (options.requireRealSource && entry.source === "framework-default") {
    errors.push(`${field}.source must prefer real target project commands before framework-default`);
  }
}

function validateCheck(check, name, report, errors) {
  const field = `checks.${name}`;
  if (!isObject(check)) {
    errors.push(`${field} must be an object`);
    return;
  }

  const validStatuses = name === "devServer" ? VALID_SERVER_STATUSES : VALID_CHECK_STATUSES;
  if (!validStatuses.has(check.status)) {
    errors.push(`${field}.status must be one of ${Array.from(validStatuses).join(", ")}`);
  }

  validateCommandEntry(check, field, errors, {
    requireRealSource: report.phase === "target" && ["typeCheck", "build", "lint", "format", "stylelint"].includes(name)
  });

  if (["lint", "format", "stylelint"].includes(name) && check.status === "SKIPPED") {
    if (typeof check.reason !== "string" || check.reason.trim() === "") {
      errors.push(`${field}.reason is required when optional check is SKIPPED`);
    }
  }

  if (check.source === "missing" && check.status !== "SKIPPED" && name !== "devServer") {
    errors.push(`${field}.status must be SKIPPED when source is missing`);
  }

  if (name === "devServer" && check.source === "missing" && check.status !== "NEEDS_MANUAL_START" && check.status !== "SKIPPED") {
    errors.push(`${field}.status must be NEEDS_MANUAL_START or SKIPPED when source is missing`);
  }
}

function validateReport(report) {
  const errors = [];

  ["designId", "runId", "framework", "language", "buildTool", "targetDirectory"].forEach((field) => {
    requireString(report, field, errors);
  });

  if (!VALID_PHASES.has(report.phase)) {
    errors.push("phase must be preview or target");
  }

  if (!VALID_PACKAGE_MANAGERS.has(report.packageManager)) {
    errors.push("packageManager must be npm, pnpm, or yarn");
  }

  if (!VALID_OVERALL.has(report.overallStatus)) {
    errors.push("overallStatus must be PASSED, FAILED, DEGRADED, or SKIPPED");
  }

  if (report.phase === "target") {
    if (!isObject(report.validationScope)) {
      errors.push("target validationScope must be an object");
    } else {
      if (report.validationScope.mode !== "changed-files") {
        errors.push("target validationScope.mode must be changed-files");
      }
      if (report.validationScope.source !== "merge-report") {
        errors.push("target validationScope.source must be merge-report");
      }
      if (!Array.isArray(report.validationScope.files) || report.validationScope.files.length === 0) {
        errors.push("target validationScope.files must be a non-empty array");
      } else if (report.validationScope.files.some((file) => typeof file !== "string" || file.trim() === "")) {
        errors.push("target validationScope.files entries must be non-empty strings");
      }
    }
  }

  if (!isObject(report.commandMatrix)) {
    errors.push("commandMatrix must be an object");
  } else {
    REQUIRED_CHECKS.forEach((name) => {
      validateCommandEntry(report.commandMatrix[name], `commandMatrix.${name}`, errors, {
        requireRealSource: report.phase === "target" && ["typeCheck", "build", "lint", "format", "stylelint"].includes(name)
      });
    });
  }

  if (!isObject(report.checks)) {
    errors.push("checks must be an object");
  } else {
    REQUIRED_CHECKS.forEach((name) => validateCheck(report.checks[name], name, report, errors));

    const targetBuild = report.checks.build;
    const targetTypeCheck = report.checks.typeCheck;
    if (report.phase === "target") {
      if (targetBuild?.status === "FAILED" && report.overallStatus === "PASSED") {
        errors.push("target build FAILED cannot have overallStatus PASSED");
      }
      if (targetBuild?.source === "missing" && targetBuild?.status !== "SKIPPED") {
        errors.push("target scoped build must be SKIPPED when source is missing");
      }
      if (["FAILED", "DEGRADED"].includes(targetTypeCheck?.status) && report.overallStatus === "PASSED") {
        errors.push("target typeCheck failed/degraded cannot have overallStatus PASSED");
      }
    }
  }

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
  console.error(`Validate report check failed: ${reportArg}`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`OK ${reportArg}`);
