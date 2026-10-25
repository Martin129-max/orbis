import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));

function readValues(path) {
  if (!existsSync(path)) return new Map();
  const entries = readFileSync(path, "utf8").split(/\r?\n/).flatMap((line) => {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_]\w*)\s*=\s*(.*)$/);
    if (!match) return [];
    const raw = match[2].trim();
    const quoted = raw.match(/^(["'`])([\s\S]*?)\1\s*(?:#.*)?$/);
    const value = quoted ? quoted[2] : raw.split("#", 1)[0].trim();
    return [[match[1], value]];
  });
  return new Map(entries);
}

let warned = false;
for (const [example, actual] of [
  ["server/example.env", "server/.env"],
  ["web/example.env", "web/.env.local"],
  ["mobile/example.env", "mobile/.env.local"],
]) {
  if (!existsSync(`${root}${example}`)) {
    console.warn(`⚠️ Cannot check ${actual}: ${example} is missing.`);
    warned = true;
    continue;
  }
  const expected = readValues(`${root}${example}`);
  const values = readValues(`${root}${actual}`);
  const missing = [...expected.keys()].filter((key) => {
    if (!expected.get(key)) return false;
    const value = values.get(key);
    return !value?.trim() || value.trim() === "XXXX";
  });
  if (missing.length > 0) {
    console.warn(`⚠️ Update ${actual} using ${example}: ${missing.join(", ")}`);
    warned = true;
  }
}
if (!warned) console.log("✅ Server, web, and mobile environment values are filled in.");
