"use strict";

const { execFileSync } = require("node:child_process");
const { readdirSync, statSync } = require("node:fs");
const { join } = require("node:path");

const roots = ["src", "scripts"];
const files = [];

function collect(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);

    if (stat.isDirectory()) {
      collect(path);
    } else if (path.endsWith(".js")) {
      files.push(path);
    }
  }
}

roots.forEach(collect);

for (const file of files) {
  execFileSync(process.execPath, ["--check", file], { stdio: "inherit" });
}

console.log("Checked " + files.length + " JavaScript files.");
