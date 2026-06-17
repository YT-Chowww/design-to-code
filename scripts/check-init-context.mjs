#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const contextDir = args.find((arg) => !arg.startsWith("--")) || ".d2c/context";
const strictAutofill = args.includes("--strict-autofill");

const files = {
  projectConfig: "project-config.json",
  designSystem: "design-system.json",
  componentLibrary: "component-library.json",
  projectAdapter: "project-adapter.json"
};

function readJson(fileName) {
  const filePath = path.resolve(contextDir, fileName);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing ${fileName}`);
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`Invalid JSON in ${fileName}: ${error.message}`);
  }
}

function hasObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function requireKeys(target, keys, label, errors) {
  for (const key of keys) {
    if (!(key in target)) {
      errors.push(`${label} missing key: ${key}`);
    }
  }
}

function requireArray(target, key, label, errors) {
  if (!Array.isArray(target[key])) {
    errors.push(`${label}.${key} must be an array`);
  }
}

const errors = [];
const warnings = [];

let projectConfig;
let designSystem;
let componentLibrary;
let projectAdapter;

try {
  projectConfig = readJson(files.projectConfig);
  designSystem = readJson(files.designSystem);
  componentLibrary = readJson(files.componentLibrary);
  projectAdapter = readJson(files.projectAdapter);
} catch (error) {
  errors.push(error.message);
}

if (errors.length === 0) {
  requireKeys(projectConfig, ["framework", "language", "buildTool", "cssStrategy", "componentLibrary", "paths"], "project-config", errors);

  requireKeys(designSystem, ["schemaVersion", "sourceType", "sources", "tokens", "tokenResolutionRules", "helpers", "rules"], "design-system", errors);
  requireArray(designSystem, "sources", "design-system", errors);
  requireArray(designSystem, "tokenResolutionRules", "design-system", errors);
  requireArray(designSystem, "helpers", "design-system", errors);

  if (hasObject(designSystem.tokens)) {
    for (const category of ["color", "spacing", "typography", "radius", "shadow", "breakpoint", "zIndex", "component"]) {
      requireArray(designSystem.tokens, category, "design-system.tokens", errors);
    }
  } else {
    errors.push("design-system.tokens must be an object");
  }

  const outputStrategy = designSystem.rules?.outputStrategyByCss;
  if (hasObject(outputStrategy)) {
    for (const strategy of ["less", "tailwind", "sass", "styled-components", "css-modules", "scoped", "css-variables", "default"]) {
      if (!outputStrategy[strategy]) {
        errors.push(`design-system.rules.outputStrategyByCss missing key: ${strategy}`);
      }
    }
  } else {
    errors.push("design-system.rules.outputStrategyByCss must be an object");
  }

  requireKeys(componentLibrary, ["schemaVersion", "library", "components", "projectComponents", "matchingRules", "componentSchema"], "component-library", errors);
  requireArray(componentLibrary, "components", "component-library", errors);
  for (const [index, component] of componentLibrary.components.entries()) {
    requireKeys(component, ["name", "importFrom", "patterns", "styleContract", "overridePolicy"], `component-library.components[${index}]`, errors);
    requireArray(component, "patterns", `component-library.components[${index}]`, errors);
  }

  requireKeys(projectAdapter, [
    "schemaVersion",
    "projectName",
    "repoType",
    "pathCandidates",
    "configCandidates",
    "tokenSources",
    "styleConventions",
    "aliasResolution",
    "mergeTargets",
    "validationCommands",
    "validationPolicy",
    "projectSpecifics"
  ], "project-adapter", errors);

  if (projectAdapter.validationPolicy?.targetScope !== "changed-files") {
    errors.push("project-adapter.validationPolicy.targetScope must be changed-files");
  }
  if (projectAdapter.validationPolicy?.changedFilesSource !== "merge-report") {
    errors.push("project-adapter.validationPolicy.changedFilesSource must be merge-report");
  }
  if (projectAdapter.validationPolicy?.projectWideChecks !== "optional-diagnostic") {
    errors.push("project-adapter.validationPolicy.projectWideChecks must be optional-diagnostic");
  }

  for (const group of ["components", "pages", "layouts", "assets", "styles"]) {
    if (projectAdapter.pathCandidates) {
      requireArray(projectAdapter.pathCandidates, group, "project-adapter.pathCandidates", errors);
    }
  }

  if (strictAutofill) {
    if (designSystem.sources.length === 0) {
      errors.push("strict-autofill: design-system.sources must not be empty");
    }
    if (!Object.values(designSystem.tokens).some((tokens) => Array.isArray(tokens) && tokens.length > 0)) {
      errors.push("strict-autofill: design-system.tokens must contain at least one token");
    }
    if (projectConfig.componentLibrary && projectConfig.componentLibrary !== "none" && componentLibrary.components.length === 0) {
      errors.push("strict-autofill: component-library.components must not be empty when a component library is detected");
    }
    if (!Object.values(projectAdapter.tokenSources || {}).some((sources) => Array.isArray(sources) && sources.length > 0)) {
      errors.push("strict-autofill: project-adapter.tokenSources must contain at least one source");
    }
    if (!Object.values(projectAdapter.mergeTargets || {}).some(Boolean)) {
      errors.push("strict-autofill: project-adapter.mergeTargets must contain at least one target");
    }
    if (Object.keys(projectAdapter.validationCommands || {}).length === 0) {
      warnings.push("strict-autofill: project-adapter.validationCommands is empty");
    }
  }
}

if (errors.length > 0) {
  console.error("Init context check failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Init context check passed");
if (warnings.length > 0) {
  console.log("Warnings:");
  for (const warning of warnings) {
    console.log(`- ${warning}`);
  }
}
