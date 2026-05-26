#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const [, , inputPath] = process.argv;

if (!inputPath) {
  console.error('Usage: node scripts/check-generate-decisions.mjs <decisions.json>');
  process.exit(2);
}

const filePath = path.resolve(inputPath);
const errors = [];

function readJson(targetPath) {
  try {
    return JSON.parse(fs.readFileSync(targetPath, 'utf8'));
  } catch (error) {
    errors.push(`failed to read JSON: ${error.message}`);
    return null;
  }
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function requireString(target, key, label) {
  if (typeof target?.[key] !== 'string' || target[key].trim() === '') {
    errors.push(`${label}.${key} must be a non-empty string`);
  }
}

function requireArray(target, key, label) {
  if (!Array.isArray(target?.[key])) {
    errors.push(`${label}.${key} must be an array`);
  }
}

function checkConfidence(value, label) {
  if (value === undefined) return;
  if (typeof value !== 'number' || value < 0 || value > 1) {
    errors.push(`${label}.confidence must be a number between 0 and 1`);
  }
}

function checkEvidence(value, label) {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    errors.push(`${label}.evidence must be an array when present`);
  }
}

function hasNodeRef(item) {
  return typeof item.nodeId === 'string' ||
    Array.isArray(item.nodeIds) ||
    typeof item.frameNodeId === 'string';
}

function checkDecisionArray(root, key, callback) {
  requireArray(root, key, 'root');
  if (!Array.isArray(root[key])) return;

  root[key].forEach((item, index) => {
    const label = `${key}[${index}]`;
    if (!isObject(item)) {
      errors.push(`${label} must be an object`);
      return;
    }
    if (!hasNodeRef(item)) {
      errors.push(`${label} must include nodeId, nodeIds, or frameNodeId`);
    }
    checkConfidence(item.confidence, label);
    checkEvidence(item.evidence, label);
    callback(item, label);
  });
}

const decisions = readJson(filePath);

if (decisions) {
  requireString(decisions, 'designId', 'root');
  requireString(decisions, 'runId', 'root');

  if (!isObject(decisions.source)) {
    errors.push('root.source must be an object');
  } else {
    requireString(decisions.source, 'provider', 'root.source');
    requireString(decisions.source, 'mode', 'root.source');
  }

  requireArray(decisions, 'tokenHints', 'root');
  requireArray(decisions, 'generatedFiles', 'root');

  checkDecisionArray(decisions, 'componentMappings', (item, label) => {
    const allowedSources = ['open-source-library', 'business-library', 'native', 'generated-component'];
    if (item.source !== undefined && !allowedSources.includes(item.source)) {
      errors.push(`${label}.source must be one of ${allowedSources.join(', ')}`);
    }
    if (typeof item.component !== 'string' || item.component.trim() === '') {
      errors.push(`${label}.component must be a non-empty string`);
    }
    if (!isObject(item.styleFit)) {
      errors.push(`${label}.styleFit must be an object`);
    } else {
      const score = item.styleFit.score;
      if (typeof score !== 'number' || score < 0 || score > 1) {
        errors.push(`${label}.styleFit.score must be a number between 0 and 1`);
      }
      if (typeof item.styleFit.decision !== 'string' || item.styleFit.decision.trim() === '') {
        errors.push(`${label}.styleFit.decision must be a non-empty string`);
      }
    }
  });

  checkDecisionArray(decisions, 'iconMappings', (item, label) => {
    const allowedSources = ['component-library-icon', 'iconfont', 'svg-fallback', 'image-fallback', 'placeholder'];
    if (item.source !== undefined && !allowedSources.includes(item.source)) {
      errors.push(`${label}.source must be one of ${allowedSources.join(', ')}`);
    }
    if (!item.name && !item.className && !item.assetRef && !item.fallback) {
      errors.push(`${label} must include name, className, assetRef, or fallback`);
    }
  });

  checkDecisionArray(decisions, 'chartMappings', (item, label) => {
    const allowedSources = ['open-source-library', 'business-library', 'native-svg-fallback', 'html-fallback'];
    if (item.source !== undefined && !allowedSources.includes(item.source)) {
      errors.push(`${label}.source must be one of ${allowedSources.join(', ')}`);
    }
    if (typeof item.chartType !== 'string' || item.chartType.trim() === '') {
      errors.push(`${label}.chartType must be a non-empty string`);
    }
    if (item.dataStatus !== undefined) {
      const allowedStatus = ['real-preview-data', 'estimated-preview-data', 'static-preview-data', 'pending-merge-data'];
      if (!allowedStatus.includes(item.dataStatus)) {
        errors.push(`${label}.dataStatus must be one of ${allowedStatus.join(', ')}`);
      }
    }
  });

  checkDecisionArray(decisions, 'responsiveRules', (item, label) => {
    const allowedStrategies = ['media-query', 'container-query', 'fluid-only', 'none'];
    if (item.strategy !== undefined && !allowedStrategies.includes(item.strategy)) {
      errors.push(`${label}.strategy must be one of ${allowedStrategies.join(', ')}`);
    }
    if (typeof item.selector !== 'string' || item.selector.trim() === '') {
      errors.push(`${label}.selector must be a non-empty string`);
    }
  });

  checkDecisionArray(decisions, 'stateMappings', (item, label) => {
    const allowedStrategies = ['component-prop', 'css-pseudo-class', 'state-class', 'local-state', 'default-only'];
    if (item.strategy !== undefined && !allowedStrategies.includes(item.strategy)) {
      errors.push(`${label}.strategy must be one of ${allowedStrategies.join(', ')}`);
    }
    if (typeof item.state !== 'string' || item.state.trim() === '') {
      errors.push(`${label}.state must be a non-empty string`);
    }
  });

  const degraded = ['image-fallback', 'manual'].includes(decisions.source?.mode);
  if (degraded) {
    for (const key of ['responsiveRules', 'stateMappings']) {
      for (const [index, item] of (decisions[key] || []).entries()) {
        if (typeof item.confidence === 'number' && item.confidence > 0.75) {
          errors.push(`${key}[${index}].confidence must be <= 0.75 in degraded source mode`);
        }
      }
    }
  }
}

if (errors.length > 0) {
  console.error('Generate decisions validation failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`Generate decisions validation passed: ${filePath}`);
