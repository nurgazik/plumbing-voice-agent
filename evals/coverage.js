// Reports which beats in beats.yaml have eval cases and which do not.
//   node evals/coverage.js
// A case claims a beat with metadata.beats: [IC-3, ...] in its YAML.

const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
const { readSettings } = require("../agent/render.js");

// Beats testable at or before this step are expected to have cases.
const currentStep = readSettings().build_step;

const here = __dirname;
const { beats } = yaml.load(fs.readFileSync(path.join(here, "beats.yaml"), "utf8"));
const caseDir = path.join(here, "cases");

const casesByBeat = new Map(beats.map((b) => [b.id, []]));
const untagged = [];
const unknown = [];

for (const file of fs.readdirSync(caseDir).filter((f) => f.endsWith(".yaml")).sort()) {
  const cases = yaml.load(fs.readFileSync(path.join(caseDir, file), "utf8")) || [];
  for (const c of cases) {
    const tags = (c.metadata && c.metadata.beats) || [];
    if (tags.length === 0) untagged.push(`${file}: ${c.description}`);
    for (const t of tags) {
      if (!casesByBeat.has(t)) unknown.push(`${file}: ${c.description} -> ${t}`);
      else casesByBeat.get(t).push(`${file}: ${c.description}`);
    }
  }
}

const pad = (s, n) => String(s).padEnd(n);
console.log(`build step ${currentStep}\n`);
console.log(pad("beat", 6) + pad("step", 5) + pad("cases", 6) + "name");
for (const b of beats) {
  const n = casesByBeat.get(b.id).length;
  const flag = n === 0 && b.testable_at_step <= currentStep ? "  <- testable now, no case" : "";
  console.log(pad(b.id, 6) + pad(b.testable_at_step, 5) + pad(n, 6) + b.name + flag);
}
if (untagged.length) console.log("\nCases with no beat tag:\n  " + untagged.join("\n  "));
if (unknown.length) console.log("\nCases tagging an unknown beat:\n  " + unknown.join("\n  "));

const gaps = beats.filter((b) => b.testable_at_step <= currentStep && casesByBeat.get(b.id).length === 0);
process.exitCode = gaps.length || unknown.length ? 1 : 0;
