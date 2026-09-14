// Promptfoo loads the agent's tool list from here (promptfooconfig.yaml sets the
// provider's `tools: file://tools.js:tools`). It reads agent/tools.json through
// the same toolsForStep() that push.ts uses, at the build step in
// agent/settings.json, so the evals see exactly the tools the deployed agent
// has. The only change is the shape: the Anthropic API wants `input_schema`
// where tools.json says `parameters`, and it does not want our own fields
// (`built`, `speak_during_execution`, `speak_after_execution`).

const { readSettings, toolsForStep } = require("../agent/render.js");

function tools() {
  const step = readSettings().build_step;
  return toolsForStep(step).map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.parameters,
  }));
}

module.exports = { tools };
