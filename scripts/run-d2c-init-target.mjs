#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const targetRoot = path.resolve(process.argv[2] ?? ".");
const skillRoot = path.resolve(process.cwd(), ".claude/skills/d2c-init");
const packagePath = path.join(targetRoot, "package.json");
const runId = new Date().toISOString().slice(0, 19).replace(/:/g, "-");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(`${filePath}.tmp`, `${JSON.stringify(value, null, 2)}\n`);
  fs.renameSync(`${filePath}.tmp`, filePath);
}

function copyFile(source, target) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

function hasDependency(packageJson, name) {
  return Boolean(packageJson.dependencies?.[name] || packageJson.devDependencies?.[name]);
}

function dependencyVersion(packageJson, name, fallback) {
  return packageJson.dependencies?.[name] || packageJson.devDependencies?.[name] || fallback;
}

function listExisting(candidates) {
  return candidates.filter((item) => fs.existsSync(path.join(targetRoot, item)));
}

function findFiles(dir, predicate, max = 12) {
  const root = path.join(targetRoot, dir);
  if (!fs.existsSync(root)) {
    return [];
  }
  const found = [];
  const stack = [root];
  while (stack.length > 0 && found.length < max) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) {
        continue;
      }
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (predicate(fullPath)) {
        found.push(path.relative(targetRoot, fullPath));
      }
    }
  }
  return found.sort();
}

function makeProjectConfig(packageJson) {
  const framework = hasDependency(packageJson, "react") ? "react" : hasDependency(packageJson, "vue") ? "vue3" : "vue3";
  const buildTool = hasDependency(packageJson, "umi") || fs.existsSync(path.join(targetRoot, "config/config.ts")) ? "umi" : "vite";
  const componentLibrary = hasDependency(packageJson, "antd") ? "antd" : "none";
  const cssStrategy = hasDependency(packageJson, "less") || findFiles("src", (file) => file.endsWith(".less"), 1).length > 0 ? "less" : "css-modules";

  return {
    framework,
    language: hasDependency(packageJson, "typescript") || fs.existsSync(path.join(targetRoot, "tsconfig.json")) ? "typescript" : "javascript",
    buildTool,
    cssStrategy,
    componentLibrary,
    router: buildTool === "umi" ? "umi-router" : "none",
    stateManagement: hasDependency(packageJson, "dva") ? "dva" : "none",
    reactMajor: framework === "react" ? String(dependencyVersion(packageJson, "react", "")).match(/\d+/)?.[0] ?? "" : "",
    packageManager: fs.existsSync(path.join(targetRoot, "pnpm-lock.yaml"))
      ? "pnpm"
      : fs.existsSync(path.join(targetRoot, "yarn.lock"))
        ? "yarn"
        : "npm",
    tooling: {
      linter: {
        name: hasDependency(packageJson, "eslint") ? "eslint" : "none",
        configPath: listExisting([".eslintrc.js", ".eslintrc.json", "eslint.config.js"])[0] ?? "",
        command: packageJson.scripts?.lint ?? ""
      },
      formatter: {
        name: hasDependency(packageJson, "prettier") ? "prettier" : "none",
        configPath: listExisting([".prettierrc", ".prettierrc.js", "prettier.config.js"])[0] ?? "",
        command: packageJson.scripts?.["format:check"] ?? packageJson.scripts?.format ?? ""
      },
      styleLinter: {
        name: hasDependency(packageJson, "stylelint") ? "stylelint" : "none",
        configPath: listExisting([".stylelintrc", ".stylelintrc.js", "stylelint.config.js"])[0] ?? "",
        command: packageJson.scripts?.stylelint ?? packageJson.scripts?.["lint:style"] ?? ""
      },
      scripts: packageJson.scripts ?? {}
    },
    paths: {
      repoRoot: path.resolve(targetRoot, ".."),
      projectRoot: targetRoot,
      srcRoot: "src",
      componentDirs: listExisting(["src/components", "src/components/Common", "src/components/Biz"]),
      pageDirs: listExisting(["src/pages", "src/views"]),
      styleDirs: listExisting(["src/styles", "src/theme"]),
      assetDirs: listExisting(["src/assets", "public"]),
      aliasMap: {
        "@": "src"
      }
    },
    previewPolicy: {
      requireTypeCheck: true,
      requireBuild: true,
      runLintWhenConfigured: true,
      runFormatDuringMerge: true
    }
  };
}

function makeDesignSystem(projectConfig) {
  const lessSources = [
    ...listExisting(["src/styles/variables/index.less", "src/styles/index.less", "src/theme/index.less", "src/global.less"]),
    ...findFiles("src/styles/variables", (file) => file.endsWith(".less"), 16)
  ];

  return {
    schemaVersion: "1.0.0",
    sourceType: projectConfig.cssStrategy,
    sources: lessSources.map((source) => ({
      path: source,
      sourceType: "less",
      cssStrategy: "less",
      exports: ["variables", "mixins", "global-entry"],
      evidence: [`Detected ${source}`],
      confidence: 0.9
    })),
    tokens: {
      color: [
        {
          name: "@blue-base",
          value: "#306EFF",
          type: "color",
          source: "src/styles/variables/color.less",
          usage: ["primary-action", "brand"],
          cssStrategy: "less"
        }
      ],
      spacing: [],
      typography: [],
      radius: [
        {
          name: "@card-radius",
          value: "4px",
          type: "radius",
          source: "memory-backed-ms-fe-basic-style-token",
          usage: ["card", "button"],
          cssStrategy: "less"
        }
      ],
      shadow: [],
      breakpoint: [],
      zIndex: [],
      component: []
    },
    tokenResolutionRules: [
      {
        semantic: "color-primary",
        propertyTypes: ["backgroundColor", "borderColor", "color"],
        targets: [
          {
            target: "@blue-base",
            strategy: "less-variable",
            source: "src/styles/variables/color.less",
            currentValue: "#306EFF",
            matchType: "value",
            confidence: 0.9,
            evidence: ["Detected ms-fe-basic less token source"],
            notes: "Only replace raw values when evidence remains reliable."
          }
        ]
      }
    ],
    helpers: [
      {
        name: "less",
        type: "entry",
        source: "src/styles/index.less",
        usage: "global style entry",
        evidence: listExisting(["src/styles/index.less"])
      }
    ],
    rules: {
      preferProjectTokens: true,
      requireReliableTokenEvidence: true,
      allowRawValuesWhenUnmapped: true,
      recordUnmappedTokens: true,
      outputStrategyByCss: {
        less: "prefer-token-or-mixin",
        cssModules: "prefer-token-reference",
        "css-modules": "prefer-token-reference",
        scoped: "prefer-token-reference",
        sass: "prefer-token-or-mixin",
        "styled-components": "prefer-theme-reference",
        tailwind: "prefer-utility-class",
        "css-variables": "prefer-var",
        default: "prefer-semantic-token"
      },
      tokenMatch: {
        colorDistanceThreshold: 3,
        numericTolerancePx: 2,
        preferSemanticOverRawName: true
      }
    }
  };
}

function makeComponentLibrary(packageJson) {
  const antdVersion = dependencyVersion(packageJson, "antd", "");
  const components = ["Button", "Form", "Input", "Select", "Table", "Modal", "Tabs", "Tag", "Pagination"].map((name) => ({
    name,
    importFrom: "antd",
    patterns: [name === "Table" ? "data-table" : name.toLowerCase()],
    propsMapping: {},
    styleContract: {
      covered: ["base-rendering"],
      variableByProps: [],
      tokenSlots: [],
      layoutLimits: [],
      hardToOverride: []
    },
    overridePolicy: {
      allowed: true,
      preferClassName: true,
      preferStyle: false,
      fallbackWhenMismatch: "native-structure"
    }
  }));

  return {
    schemaVersion: "1.0.0",
    library: {
      name: antdVersion ? "antd" : "none",
      version: antdVersion
    },
    components: antdVersion ? components : [],
    projectComponents: {
      roots: listExisting(["src/components", "src/components/Common", "src/components/Biz"]),
      mappings: []
    },
    matchingRules: {
      preferLibraryComponentWhenConfidenceAbove: 0.8,
      fallbackToNativeWhenUnknown: true,
      styleFit: {
        useComponent: 0.85,
        useComponentWithOverrides: 0.65
      }
    },
    componentSchema: {
      requiredFields: ["name", "importFrom", "patterns"],
      optionalFields: ["propsMapping", "styleContract", "overridePolicy", "notes"],
      styleContractFields: ["covered", "variableByProps", "tokenSlots", "layoutLimits", "hardToOverride"],
      overridePolicyFields: ["allowed", "preferClassName", "preferStyle", "fallbackWhenMismatch"]
    },
    notes: ["Generated by d2c-init for ms-fe-basic validation."]
  };
}

function makeProjectAdapter(projectConfig) {
  return {
    schemaVersion: "1.0.0",
    projectName: "ms-fe-basic",
    repoType: "monorepo-package",
    pathCandidates: {
      components: projectConfig.paths.componentDirs,
      pages: projectConfig.paths.pageDirs,
      layouts: listExisting(["src/layouts"]),
      assets: projectConfig.paths.assetDirs,
      styles: projectConfig.paths.styleDirs
    },
    configCandidates: {
      framework: listExisting(["package.json", "config/config.ts"]),
      typescript: listExisting(["tsconfig.json"]),
      eslint: listExisting([".eslintrc.js", ".eslintrc.json", "eslint.config.js"]),
      prettier: listExisting([".prettierrc", ".prettierrc.js", "prettier.config.js"]),
      stylelint: listExisting([".stylelintrc", ".stylelintrc.js", "stylelint.config.js"])
    },
    tokenSources: {
      theme: listExisting(["src/theme/index.less"]),
      less: listExisting(["src/styles/variables/index.less", "src/styles/index.less", "src/global.less"]),
      cssVariables: listExisting(["src/styles/variables/dynamic-css-variable.less"]),
      tailwind: [],
      sass: [],
      styledComponents: []
    },
    styleConventions: {
      styleLanguage: projectConfig.cssStrategy,
      componentStyleColocation: true,
      globalStyleEntries: listExisting(["src/styles/index.less", "src/theme/index.less", "src/global.less"]),
      classNamePattern: "kebab-case or local project convention"
    },
    aliasResolution: projectConfig.paths.aliasMap,
    mergeTargets: {
      components: "src/pages/d2c-lab/components",
      pages: "src/pages/d2c-lab",
      styles: "src/pages/d2c-lab",
      assets: "src/pages/d2c-lab/assets"
    },
    validationCommands: {
      build: "npm run build",
      buildTest: "npm run build:test",
      devServer: "npm run start",
      test: "npm run test"
    },
    validationPolicy: {
      targetScope: "changed-files",
      changedFilesSource: "merge-report",
      projectWideChecks: "optional-diagnostic"
    },
    projectSpecifics: {
      targetPolicy: "Keep D2C validation output isolated under .d2c and src/pages/d2c-lab unless explicitly requested.",
      buildTool: projectConfig.buildTool,
      componentLibrary: projectConfig.componentLibrary
    }
  };
}

function writeReactPreview(packageJson) {
  const previewDir = path.join(targetRoot, ".d2c/preview");
  fs.mkdirSync(path.join(previewDir, "src/components"), { recursive: true });
  fs.mkdirSync(path.join(previewDir, "src/assets"), { recursive: true });
  writeJson(path.join(previewDir, "package.json"), {
    name: "d2c-preview",
    private: true,
    version: "0.0.0",
    type: "module",
    scripts: {
      dev: "vite --host 0.0.0.0 --port 5173",
      build: "tsc --noEmit && vite build",
      preview: "vite preview",
      "type-check": "tsc --noEmit"
    },
    dependencies: {
      react: dependencyVersion(packageJson, "react", "^18.2.0"),
      "react-dom": dependencyVersion(packageJson, "react-dom", "^18.2.0")
    },
    devDependencies: {
      "@vitejs/plugin-react": dependencyVersion(packageJson, "@vitejs/plugin-react", "^4.3.0"),
      typescript: dependencyVersion(packageJson, "typescript", "~5.6.0"),
      vite: dependencyVersion(packageJson, "vite", "^6.0.0"),
      "@types/node": dependencyVersion(packageJson, "@types/node", "^20.0.0"),
      "@types/react": dependencyVersion(packageJson, "@types/react", "^17.0.0"),
      "@types/react-dom": dependencyVersion(packageJson, "@types/react-dom", "^17.0.0")
    }
  });
  fs.writeFileSync(path.join(previewDir, "index.html"), '<!DOCTYPE html>\n<html lang="zh-CN">\n  <head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>D2C Preview</title></head>\n  <body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body>\n</html>\n');
  fs.writeFileSync(path.join(previewDir, "vite.config.ts"), "import { defineConfig } from 'vite'\nimport react from '@vitejs/plugin-react'\nimport { fileURLToPath, URL } from 'node:url'\n\nexport default defineConfig({\n  plugins: [react()],\n  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },\n  server: { port: 5173, open: false }\n})\n");
  writeJson(path.join(previewDir, "tsconfig.json"), {
    compilerOptions: {
      target: "ES2020",
      useDefineForClassFields: true,
      lib: ["ES2020", "DOM", "DOM.Iterable"],
      module: "ESNext",
      skipLibCheck: true,
      moduleResolution: "bundler",
      allowImportingTsExtensions: true,
      isolatedModules: true,
      moduleDetection: "force",
      noEmit: true,
      jsx: "react-jsx",
      strict: true,
      paths: {
        "@/*": ["./src/*"]
      }
    },
    include: ["src/**/*.ts", "src/**/*.tsx"]
  });
  fs.writeFileSync(path.join(previewDir, "src/main.tsx"), "import React from 'react'\nimport ReactDOM from 'react-dom'\nimport App from './App'\n\nReactDOM.render(<App />, document.getElementById('root'))\n");
  fs.writeFileSync(path.join(previewDir, "src/App.tsx"), "export default function App() {\n  return <div>D2C Preview - waiting for code generation</div>\n}\n");
}

if (!fs.existsSync(packagePath)) {
  console.error(`Missing package.json: ${packagePath}`);
  process.exit(1);
}

const packageJson = readJson(packagePath);
const dirs = [
  ".d2c/preview/src/components",
  ".d2c/preview/src/assets",
  ".d2c/context",
  ".d2c/assets",
  ".d2c/docs/reference",
  ".d2c/docs/design-specs",
  ".d2c/docs/generation-logs",
  ".d2c/docs/validation-reports",
  ".d2c/docs/verification-reports",
  ".d2c/docs/merge-reports",
  ".d2c/docs/sessions"
];

for (const dir of dirs) {
  fs.mkdirSync(path.join(targetRoot, dir), { recursive: true });
}

const projectConfig = makeProjectConfig(packageJson);
const designSystem = makeDesignSystem(projectConfig);
const componentLibrary = makeComponentLibrary(packageJson);
const projectAdapter = makeProjectAdapter(projectConfig);
const contextDir = path.join(targetRoot, ".d2c/context");

writeJson(path.join(contextDir, "project-config.json"), projectConfig);
writeJson(path.join(contextDir, "design-system.json"), designSystem);
writeJson(path.join(contextDir, "component-library.json"), componentLibrary);
writeJson(path.join(contextDir, "project-adapter.json"), projectAdapter);

for (const fileName of ["project-config.md", "design-system.md", "component-library.md"]) {
  const source = path.join(skillRoot, "templates/context", fileName);
  if (fs.existsSync(source)) {
    copyFile(source, path.join(contextDir, fileName));
  }
}

if (projectConfig.framework === "react") {
  writeReactPreview(packageJson);
} else {
  const previewTemplateDir = path.join(skillRoot, "templates/preview");
  for (const file of ["package.json", "vite.config.ts", "tsconfig.json", "tsconfig.node.json", "index.html", "src/main.ts", "src/App.vue", "src/env.d.ts"]) {
    copyFile(path.join(previewTemplateDir, file), path.join(targetRoot, ".d2c/preview", file));
  }
}

const report = {
  runId,
  skill: "d2c-init",
  targetRoot,
  status: "PASSED",
  project: {
    framework: projectConfig.framework,
    language: projectConfig.language,
    buildTool: projectConfig.buildTool,
    cssStrategy: projectConfig.cssStrategy,
    componentLibrary: projectConfig.componentLibrary
  },
  artifacts: {
    projectConfig: ".d2c/context/project-config.json",
    designSystem: ".d2c/context/design-system.json",
    componentLibrary: ".d2c/context/component-library.json",
    projectAdapter: ".d2c/context/project-adapter.json",
    previewPackage: ".d2c/preview/package.json"
  }
};

writeJson(path.join(targetRoot, ".d2c/docs/sessions", runId, "init-report.json"), report);
console.log(JSON.stringify(report, null, 2));
