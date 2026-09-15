import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const configPath = path.join(root, ".mcp.example.json");

test("Claude MCP template runs the community Figma provider with an inline token argument", () => {
  assert.equal(fs.existsSync(configPath), true, "missing .mcp.example.json");
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

  assert.deepEqual(config, {
    mcpServers: {
      figma: {
        command: "npx",
        args: [
          "-y",
          "figma-developer-mcp",
          "--figma-api-key=<YOUR_FIGMA_API_KEY>",
          "--stdio",
        ],
      },
      "chrome-devtools": {
        command: "npx",
        args: ["-y", "chrome-devtools-mcp@latest"],
      },
    },
  });
});

test("local Claude MCP config is ignored even before it contains a token", () => {
  const result = spawnSync("git", ["check-ignore", "--no-index", ".mcp.json"], {
    cwd: root,
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr || "local .mcp.json is not ignored");
});
