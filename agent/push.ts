// Push the agent to Retell.
//
//   node agent/push.ts              render, validate, run evals, push
//   node agent/push.ts --dry-run    render and validate, print the payloads, push nothing
//   node agent/push.ts --skip-evals push without running the eval suite (use sparingly)
//
// Runs on Node 22.18+ with no dependencies (TypeScript type stripping is built in).
// Reads .env from the repo root. Creates the Retell LLM and agent on first run and
// appends their ids to .env; updates them in place after that.

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const render = require("./render.js") as typeof import("./render.js");

const RETELL = "https://api.retellai.com";
const ROOT: string = render.ROOT;
const ENV_PATH = path.join(ROOT, ".env");

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const skipEvals = args.has("--skip-evals");

function loadEnv(): Record<string, string> {
  const out: Record<string, string> = {};
  if (!fs.existsSync(ENV_PATH)) return out;
  for (const line of fs.readFileSync(ENV_PATH, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !line.trim().startsWith("#")) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

function appendEnv(key: string, value: string) {
  const current = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, "utf8") : "";
  const re = new RegExp(`^${key}=.*$`, "m");
  const next = re.test(current) ? current.replace(re, `${key}=${value}`) : current.replace(/\n?$/, "\n") + `${key}=${value}\n`;
  fs.writeFileSync(ENV_PATH, next);
}

async function retell<T>(method: string, route: string, apiKey: string, body?: unknown): Promise<T> {
  const res = await fetch(`${RETELL}${route}`, {
    method,
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${route} -> ${res.status}: ${text.slice(0, 500)}`);
  return text ? (JSON.parse(text) as T) : ({} as T);
}

function step(msg: string) {
  console.log(`\n▶ ${msg}`);
}

function runEvals(): boolean {
  step("Running the eval suite (evals/promptfooconfig.yaml)");
  const r = spawnSync("npx", ["promptfoo", "eval", "--env-file", ENV_PATH, "--no-cache"], {
    cwd: path.join(ROOT, "evals"),
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
  });
  const summary = (r.stdout + r.stderr).split("\n").filter((l) => /passed|failed|errors \(/.test(l));
  console.log(summary.map((l) => "  " + l.trim()).join("\n") || "  (no summary line found)");
  return r.status === 0;
}

async function main() {
  const env = loadEnv();
  const settings = render.readSettings();
  const buildStep: number = settings.build_step;

  step(`Rendering prompt for build step ${buildStep}`);
  const prompt: string = render.renderSystemPrompt();
  const tools = render.toolsForStep(buildStep);
  console.log(`  prompt: ${prompt.length} chars, ${prompt.split("\n").length} lines`);
  console.log(`  tools at this step: ${tools.length ? tools.map((t: any) => t.name).join(", ") : "none"}`);

  step("Validating rules/plumbing.yaml against rules/schema.json");
  const v = render.validateRules();
  if (v.skipped) console.log("  skipped: js-yaml and ajv are not installed (npm i -D js-yaml ajv to enable)");
  else if (!v.ok) {
    console.error("  rules file is invalid:\n" + JSON.stringify(v.errors, null, 1));
    process.exit(1);
  } else console.log("  ok");

  // The n8n workflows carry a rendered copy of the rules; refuse to push an agent whose rules differ from theirs.
  step("Checking workflows/*.sdk.ts against rules/plumbing.yaml (node workflows/build.js --check)");
  const chk = spawnSync("node", [path.join(ROOT, "workflows", "build.js"), "--check"], { encoding: "utf8" });
  console.log(chk.stdout.trim().split("\n").map((l) => "  " + l).join("\n"));
  if (chk.status !== 0) throw new Error("a workflow's rendered rules are stale; run node workflows/build.js and push that workflow to n8n");

  // Sanity checks that need no YAML parsing.
  const rulesText: string = render.readRules();
  for (const needle of ["recorded", "AI assistant"]) {
    if (!settings.begin_message.includes(needle)) throw new Error(`begin_message is missing "${needle}"`);
  }
  if (!rulesText.includes("Reply STOP to any of our texts to opt out")) throw new Error("rules file lost the STOP line");

  const webhookBase = env.N8N_WEBHOOK_BASE_URL?.replace(/\/$/, "");
  if (tools.length && !webhookBase) throw new Error("tools are enabled for this step but N8N_WEBHOOK_BASE_URL is not set in .env");

  const llmPayload = {
    model: settings.retell_model,
    model_temperature: settings.temperature,
    start_speaker: "agent",
    begin_message: settings.begin_message,
    general_prompt: prompt,
    general_tools: tools.map((t: any) => ({
      type: "custom",
      name: t.name,
      description: t.description,
      // n8n webhook paths are tools/<name-with-hyphens>, see workflows/README.md.
      url: `${webhookBase}/tools/${t.name.replace(/_/g, "-")}`,
      method: "POST",
      parameters: t.parameters,
      speak_during_execution: t.speak_during_execution,
      speak_after_execution: t.speak_after_execution,
      timeout_ms: settings.tool_timeout_ms,
      // false keeps Retell's full body {name, call, args}. n8n reads the caller's
      // number from call.from_number, so tools never have to ask the model for it.
      args_at_root: false,
    })),
  };

  const agentPayload: Record<string, unknown> = {
    agent_name: settings.agent_name,
    voice_id: settings.voice_id,
    language: settings.language,
    // Wait before the opener so a caller's "hello?" does not cut off the disclosures (Retell: 0 to 5000 ms).
    begin_message_delay_ms: settings.begin_message_delay_ms ?? 0,
    // How much caller audio stops the agent mid-sentence (Retell: 0 never, 1 a syllable). Protects the disclosures.
    interruption_sensitivity: settings.interruption_sensitivity ?? 1,
  };
  if (env.N8N_WEBHOOK_BASE_URL) agentPayload.webhook_url = `${webhookBase}/retell-events`;

  if (dryRun) {
    step("Dry run. Payloads that would be sent:");
    console.log(JSON.stringify({ llm: { ...llmPayload, general_prompt: `<${prompt.length} chars>` }, agent: agentPayload }, null, 2));
    return;
  }

  if (!env.RETELL_API_KEY) throw new Error("RETELL_API_KEY is not set in .env");

  if (!skipEvals) {
    if (!runEvals()) {
      console.error("\n✗ Evals failed. Fix the prompt or the case, then push again. (--skip-evals overrides.)");
      process.exit(1);
    }
  } else console.log("\n(skipping evals)");

  const key = env.RETELL_API_KEY;
  let llmId = env.RETELL_LLM_ID;
  let agentId = env.RETELL_AGENT_ID;

  step(llmId ? `Updating Retell LLM ${llmId}` : "Creating Retell LLM");
  if (llmId) {
    const r = await retell<{ llm_id: string; version: number }>("PATCH", `/update-retell-llm/${llmId}`, key, llmPayload);
    console.log(`  ok, version ${r.version}`);
  } else {
    const r = await retell<{ llm_id: string; version: number }>("POST", "/create-retell-llm", key, llmPayload);
    llmId = r.llm_id;
    appendEnv("RETELL_LLM_ID", llmId);
    console.log(`  created ${llmId}, saved to .env`);
  }

  const engine = { response_engine: { type: "retell-llm", llm_id: llmId } };
  step(agentId ? `Updating Retell agent ${agentId}` : "Creating Retell agent");
  if (agentId) {
    const r = await retell<{ agent_id: string; version: number }>("PATCH", `/update-agent/${agentId}`, key, { ...agentPayload, ...engine });
    console.log(`  ok, version ${r.version}`);
  } else {
    const r = await retell<{ agent_id: string; version: number }>("POST", "/create-agent", key, { ...agentPayload, ...engine });
    agentId = r.agent_id;
    appendEnv("RETELL_AGENT_ID", agentId);
    console.log(`  created ${agentId}, saved to .env`);
  }

  step("Verifying");
  const agent = await retell<any>("GET", `/get-agent/${agentId}`, key);
  const llm = await retell<any>("GET", `/get-retell-llm/${llmId}`, key);
  const promptMatches = llm.general_prompt === prompt;
  console.log(`  agent "${agent.agent_name}" v${agent.version}, voice ${agent.voice_id}, opener delay ${agent.begin_message_delay_ms ?? 0} ms, interruption sensitivity ${agent.interruption_sensitivity ?? 1}, engine ${agent.response_engine?.type} -> ${agent.response_engine?.llm_id}`);
  console.log(`  llm model ${llm.model}, temperature ${llm.model_temperature}, prompt matches repo: ${promptMatches}`);
  if (!promptMatches) throw new Error("Deployed prompt does not match the rendered prompt");

  console.log(`\n✓ Pushed. Test it: https://dashboard.retellai.com/agents/${agentId}`);
}

main().catch((e) => {
  console.error(`\n✗ ${e.message}`);
  process.exit(1);
});
