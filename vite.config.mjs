import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const entryPoints = ["index.html", "arena.html"];
const fromRoot = (path) => fileURLToPath(new URL(path, import.meta.url));
const classicScript = /<script\s+src="([^"]+)"\s*><\/script>/g;

// Keep the existing classic-script globals and blocking execution order intact.
// Only production HTML is rewritten; game sources and development stay unchanged.
function classicScriptAssets() {
  const scripts = new Map();
  return {
    name: "classic-script-assets",
    apply: "build",
    buildStart() {
      scripts.clear();
      for (const entry of entryPoints) {
        for (const [, path] of readFileSync(fromRoot(entry), "utf8").matchAll(classicScript)) {
          if (!scripts.has(path)) {
            scripts.set(path, {
              marker: `<!-- classic-script-${scripts.size} -->`,
              reference: this.emitFile({
                type: "asset",
                name: basename(path),
                source: readFileSync(fromRoot(path)),
              }),
            });
          }
        }
      }
    },
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        return html.replace(classicScript, (_, path) => scripts.get(path).marker);
      },
    },
    generateBundle: {
      order: "post",
      handler(_, bundle) {
        for (const entry of entryPoints) {
          const html = bundle[entry];
          if (!html || html.type !== "asset") this.error(`Missing HTML entry: ${entry}`);
          let source = String(html.source);
          for (const { marker, reference } of scripts.values()) {
            source = source.replaceAll(marker, `<script src="/${this.getFileName(reference)}"></script>`);
          }
          html.source = source;
        }
      },
    },
  };
}

export default defineConfig({
  plugins: [classicScriptAssets()],
  build: {
    rolldownOptions: {
      input: Object.fromEntries(entryPoints.map((entry) => [entry, fromRoot(entry)])),
    },
  },
});
