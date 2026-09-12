// Renders the agent prompt exactly the way push.ts will: agent/prompt.md with
// the raw rules YAML dropped into the {{rules}} placeholder. Promptfoo calls
// this once per test and we return a chat message array.
//
// vars.conversation is the transcript so far, as [{role, content}, ...].
// The last message must be from the caller (role user); the agent's reply is
// what gets graded.

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

function renderSystemPrompt() {
  const template = fs.readFileSync(path.join(ROOT, "agent", "prompt.md"), "utf8");
  const rules = fs.readFileSync(path.join(ROOT, "rules", "plumbing.yaml"), "utf8");
  if (!template.includes("{{rules}}")) {
    throw new Error("agent/prompt.md has no {{rules}} placeholder");
  }
  return template.replace("{{rules}}", rules.trim());
}

module.exports = function ({ vars }) {
  const conversation = Array.isArray(vars.conversation) ? vars.conversation : [];
  if (conversation.length === 0 || conversation[conversation.length - 1].role !== "user") {
    throw new Error("vars.conversation must end with a caller (user) turn");
  }
  return [{ role: "system", content: renderSystemPrompt() }, ...conversation];
};

module.exports.renderSystemPrompt = renderSystemPrompt;
