#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  return Object.fromEntries(
    argv.slice(2).map((arg) => {
      const [key, ...parts] = arg.replace(/^--/, "").split("=");
      return [key, parts.join("=")];
    })
  );
}

function fingerprint(token) {
  return `sha256[:16]=${crypto.createHash("sha256").update(token).digest("hex").slice(0, 16)}`;
}

function summarizeBody(body) {
  const text = typeof body === "string" ? body : JSON.stringify(body ?? {});
  return text.replace(/\s+/g, " ").slice(0, 240);
}

function findToken(config) {
  const entries = Object.entries(config.mcpServers ?? {});
  const selected = entries.find(([name, server]) => {
    const command = [name, server.command, ...(server.args ?? [])].join(" ").toLowerCase();
    return command.includes("figma");
  });

  if (!selected) {
    throw new Error("Cannot find a Figma MCP server in config.mcpServers");
  }

  const [serverName, server] = selected;
  const arg = (server.args ?? []).find((value) => String(value).startsWith("--figma-api-key="));
  const token =
    (arg ? String(arg).slice("--figma-api-key=".length) : "") ||
    server.env?.FIGMA_API_KEY ||
    server.env?.FIGMA_TOKEN ||
    server.env?.FIGMA_ACCESS_TOKEN;

  if (!token) {
    throw new Error(`Cannot find a Figma token for MCP server ${serverName}`);
  }

  return { serverName, token };
}

function classifyIdentity(status, body) {
  const errorSummary = summarizeBody(body);
  const missingIdentityScope = status === 403 && /current_user:read/i.test(errorSummary);
  return {
    status,
    classification: missingIdentityScope ? "INCONCLUSIVE_IDENTITY_SCOPE" : status === 200 ? "PASSED" : "FAILED",
    errorSummary: status === 200 ? "" : errorSummary
  };
}

function classifyFileProbe(status, body) {
  const errorSummary = summarizeBody(body);
  const invalidToken = status === 401 || /invalid token|invalid access token|invalid_token/i.test(errorSummary);
  return {
    status,
    classification:
      status === 200
        ? "PASSED"
        : invalidToken
          ? "AUTHENTICATION_FAILED"
          : status === 429
            ? "RATE_LIMITED"
            : status === 403
              ? "INSUFFICIENT_FILE_ACCESS_OR_SCOPE"
              : "FAILED",
    errorSummary: status === 200 ? "" : errorSummary
  };
}

async function requestJson(url, token) {
  const response = await fetch(url, {
    headers: {
      "X-Figma-Token": token
    }
  });
  let body;
  try {
    body = await response.json();
  } catch {
    body = await response.text();
  }
  return { status: response.status, body };
}

function responseFromFixture(fixture, name) {
  const response = fixture.responses?.[name];
  if (!response || typeof response.status !== "number") {
    throw new Error(`Fixture is missing responses.${name}.status`);
  }
  return response;
}

const args = parseArgs(process.argv);
const fixturePath = args.fixture ? path.resolve(args.fixture) : "";
const fixture = fixturePath ? JSON.parse(fs.readFileSync(fixturePath, "utf8")) : null;
const configPath = path.resolve(args.config || fixture?.configPath || "");
const fileKey = args["file-key"] || fixture?.fileKey;
const nodeId = args["node-id"] || fixture?.nodeId;

if (!configPath || !fileKey || !nodeId) {
  console.error("Usage: node scripts/probe-figma-token.mjs --config=<.mcp.json> --file-key=<fileKey> --node-id=<nodeId>");
  process.exit(1);
}

const config = fixture?.config ?? JSON.parse(fs.readFileSync(configPath, "utf8"));
const { serverName, token } = findToken(config);
const encodedNodeId = encodeURIComponent(nodeId);
const identityResponse = fixture
  ? responseFromFixture(fixture, "identity")
  : await requestJson("https://api.figma.com/v1/me", token);
const nodesResponse = fixture
  ? responseFromFixture(fixture, "nodes")
  : await requestJson(`https://api.figma.com/v1/files/${fileKey}/nodes?ids=${encodedNodeId}`, token);
const imagesResponse = fixture
  ? responseFromFixture(fixture, "images")
  : await requestJson(`https://api.figma.com/v1/images/${fileKey}?ids=${encodedNodeId}`, token);

const identityProbe = classifyIdentity(identityResponse.status, identityResponse.body);
const nodesProbe = classifyFileProbe(nodesResponse.status, nodesResponse.body);
const imagesProbe = classifyFileProbe(imagesResponse.status, imagesResponse.body);
const structuredRaw = nodesProbe.status === 200;
const imageFallback = !structuredRaw && imagesProbe.status === 200;
const authenticationFailed =
  nodesProbe.classification === "AUTHENTICATION_FAILED" &&
  imagesProbe.classification === "AUTHENTICATION_FAILED";

const output = {
  configPath,
  serverName,
  tokenFingerprint: fingerprint(token),
  identityProbe,
  nodesProbe,
  imagesProbe,
  capabilities: {
    structuredRaw,
    imageFallback,
    authenticationFailed,
    identityScopeInconclusive: identityProbe.classification === "INCONCLUSIVE_IDENTITY_SCOPE",
    upstreamRateLimitDoesNotBlockLocalProbe: fixture?.upstreamMcpStatus === 429 || undefined
  },
  recommendedProvider: structuredRaw ? "figma-rest" : imageFallback ? "figma-image-fallback" : "unavailable"
};

console.log(JSON.stringify(output, null, 2));
