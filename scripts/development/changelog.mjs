#!/usr/bin/env node
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, readlinkSync } from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import {
  addDays,
  changesOn,
  daysBetween,
  firstDay,
  localDay,
  repos,
  root,
} from "../../.agents/skills/changelog/collect.mjs";

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const TYPES = new Set(["new", "improved", "fixed"]);
const PLATFORMS = new Set(["web", "mobile"]);
const TIMEOUT_MS = 20 * 60 * 1000;
const CHANGELOG = "changelog";
const changelogDir = path.join(root, "web", CHANGELOG);
const checkedFile = path.join(changelogDir, "checked.json");
const typeLabels = { new: "✨ New", improved: "💄 Improved", fixed: "🐛 Fixed" };

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const autoYes = args.includes("--yes");
const option = (name) => {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
};

function log(message) {
  console.log(message);
}

function stop(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

function git(repo, gitArgs) {
  return execFileSync("git", ["-C", path.join(root, repo), ...gitArgs], { encoding: "utf8" });
}

function readChecked() {
  if (!existsSync(checkedFile)) return null;
  try {
    const { checkedThrough } = JSON.parse(readFileSync(checkedFile, "utf8"));
    return DAY.test(checkedThrough) ? checkedThrough : null;
  } catch {
    return null;
  }
}

function fingerprint(full) {
  try {
    const stat = lstatSync(full);
    if (stat.isSymbolicLink()) return `link:${readlinkSync(full)}`;
    if (stat.isDirectory()) return "folder";
    return createHash("sha1").update(readFileSync(full)).digest("hex");
  } catch {
    return "deleted";
  }
}

function snapshot() {
  const state = new Map();
  for (const repo of repos) {
    const statusArgs = ["status", "--porcelain", "--untracked-files=all"];
    if (repo === ".") statusArgs.push("--ignore-submodules=all");
    for (const line of git(repo, statusArgs).split("\n").filter(Boolean)) {
      const file = line.slice(3).split(" -> ").pop();
      state.set(
        path.join(repo, file),
        `${line.slice(0, 2)}:${fingerprint(path.join(root, repo, file))}`,
      );
    }
  }
  return state;
}

function changedSince(before) {
  const after = snapshot();
  const paths = new Set([...before.keys(), ...after.keys()]);
  return [...paths].filter((file) => before.get(file) !== after.get(file));
}

function isChangelogFile(file) {
  return file.startsWith(path.join("web", CHANGELOG) + path.sep);
}

function discardChangelog() {
  if (git("web", ["ls-files", "--", CHANGELOG]).trim()) {
    git("web", ["checkout", "--", CHANGELOG]);
  }
  git("web", ["clean", "-fdq", "--", CHANGELOG]);
}

function validate(from, to, changed) {
  const problems = [];
  const checked = readChecked();
  if (checked !== to) problems.push(`checked.json should say ${to}, not ${checked ?? "nothing"}.`);

  const days = [];
  for (const file of changed.filter(isChangelogFile)) {
    const name = path.basename(file);
    if (name === "checked.json") continue;
    const day = name.replace(/\.json$/, "");
    if (!DAY.test(day) || !name.endsWith(".json")) {
      problems.push(`${name} isn't a day file.`);
      continue;
    }
    if (day < from || day > to) problems.push(`${name} is outside ${from} to ${to}.`);
    const full = path.join(root, file);
    if (!existsSync(full)) {
      problems.push(`${name} was deleted.`);
      continue;
    }
    let data;
    try {
      data = JSON.parse(readFileSync(full, "utf8"));
    } catch {
      problems.push(`${name} isn't valid JSON.`);
      continue;
    }
    if (data.date !== day) problems.push(`${name} has the wrong date.`);
    if (
      data.versions !== undefined &&
      (!Array.isArray(data.versions) || data.versions.some((version) => typeof version !== "string"))
    ) {
      problems.push(`${name} has invalid versions.`);
    }
    if (!Array.isArray(data.entries) || data.entries.length === 0) {
      problems.push(`${name} has no entries.`);
      continue;
    }
    data.entries.forEach((entry, index) => {
      const where = `${name} entry ${index + 1}`;
      if (!TYPES.has(entry?.type)) problems.push(`${where} has an unknown type.`);
      if (typeof entry?.title !== "string" || !entry.title.trim() || entry.title.length > 80) {
        problems.push(`${where} needs a title of 1 to 80 characters.`);
      }
      if (
        typeof entry?.description !== "string" ||
        !entry.description.trim() ||
        entry.description.length > 300
      ) {
        problems.push(`${where} needs a description of 1 to 300 characters.`);
      }
      if (
        entry?.platforms !== undefined &&
        (!Array.isArray(entry.platforms) || entry.platforms.some((platform) => !PLATFORMS.has(platform)))
      ) {
        problems.push(`${where} has invalid platforms.`);
      }
    });
    days.push(data);
  }

  return { problems, days: days.sort((a, b) => a.date.localeCompare(b.date)) };
}

function agentsFor(prompt) {
  return [
    {
      name: "Claude",
      bin: process.env.CLAUDE_BIN || "claude",
      args: [
        "-p",
        prompt,
        "--permission-mode",
        "dontAsk",
        "--allowedTools",
        "Read",
        "Glob",
        "Grep",
        "Edit(web/changelog/**)",
        "Bash(node .agents/skills/changelog/collect.mjs:*)",
        ...repos.flatMap((repo) =>
          repo === "."
            ? ["Bash(git log:*)", "Bash(git show:*)"]
            : [`Bash(git -C ${repo} log:*)`, `Bash(git -C ${repo} show:*)`],
        ),
      ],
    },
    {
      name: "Codex",
      bin: process.env.CODEX_BIN || "codex",
      args: ["exec", "--sandbox", "workspace-write", "--cd", root, "--ephemeral", prompt],
    },
  ];
}

function summarize(days) {
  if (days.length === 0) {
    log("   Nothing user-facing to log for these days.");
    return;
  }
  for (const day of days) {
    log(`\n   ${day.date}${day.versions?.length ? ` (${day.versions.join(", ")})` : ""}`);
    for (const entry of day.entries) {
      log(`   ${typeLabels[entry.type]}: ${entry.title}`);
      log(`      ${entry.description}`);
    }
  }
  log("");
}

async function confirm(question) {
  if (autoYes || !process.stdin.isTTY) return true;
  const prompt = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await prompt.question(question)).trim().toLowerCase();
  prompt.close();
  return answer === "" || answer === "y" || answer === "yes";
}

const yesterday = addDays(localDay(), -1);
const checked = readChecked();
const from = option("--from") ?? (checked ? addDays(checked, 1) : firstDay());
const to = option("--to") ?? yesterday;

if (!DAY.test(from ?? "") || !DAY.test(to)) stop("Use dates like 2026-10-26.");
if (to > yesterday) stop("The changelog only covers days that are over, so stop at yesterday.");

if (from > to) {
  log("📝 The changelog is up to date.");
  process.exit(0);
}

const changeCount = daysBetween(from, to).reduce(
  (count, day) => count + changesOn(day).changes.length,
  0,
);
if (changeCount === 0) {
  log(`📝 No changes to log from ${from} to ${to}.`);
  process.exit(0);
}

if (git("web", ["status", "--porcelain", "--untracked-files=all", "--", CHANGELOG]).trim()) {
  stop("web/changelog has uncommitted changes. Commit or discard them first.");
}

log(`📝 Writing the changelog for ${from} to ${to} (${changeCount} commits)...`);

const prompt = [
  `Use the changelog skill (.agents/skills/changelog/SKILL.md) to write the Orbis changelog for every day from ${from} through ${to}.`,
  `Get the changes with: node .agents/skills/changelog/collect.mjs ${from} ${to}`,
  "Only create or edit files in web/changelog/, and don't commit anything.",
  `When you're done, set "checkedThrough" in web/changelog/checked.json to "${to}".`,
].join("\n");

let result = null;
for (const agent of agentsFor(prompt)) {
  const before = snapshot();
  log(`🤖 Asking ${agent.name}...`);
  const run = spawnSync(agent.bin, agent.args, {
    cwd: root,
    stdio: ["ignore", "inherit", "inherit"],
    timeout: TIMEOUT_MS,
  });
  const changed = changedSince(before);
  const outside = changed.filter((file) => !isChangelogFile(file));

  if (outside.length > 0) {
    stop(
      `${agent.name} changed files outside web/changelog, so the release stopped. Check these and undo them:\n${outside
        .map((file) => `   - ${file}`)
        .join("\n")}`,
    );
  }

  const failed = run.error
    ? run.error.code === "ENOENT"
      ? "isn't installed"
      : run.error.code === "ETIMEDOUT"
        ? "took too long"
        : run.error.message
    : run.status !== 0
      ? `stopped with exit code ${run.status}`
      : null;
  if (failed) {
    log(`⚠️ ${agent.name} ${failed}.`);
    discardChangelog();
    continue;
  }

  const checkedResult = validate(from, to, changed);
  if (checkedResult.problems.length > 0) {
    log(`⚠️ ${agent.name}'s changelog didn't pass the checks:`);
    for (const problem of checkedResult.problems) log(`   - ${problem}`);
    discardChangelog();
    continue;
  }

  result = { agent: agent.name, days: checkedResult.days };
  break;
}

if (!result) {
  log("⚠️ Couldn't write the changelog this time. The next release will try these days again.");
  process.exit(0);
}

log(`✅ ${result.agent} wrote the changelog:`);
summarize(result.days);

if (dryRun) {
  log("📝 Dry run: the files are in web/changelog and nothing was committed.");
  process.exit(0);
}

if (!(await confirm("Commit this changelog? [Y/n] "))) {
  discardChangelog();
  log("⚠️ Skipped the changelog. The next release will try these days again.");
  process.exit(0);
}

git("web", ["add", "--", CHANGELOG]);
git("web", ["commit", "-q", "-m", `📝 Update changelog through ${to}`]);
log(`📝 Committed the changelog through ${to} in web.`);
