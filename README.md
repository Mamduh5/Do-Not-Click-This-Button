# Do Not Click This Button

## Development and deployment

Use Node.js 22.12+ (Node.js 22 LTS recommended).

| Task | Command |
| --- | --- |
| Install | `npm ci` |
| Development | `npm run dev` |
| Production build | `npm run build` |
| Production preview | `npm run preview` |
| Cloudflare local preview | `npm run preview:cloudflare` |
| Cloudflare deployment | `npm run deploy:cloudflare` |

The build produces `dist/index.html` and `dist/arena.html`. Open `/` and
`/arena.html` on the preview server; the existing links connect both games.
Vite emits the ordered classic scripts (including Phaser), processes CSS, and
copies `public/` assets. The existing Google Fonts stylesheet requires internet access.

Cloudflare Workers serves `dist/` using `wrangler.jsonc`, with no Worker runtime
entry point. Authenticate with `npx wrangler login` before deploying manually.
See the [Cloudflare static assets guide](https://developers.cloudflare.com/workers/static-assets/get-started/).

For Cloudflare Pages / Git integration, select the repository root and use:

```yaml
Build command: npm run build
Output directory: dist
```

No Pages-specific runtime code is required. Build output and Wrangler local state
are ignored by Git.
