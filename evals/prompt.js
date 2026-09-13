// Promptfoo prompt function. Renders the system prompt through agent/render.js
// (the same path push.ts uses) and appends the scripted conversation.
//
// vars.conversation is the transcript so far, as [{role, content}, ...].
// The last message must be from the caller (role user); the agent's reply is
// what gets graded.

const { renderSystemPrompt } = require("../agent/render.js");

module.exports = function ({ vars }) {
  const conversation = Array.isArray(vars.conversation) ? vars.conversation : [];
  if (conversation.length === 0 || conversation[conversation.length - 1].role !== "user") {
    throw new Error("vars.conversation must end with a caller (user) turn");
  }
  return [{ role: "system", content: renderSystemPrompt() }, ...conversation];
};
