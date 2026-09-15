// Render the parts of rules/plumbing.yaml that the n8n workflows need into
// each workflow file, between marker lines, so prices and job types have one
// source. Same idea as agent/push.ts rendering the prompt.
//
//   node workflows/build.js            rewrite the RULES block in every *.sdk.ts
//   node workflows/build.js --check    exit 1 if any block is stale, change nothing
//
// A workflow opts in with these two block-comment markers, inside a Code node's
// jsCode (they are valid JavaScript comments there, and plain text to the SDK):
//   /* BEGIN generated from rules/plumbing.yaml (node workflows/build.js) */
//   /* END generated */
// Everything between them is replaced with `const RULES = {...};`. A file may
// carry the markers more than once.

const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const ROOT = path.resolve(__dirname, "..");
const rules = yaml.load(fs.readFileSync(path.join(ROOT, "rules", "plumbing.yaml"), "utf8"));

const BEGIN = "/* BEGIN generated from rules/plumbing.yaml (node workflows/build.js) */";
const END = "/* END generated */";

// The subset the workflows use. Add keys here when a workflow needs more.
const subset = {
  business_name: rules.business.name,
  currency: rules.pricing_policy.currency,
  service_call_fee_cad: rules.pricing_policy.service_call_fee_cad,
  sms_footer: rules.compliance.sms_footer,
  job_type_keys: Object.keys(rules.job_types),
  job_types: Object.fromEntries(
    Object.entries(rules.job_types).map(([k, v]) => [k, { label: v.label, typical_tier: v.typical_tier, price_band_cad: v.price_band_cad ?? null }])
  ),
};
// Compact JSON: it lives inside a template literal, so no backticks or "${" allowed.
const json = JSON.stringify(subset);
if (/[`]|\$\{/.test(json)) throw new Error("rules subset contains a backtick or ${, which would break the workflow code");
const block = `${BEGIN}\nconst RULES = ${json};\n${END}`;

const check = process.argv.includes("--check");
let stale = 0;
for (const file of fs.readdirSync(__dirname).filter((f) => f.endsWith(".sdk.ts"))) {
  const p = path.join(__dirname, file);
  const src = fs.readFileSync(p, "utf8");
  if (!src.includes(BEGIN)) continue;
  const re = new RegExp(BEGIN.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&") + "[\\s\\S]*?" + END.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&"), "g");
  const next = src.replace(re, () => block);
  if (next === src) { console.log(`${file}: up to date`); continue; }
  stale++;
  if (check) console.log(`${file}: STALE, run node workflows/build.js`);
  else { fs.writeFileSync(p, next); console.log(`${file}: rendered`); }
}
if (check && stale) process.exit(1);
