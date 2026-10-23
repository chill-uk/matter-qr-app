# Frontend development guide

The website is a static browser application, deployed through Cloudflare Workers Static Assets or Docker/nginx.

## Main source files

- `web/index.html`: semantic page structure and controls.
- `web/styles/app.css`: responsive layout, themes, and presentation.
- `web/i18n/translations.js`: user-facing translations for all six supported languages.
- `web/app.js`: browser events, scanning, Matter payload parsing, DCL enrichment, and SVG/STL export.
- `cloudflare/worker.js`: optional same-origin proxy for CSA DCL lookups.

Avoid adding large CSS blocks or new translation dictionaries directly to `index.html` or `app.js`.

## Development

```bash
npm ci
npm run build
npm run dev:cloudflare
```

The bundled QR libraries are built into `web/vendor/`. No CDN is necessary at runtime.

## Architecture and next refactor

`app.js` still contains several independent responsibilities. Future changes should incrementally extract pure, testable functions into `matter/`, `exporters/`, `services/` and `ui/` modules.

**Do not change Matter payload parsing or QR geometry in a readability-only patch without regression fixtures.** Before touching those algorithms, add tests for valid/invalid Base38 chunks, commissioning fields, the Verhoeff manual pairing-code checksum, QR round trips, and exported geometry.

## UI terminology

Prefer everyday wording in the main workflow and retain protocol-specific names in technical details. For example, describe the Matter onboarding payload as device pairing information, rendezvous methods as connection methods, and commissioning flow as setup method. Update all six locales whenever changing existing terminology.

## Privacy

QR images, setup PINs, and pairing codes should stay inside the browser. The optional DCL request should contain only public vendor/product identifiers. Avoid logging or transmitting complete `MT:` values.
