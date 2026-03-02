import { existsSync, mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";

const DEBUG_DIR = resolve(process.cwd(), "..", "..", "data", "debug");

/** Ensure debug directory exists */
const ensureDir = () => {
  if (!existsSync(DEBUG_DIR)) {
    mkdirSync(DEBUG_DIR, { recursive: true });
  }
};

let stepCounter = 0;

/** Reset step counter (call at start of each scrape run) */
export const resetDebugLog = () => {
  stepCounter = 0;
};

/**
 * Save a debug markdown file for an AI extraction step.
 * Files are numbered sequentially so you can follow the flow.
 */
export const saveDebugMarkdown = (
  scraperName: string,
  phase: string,
  data: {
    prompt?: string;
    rawResponse?: string;
    parsedResult?: unknown;
    screenshotBase64?: string;
    error?: string;
    notes?: string;
  }
) => {
  ensureDir();
  stepCounter++;

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `${timestamp}_${String(stepCounter).padStart(2, "0")}_${scraperName}_${phase}.md`;
  const filePath = resolve(DEBUG_DIR, fileName);

  const lines: string[] = [
    `# ${scraperName} — ${phase}`,
    `**Time:** ${new Date().toISOString()}`,
    `**Step:** ${stepCounter}`,
    "",
  ];

  if (data.notes) {
    lines.push(`## Notes`, data.notes, "");
  }

  if (data.prompt) {
    lines.push(`## Prompt sent to AI`, "```", data.prompt, "```", "");
  }

  if (data.rawResponse) {
    lines.push(`## Raw AI Response`, "```json", data.rawResponse, "```", "");
  }

  if (data.parsedResult) {
    lines.push(
      `## Parsed Result`,
      "```json",
      JSON.stringify(data.parsedResult, null, 2),
      "```",
      ""
    );
  }

  if (data.error) {
    lines.push(`## Error`, "```", data.error, "```", "");
  }

  if (data.screenshotBase64) {
    // Embed as base64 image in markdown (viewable in many MD renderers)
    lines.push(
      `## Screenshot`,
      `![screenshot](data:image/png;base64,${data.screenshotBase64})`,
      ""
    );
  }

  writeFileSync(filePath, lines.join("\n"), "utf-8");
  return filePath;
};
