import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const config = JSON.parse(fs.readFileSync(path.join(root, ".mcp.json"), "utf8"));

test("Claude MCP config separates official and community Figma providers", () => {
  const official = config.mcpServers?.["figma-official"];
  const context = config.mcpServers?.["figma-context"];

  assert.deepEqual(official, {
    type: "http",
    url: "https://mcp.figma.com/mcp",
  });
  assert.equal(context.type, "stdio");
  assert.equal(context.command, "npx");
  assert.deepEqual(context.args, ["-y", "figma-developer-mcp", "--stdio"]);
});

test("Claude community provider receives its token without command-line exposure", () => {
  const context = config.mcpServers?.["figma-context"];

  assert.deepEqual(context.env, {
    FIGMA_API_KEY: "${FIGMA_API_KEY:-}",
  });
  assert.equal(JSON.stringify(context.args).includes("api-key"), false);
});
