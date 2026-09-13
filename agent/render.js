// One rendering path for the agent prompt. Used by agent/push.ts (deploy) and
// evals/prompt.js (grading), so what is graded is what is deployed.
//
// The rules YAML goes into the prompt as raw text at the {{rules}} placeholder.
// No YAML parsing is needed for that, so this file has no dependencies.

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

const PATHS = {
  prompt: path.join(ROOT, "agent", "prompt.md"),
  rules: path.join(ROOT, "rules", "plumbing.yaml"),
  schema: path.join(ROOT, "rules", "schema.json"),
  tools: path.join(ROOT, "agent", "tools.json"),
  settings: path.join(ROOT, "agent", "settings.json"),
};

function readRules() {
  return fs.readFileSync(PATHS.rules, "utf8");
}

function renderSystemPrompt() {
  const template = fs.readFileSync(PATHS.prompt, "utf8");
  if (!template.includes("{{rules}}")) {
    throw new Error("agent/prompt.md has no {{rules}} placeholder");
  }
  return template.replace("{{rules}}", readRules().trim());
}

function readSettings() {
  return JSON.parse(fs.readFileSync(PATHS.settings, "utf8"));
}

// Tools whose build step has been reached. Step 1 has none.
function toolsForStep(buildStep) {
  const { tools } = JSON.parse(fs.readFileSync(PATHS.tools, "utf8"));
  return tools.filter((t) => t.built <= buildStep);
}

// Optional: validate the rules file against rules/schema.json. Needs js-yaml
// and ajv, which are not installed unless someone adds them as devDependencies.
// Returns {ok, skipped, errors}.
function validateRules() {
  let yaml, Ajv;
  try {
    yaml = require("js-yaml");
    Ajv = require("ajv/dist/2020").default;
  } catch {
    return { ok: true, skipped: true, errors: null };
  }
  const ajv = new Ajv({ strict: false, allErrors: true });
  const schema = JSON.parse(fs.readFileSync(PATHS.schema, "utf8"));
  const ok = ajv.validate(schema, yaml.load(readRules()));
  return { ok, skipped: false, errors: ok ? null : ajv.errors };
}

module.exports = { PATHS, ROOT, readRules, renderSystemPrompt, readSettings, toolsForStep, validateRules };
