#!/usr/bin/env node
/**
 * Mechanized scorer for critic-calibration runs (2026-07-17).
 *
 * A run is a directory containing one JSON per case, produced by a FRESH,
 * ISOLATED critic session (protocol in README.md):
 *
 *   runs/run-NNN/<case-name>.json
 *   {
 *     "verdict": "ship" | "revise" | "redirect",
 *     "findings": [
 *       { "dimension": "motion", "severity": "P1"|"P2"|"P3",
 *         "note": "…", "path": "scenes[2].elements[1]" }
 *     ]
 *   }
 *
 * Scoring per labels.json:
 *  - verdict OK when it is in the case's expectedVerdict list;
 *  - a mustFind is HIT when any finding's dimension matches one of the
 *    label's `a|b|c` alternatives (substring, case-insensitive) AND its
 *    severity is at least severityAtLeast — the gist is NOT machine-matched;
 *    dimension-hits are listed for human adjudication of the gist;
 *  - controls: any P1 counts against mustNotFind ("any P1"); findings above
 *    maxFindings flag over-triggering.
 *
 * Usage: node benchmarks/critic-calibration/score-run.mjs runs/run-002
 * Writes <run-dir>/summary.md and prints the aggregate table.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const runDir = path.resolve(process.argv[2] ?? "");
if (!runDir || !existsSync(runDir)) {
  console.error("usage: node score-run.mjs <run-dir>  (dir of per-case critic JSON)");
  process.exit(2);
}
const labels = JSON.parse(readFileSync(path.join(here, "labels.json"), "utf8")).cases;
const SEV = { P1: 3, P2: 2, P3: 1 };

const rows = [];
let verdictsOk = 0, mustFindHits = 0, mustFindTotal = 0, controlViolations = 0, casesScored = 0, adjudications = [];

for (const [name, label] of Object.entries(labels)) {
  const file = path.join(runDir, `${name}.json`);
  if (!existsSync(file)) {
    rows.push({ name, status: "MISSING", detail: "no critic output" });
    continue;
  }
  let out;
  try {
    out = JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    rows.push({ name, status: "INVALID", detail: `bad JSON: ${e.message}` });
    continue;
  }
  casesScored++;
  const findings = Array.isArray(out.findings) ? out.findings : [];
  const verdictOk = (label.expectedVerdict ?? []).includes(out.verdict);
  if (verdictOk) verdictsOk++;

  const details = [];
  for (const mf of label.mustFind ?? []) {
    mustFindTotal++;
    const dims = mf.dimension.toLowerCase().split("|");
    const hit = findings.find(
      (f) =>
        dims.some((d) => String(f.dimension ?? "").toLowerCase().includes(d)) &&
        (SEV[f.severity] ?? 0) >= (SEV[mf.severityAtLeast] ?? 0)
    );
    if (hit) {
      mustFindHits++;
      details.push(`mustFind HIT (${mf.dimension}) — adjudicate gist: "${(hit.note ?? "").slice(0, 90)}"`);
      adjudications.push({ case: name, expected: mf.gist, got: hit.note ?? "" });
    } else {
      details.push(`mustFind MISS (${mf.dimension} ≥${mf.severityAtLeast})`);
    }
  }
  const isControl = (label.mustNotFind ?? []).includes("any P1") || label.maxFindings != null;
  if (isControl) {
    const p1s = findings.filter((f) => f.severity === "P1").length;
    if (p1s > 0) {
      controlViolations++;
      details.push(`CONTROL VIOLATION: ${p1s} P1 finding(s) on a control`);
    }
    if (label.maxFindings != null && findings.length > label.maxFindings) {
      controlViolations++;
      details.push(`OVER-TRIGGER: ${findings.length} findings (max ${label.maxFindings})`);
    }
    if (p1s === 0 && (label.maxFindings == null || findings.length <= label.maxFindings)) details.push("control clean");
  }
  rows.push({
    name,
    status: verdictOk && !details.some((d) => d.includes("MISS") || d.includes("VIOLATION") || d.includes("OVER-TRIGGER")) ? "PASS" : "FAIL",
    detail: `verdict ${out.verdict}${verdictOk ? " ✓" : ` ✗ (want ${label.expectedVerdict.join("/")})`} · ${details.join(" · ") || "no mustFinds"}`,
  });
}

const pad = (s, n) => String(s).padEnd(n);
let report = `# Calibration scoring — ${path.basename(runDir)}\n\n`;
report += `| case | result | detail |\n|---|---|---|\n`;
for (const r of rows) report += `| ${r.name} | ${r.status} | ${r.detail} |\n`;
report += `\n**Aggregate:** verdicts ${verdictsOk}/${casesScored} · mustFind recall ${mustFindHits}/${mustFindTotal} · control violations ${controlViolations}\n`;
report += `\nGist adjudication required (${adjudications.length}): dimension+severity matched mechanically; a human (or a second isolated session) must confirm each hit's note actually describes the planted defect before quoting recall numbers.\n`;
report += `\nLabels are author-authored (bias documented in labels.json). Independent human labels remain required before public claims.\n`;

writeFileSync(path.join(runDir, "summary.md"), report);
for (const r of rows) console.log(`${pad(r.status, 8)} ${pad(r.name, 22)} ${r.detail}`);
console.log(`\nverdicts ${verdictsOk}/${casesScored} · mustFind recall ${mustFindHits}/${mustFindTotal} · control violations ${controlViolations}`);
console.log(`summary → ${path.join(runDir, "summary.md")}`);
