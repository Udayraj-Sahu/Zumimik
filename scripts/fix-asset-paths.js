const fs = require("fs");
const path = require("path");

const outDir = path.join(__dirname, "..", "out");

function fixFile(filePath) {
  const ext = path.extname(filePath);
  if (ext === ".css") {
    let content = fs.readFileSync(filePath, "utf-8");
    const original = content;

    // CSS files live at out/_next/static/css/. Rewrite root-absolute
    // url() refs so they resolve relative to the css dir (file:// scheme).
    content = content.replace(/url\(\/_next\/static\/media\//g, "url(../media/");
    content = content.replace(/url\(\/_next\/static\//g, "url(../../static/");
    content = content.replace(/url\(\/(manifest\.json|favicon\.svg|favicon\.ico)\)/g, "url(../../$1)");

    if (content !== original) {
      fs.writeFileSync(filePath, content, "utf-8");
      console.log(`  Fixed: ${path.relative(outDir, filePath)}`);
    }
    return;
  }
  if (ext !== ".html" && ext !== ".txt") return;

  let content = fs.readFileSync(filePath, "utf-8");
  const original = content;

  // Fix href/src in HTML tags: href="/_next/..." → href="./_next/..."
  content = content.replace(
    /(href|src|action)="\/(?:_next|manifest\.json|favicon\.svg)\//g,
    (m) => m.replace('="/', '="./'),
  );
  content = content.replace(
    /(href|src)="\/(manifest\.json|favicon\.svg)"/g,
    (m) => m.replace('="/', '="./'),
  );

  // Fix absolute paths in Flight data (inline <script> content)
  // Pattern: \"/_next/static/...\" inside escaped JSON strings
  content = content.replace(
    /\\"\/(_next\/static\/[^"\\]+)\\"/g,
    '\\"$1\\"',
  );
  content = content.replace(
    /\\"\/(manifest\.json|favicon\.svg)\\"/g,
    '\\"$1\\"',
  );

  // Fix absolute paths in plain Flight data (uncommon but handle both)
  // Pattern: "/_next/static/..." inside JSON strings
  content = content.replace(
    /"\/(_next\/static\/[^"]*)"/g,
    '"$1"',
  );

  if (content !== original) {
    fs.writeFileSync(filePath, content, "utf-8");
    console.log(`  Fixed: ${path.relative(outDir, filePath)}`);
  }
}

function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath);
    } else if (entry.isFile()) {
      fixFile(fullPath);
    }
  }
}

console.log("Fixing asset paths in out/...");
walkDir(outDir);
console.log("Done.");
