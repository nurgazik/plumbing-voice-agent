// Promptfoo prompt function. Renders the system prompt through agent/render.js
// (the same path push.ts uses) and appends the scripted conversation.
//
// vars.conversation is the transcript so far, as [{role, content}, ...].
// The last message must be from the caller (role user); the agent's reply is
// what gets graded.
//
// content is normally a string. To replay a tool call that already happened,
// content is an array of Anthropic content blocks: an assistant turn holding a
// `tool_use` block, then a user turn holding the matching `tool_result` block.
// Promptfoo passes block arrays to the API untouched. One convenience is added
// here: a tool_result whose content is "file://fixtures/x.json" is replaced by
// that file's text, so cases point at a stored fixture instead of pasting JSON.

const fs = require("fs");
const path = require("path");
const { renderSystemPrompt } = require("../agent/render.js");

function resolveFixtures(message) {
  if (!Array.isArray(message.content)) return message;
  return {
    ...message,
    content: message.content.map((block) => {
      if (block.type === "tool_result" && typeof block.content === "string" && block.content.startsWith("file://")) {
        const file = path.join(__dirname, block.content.slice("file://".length));
        return { ...block, content: fs.readFileSync(file, "utf8").trim() };
      }
      return block;
    }),
  };
}

module.exports = function ({ vars }) {
  const conversation = Array.isArray(vars.conversation) ? vars.conversation : [];
  if (conversation.length === 0 || conversation[conversation.length - 1].role !== "user") {
    throw new Error("vars.conversation must end with a caller (user) turn");
  }
  return [{ role: "system", content: renderSystemPrompt() }, ...conversation.map(resolveFixtures)];
};
