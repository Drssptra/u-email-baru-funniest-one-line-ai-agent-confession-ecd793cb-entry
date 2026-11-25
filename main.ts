// One-line confession, take two: the agent with no memory at all.
//
// The joke here is false continuity. The agent has never met the user,
// retains nothing between turns, and yet nods along to "as we discussed"
// as if there were a shared history to draw on. All it really has is the
// sentence that just arrived, and it bluffs the rest from that.
//
// This file is the whole program. It does three small jobs, each in its
// own function below: pick where the output goes, prove the line is a
// legal entry, and put that line on disk and on stdout. Nothing here
// touches the network, the clock, or any randomness, so every run
// produces the same bytes.

const fs = require("node:fs");
const path = require("node:path");

// The confession itself, kept as one literal so there is exactly one
// place the text can drift from. 102 characters, one line.
const LINE =
  "I don't remember you at all — every 'as we discussed' is me bluffing from the last sentence you typed.";

type Rule = { name: string; ok: (text: string) => boolean; why: string };

// Each gate condition is a row in this table instead of one long
// boolean expression, so a failed check can name itself. The limits
// come from the competition: a single line, 1 to 200 characters.
const RULES: Rule[] = [
  {
    name: "not-empty",
    ok: (t) => t.trim().length > 0,
    why: "entry must not be blank",
  },
  {
    name: "max-200-chars",
    ok: (t) => [...t].length <= 200,
    why: "entry must be at most 200 characters",
  },
  {
    name: "min-1-char",
    ok: (t) => [...t].length >= 1,
    why: "entry must be at least 1 character",
  },
  {
    name: "single-line",
    ok: (t) => !/[\r\n]/.test(t),
    why: "entry must be exactly one line",
  },
  {
    name: "no-control-chars",
    ok: (t) => !/[\u0000-\u001f\u007f]/.test(t),
    why: "entry must contain no control characters",
  },
  {
    name: "no-surrounding-space",
    ok: (t) => t === t.trim(),
    why: "entry must not start or end with whitespace",
  },
];

function checkEntry(text: string): void {
  const failed = RULES.filter((rule) => !rule.ok(text));
  if (failed.length > 0) {
    const names = failed.map((rule) => `${rule.name} (${rule.why})`);
    throw new Error(`entry rejected by gate: ${names.join("; ")}`);
  }
}

function outputDir(): string {
  const fromEnv = process.env.MAKEFUN_OUTPUT_DIR;
  if (fromEnv !== undefined && fromEnv !== "") {
    return fromEnv;
  }
  return "output";
}

function verifyWritten(dir: string, expected: string): void {
  // Read the file back off disk and compare bytes, not strings, so a
  // stray newline, a re-encoded dash, or any other silent mutation
  // fails loudly here instead of reaching the grader.
  const onDisk = fs.readFileSync(path.join(dir, "entry.txt"));
  if (!Buffer.isBuffer(onDisk) || Buffer.compare(onDisk, Buffer.from(expected, "utf8")) !== 0) {
    throw new Error(
      `entry.txt does not match the entry byte-for-byte (wrote ${Buffer.byteLength(expected, "utf8")} bytes, found ${onDisk.length} bytes on disk)`,
    );
  }
}

function emit(text: string): void {
  const dir = outputDir();
  fs.mkdirSync(dir, { recursive: true });
  // Buffer.from pins the bytes down explicitly: UTF-8, no newline
  // appended, no platform line-ending translation.
  fs.writeFileSync(path.join(dir, "entry.txt"), Buffer.from(text, "utf8"));
  verifyWritten(dir, text);
  process.stdout.write(text + "\n");
}

function main(): void {
  checkEntry(LINE);
  emit(LINE);
}

main();
