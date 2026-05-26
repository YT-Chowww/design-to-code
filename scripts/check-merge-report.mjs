#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const [, , reportPath] = process.argv;

if (!reportPath) {
  console.error('Usage: node scripts/check-merge-report.mjs <merge-report.json>');
  process.exit(2);
}

const validStatuses = new Set(['PASSED', 'FAILED', 'DEGRADED', 'SKIPPED']);
const validItemStatuses = new Set(['PASSED', 'FAILED', 'DEGRADED', 'SKIPPED', 'PARTIAL']);
const validDecisions = new Set([
  'use-target-library',
  'use-business-component',
  'use-project-iconfont',
  'use-icon-component',
  'use-svg-fallback',
  'use-image-fallback',
  'use-target-chart-wrapper',
  'use-preview-chart',
  'use-placeholder',
  'fallback-native',
  'fallback-preview',
  'preserve-existing-target-file',
  'rename',
  'skip',
]);
const validConflictTypes = new Set(['file', 'path', 'import', 'style', 'asset', 'token', 'component-props']);
const validConflictStatuses = new Set(['resolved', 'pending-user', 'skipped']);
const validIconStrategies = new Set(['icon-component', 'iconfont', 'svg-fallback', 'image-fallback']);
const validDataBindingStatuses = new Set(['bound', 'adapter-placeholder', 'manual-required', 'static-preview', 'skipped']);

const errors = [];

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    errors.push(`cannot read JSON: ${error.message}`);
    return null;
  }
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function optionalArray(value, name) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    errors.push(`${name} must be an array when present`);
    return [];
  }
  return value;
}

function requireString(item, field, scope) {
  if (!nonEmptyString(item[field])) {
    errors.push(`${scope}.${field} is required`);
  }
}

function checkDecision(item, scope) {
  requireString(item, 'decision', scope);
  if (nonEmptyString(item.decision) && !validDecisions.has(item.decision)) {
    errors.push(`${scope}.decision has unsupported value: ${item.decision}`);
  }
}

function checkStatus(value, scope, allowed = validItemStatuses) {
  if (value !== undefined && !allowed.has(value)) {
    errors.push(`${scope}.status has unsupported value: ${value}`);
  }
}

function hasEvidence(item) {
  return Array.isArray(item.evidence) && item.evidence.some(nonEmptyString);
}

function hasFallback(item) {
  return nonEmptyString(item.fallbackReason) || item.decision?.startsWith('fallback-') || item.decision === 'skip';
}

const report = readJson(reportPath);

if (report) {
  if (!isObject(report)) {
    errors.push('report root must be an object');
  } else {
    requireString(report, 'designId', 'report');
    requireString(report, 'runId', 'report');
    requireString(report, 'targetDirectory', 'report');

    if (!validStatuses.has(report.mergeStatus)) {
      errors.push('report.mergeStatus must be PASSED, FAILED, DEGRADED, or SKIPPED');
    }

    const mergedFiles = optionalArray(report.mergedFiles, 'mergedFiles');
    const resolvedTokens = optionalArray(report.resolvedTokens, 'resolvedTokens');
    const openSource = optionalArray(report.openSourceComponentMerges, 'openSourceComponentMerges');
    const business = optionalArray(report.businessComponentMerges, 'businessComponentMerges');
    const iconMerges = optionalArray(report.iconMerges, 'iconMerges');
    const chartMerges = optionalArray(report.chartMerges, 'chartMerges');
    const conflicts = optionalArray(report.conflictResolutions, 'conflictResolutions');

    if (report.mergeStatus === 'PASSED' && mergedFiles.length === 0) {
      errors.push('PASSED report must include at least one mergedFiles entry');
    }

    mergedFiles.forEach((item, index) => {
      const scope = `mergedFiles[${index}]`;
      if (!isObject(item)) {
        errors.push(`${scope} must be an object`);
        return;
      }
      requireString(item, 'sourcePath', scope);
      requireString(item, 'targetPath', scope);
      checkStatus(item.status, scope);
    });

    resolvedTokens.forEach((item, index) => {
      const scope = `resolvedTokens[${index}]`;
      if (!isObject(item)) {
        errors.push(`${scope} must be an object`);
        return;
      }
      requireString(item, 'rawValue', scope);
      requireString(item, 'strategy', scope);
      requireString(item, 'status', scope);
      if (item.status === 'resolved') {
        requireString(item, 'target', scope);
        if (!hasEvidence(item)) {
          errors.push(`${scope}.evidence is required for resolved token`);
        }
      }
      if (item.status === 'fallback-raw' && !nonEmptyString(item.fallbackReason)) {
        errors.push(`${scope}.fallbackReason is required for fallback-raw`);
      }
    });

    openSource.forEach((item, index) => {
      const scope = `openSourceComponentMerges[${index}]`;
      if (!isObject(item)) {
        errors.push(`${scope} must be an object`);
        return;
      }
      requireString(item, 'nodeId', scope);
      checkDecision(item, scope);
      checkStatus(item.status, scope);
      if (item.decision === 'use-target-library') {
        requireString(item, 'component', scope);
        requireString(item, 'importFrom', scope);
        if (typeof item.styleFitScore !== 'number' || item.styleFitScore < 0 || item.styleFitScore > 1) {
          errors.push(`${scope}.styleFitScore must be a number between 0 and 1`);
        }
        if (!hasEvidence(item)) {
          errors.push(`${scope}.evidence is required when using a target library`);
        }
      } else if (!hasFallback(item)) {
        errors.push(`${scope}.fallbackReason is required when not using a target library`);
      }
    });

    business.forEach((item, index) => {
      const scope = `businessComponentMerges[${index}]`;
      if (!isObject(item)) {
        errors.push(`${scope} must be an object`);
        return;
      }
      requireString(item, 'nodeId', scope);
      checkDecision(item, scope);
      checkStatus(item.status, scope);
      if (item.decision === 'use-business-component') {
        requireString(item, 'component', scope);
        requireString(item, 'importPath', scope);
        if (!isObject(item.propsMapping)) {
          errors.push(`${scope}.propsMapping is required when using a business component`);
        }
        if (!hasEvidence({ evidence: item.contractEvidence })) {
          errors.push(`${scope}.contractEvidence is required when using a business component`);
        }
        if (!validDataBindingStatuses.has(item.dataBindingStatus)) {
          errors.push(`${scope}.dataBindingStatus has unsupported value: ${item.dataBindingStatus}`);
        }
      } else if (!hasFallback(item)) {
        errors.push(`${scope}.fallbackReason is required when not using a business component`);
      }
    });

    iconMerges.forEach((item, index) => {
      const scope = `iconMerges[${index}]`;
      if (!isObject(item)) {
        errors.push(`${scope} must be an object`);
        return;
      }
      requireString(item, 'nodeId', scope);
      requireString(item, 'strategy', scope);
      checkDecision(item, scope);
      checkStatus(item.status, scope);
      if (!validIconStrategies.has(item.strategy)) {
        errors.push(`${scope}.strategy has unsupported value: ${item.strategy}`);
      }
      if (item.strategy === 'iconfont') {
        requireString(item, 'className', scope);
        if (!hasEvidence(item)) {
          errors.push(`${scope}.evidence is required for iconfont class selection`);
        }
      }
      if (item.strategy === 'icon-component') {
        requireString(item, 'component', scope);
        requireString(item, 'importFrom', scope);
      }
      if (item.strategy.endsWith('fallback')) {
        if (!nonEmptyString(item.assetPath) && !nonEmptyString(item.targetAssetPath)) {
          errors.push(`${scope}.assetPath or targetAssetPath is required for icon fallback`);
        }
        if (!nonEmptyString(item.fallbackReason)) {
          errors.push(`${scope}.fallbackReason is required for icon fallback`);
        }
      }
    });

    chartMerges.forEach((item, index) => {
      const scope = `chartMerges[${index}]`;
      if (!isObject(item)) {
        errors.push(`${scope} must be an object`);
        return;
      }
      requireString(item, 'nodeId', scope);
      requireString(item, 'chartType', scope);
      checkDecision(item, scope);
      checkStatus(item.status, scope);
      if (!validDataBindingStatuses.has(item.dataBindingStatus)) {
        errors.push(`${scope}.dataBindingStatus has unsupported value: ${item.dataBindingStatus}`);
      }
      if (item.decision === 'use-target-chart-wrapper') {
        requireString(item, 'library', scope);
        requireString(item, 'component', scope);
        requireString(item, 'importFrom', scope);
        requireString(item, 'optionPath', scope);
        requireString(item, 'dataAdapter', scope);
      } else if (!hasFallback(item)) {
        errors.push(`${scope}.fallbackReason is required when not using a target chart wrapper`);
      }
    });

    conflicts.forEach((item, index) => {
      const scope = `conflictResolutions[${index}]`;
      if (!isObject(item)) {
        errors.push(`${scope} must be an object`);
        return;
      }
      requireString(item, 'type', scope);
      requireString(item, 'source', scope);
      requireString(item, 'target', scope);
      requireString(item, 'strategy', scope);
      requireString(item, 'decision', scope);
      requireString(item, 'status', scope);
      if (!validConflictTypes.has(item.type)) {
        errors.push(`${scope}.type has unsupported value: ${item.type}`);
      }
      if (!validConflictStatuses.has(item.status)) {
        errors.push(`${scope}.status has unsupported value: ${item.status}`);
      }
      if (!Array.isArray(item.affectedFiles) || item.affectedFiles.length === 0) {
        errors.push(`${scope}.affectedFiles must include at least one file`);
      }
    });

    const requiredWhenFlagged = [
      ['requiresOpenSourceMerge', openSource, 'openSourceComponentMerges'],
      ['requiresBusinessMerge', business, 'businessComponentMerges'],
      ['requiresIconMerge', iconMerges, 'iconMerges'],
      ['requiresChartMerge', chartMerges, 'chartMerges'],
      ['hasConflicts', conflicts, 'conflictResolutions'],
    ];

    requiredWhenFlagged.forEach(([flag, items, name]) => {
      if (report[flag] === true && items.length === 0) {
        errors.push(`${name} must not be empty when ${flag} is true`);
      }
    });

    if (report.mergeStatus === 'PASSED') {
      const failedItems = [...mergedFiles, ...openSource, ...business, ...iconMerges, ...chartMerges]
        .filter((item) => item?.status === 'FAILED');
      const pendingConflicts = conflicts.filter((item) => item?.status === 'pending-user');
      if (failedItems.length > 0) {
        errors.push('PASSED report cannot include FAILED merge items');
      }
      if (pendingConflicts.length > 0) {
        errors.push('PASSED report cannot include pending-user conflicts');
      }
    }

    if (report.mergeStatus === 'SKIPPED' && !nonEmptyString(report.skipReason)) {
      errors.push('SKIPPED report must include skipReason');
    }
  }
}

if (errors.length > 0) {
  console.error(`Merge report check failed: ${path.resolve(reportPath)}`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`OK ${reportPath}`);
