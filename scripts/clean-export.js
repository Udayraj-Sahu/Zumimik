const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const targets = ["out", ".next", "tsconfig.tsbuildinfo"];

for (const t of targets) {
  const p = path.join(root, t);
  if (fs.existsSync(p)) {
    fs.rmSync(p, { recursive: true, force: true });
    console.log(`  Cleaned: ${t}`);
  }
}