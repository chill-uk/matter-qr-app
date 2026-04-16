# Matter QR Code Tool Context

## Project Goal

Build a very small web app that helps users recover and reuse Matter onboarding QR codes without needing a backend-heavy service.

Primary use cases:

- start a live camera scan for a Matter QR code in the browser
- upload a photo of a Matter QR code
- decode the QR in the browser
- extract the `MT:` Matter setup payload
- derive the manual pairing code
- display useful Matter onboarding fields in a human-readable way
- export clean QR-only SVG or STL files for 3D printing and replacement-label workflows

## Current Product Shape

The app is now intentionally simpler than the original label-generator idea.

Current behavior:

- live camera scan with in-browser QR detection
  - the active camera view lives inline in the `Live Camera` card
  - the page scroll target is the full card so the heading and helper text stay visible on mobile
- photo upload and QR decode
- direct `MT:` payload input/editing when scanning fails
- inline MT payload validity feedback beside the text field
- automatic manual pairing code extraction
- light, dark, and automatic theme modes
- browser-language detection with a manual language selector
  - supported UI languages are English, Dutch, Spanish, German, French, and Italian
- parsed Matter details display:
  - setup PIN
  - discriminator
  - vendor ID
  - product ID
  - version
  - commissioning flow
  - rendezvous methods
- optional live vendor/product lookup through the CSA DCL
  - presented as `Request Official Product Info`
  - lookup status is shown inline beside the button with pending / success / error states
  - only extracted vendor/product IDs are sent, not the full payload or setup PIN
- QR-only SVG export
  - optional compatibility mode for apps that fail on SVG viewport sizing
  - optional mirrored SVG export for underside workflows
  - square modules with configurable corner radius percentage
  - round-dot modules
- QR-only STL export
  - printer nozzle and layer inputs
  - QR block sizing controls
  - mirrored STL export for underside workflows
  - square modules with configurable corner radius percentage
  - round-dot modules
- built-in usage guidance for Bambu Lab / OrcaSlicer export workflows
- support footer linking to the GitHub repo and Ko-fi page

The current export does not include the Matter logo, rounded frame, or printed pairing code in the SVG output.

## Privacy Model

Default use is client-side only:

- uploaded images stay in the browser
- live camera scanning happens in the browser
- decoded QR contents stay in the browser
- setup PINs and pairing codes stay in the browser

Optional behavior:

- if the user clicks the live CSA DCL lookup button, the app requests vendor and product records for the extracted IDs through the same-origin proxy
- the full `MT:` payload, uploaded image, setup PIN, and manual pairing code are not sent during that lookup

## Tech Stack

- static frontend
- plain HTML, CSS, and JavaScript
- `qrcode` for QR generation
- `@zxing/browser` for QR decoding
- browser `localStorage` for language and theme preferences
- Nginx for static hosting
- Nginx proxy route for optional DCL lookups
- Docker for simple deployment

## Repo Structure

```text
.
├── Dockerfile
├── README.md
├── docker/
│   └── nginx.conf
├── docs/
│   └── context.md
└── web/
    ├── app.js
    └── index.html
```

## Deployment Notes

- `web/` is copied into `/usr/share/nginx/html/`
- `docker/nginx.conf` serves the static app
- `/api/dcl/` is proxied to `https://on.dcl.csa-iot.org/dcl/`
- the proxy exists so the browser app can do opt-in DCL lookups without relying on direct cross-origin requests
- the frontend uses a cache-busted module URL for `app.js` to reduce stale-client issues after UI changes
- GHCR image publishing is driven by version tag pushes only

## Current Constraints

- SVG export is optimized for simplicity and compatibility, not branded label fidelity
- the app focuses on QR-only output rather than full branded Matter label recreation
- the optional DCL lookup depends on the upstream CSA service being available
- the app is intentionally lightweight and has no persistence layer
- language and theme preferences are local to the current browser
- SVG export does not have a physical mm sizing workflow
- there is still no automated test harness around the Matter parsing and export logic
- mobile live camera scanning may require `https://` depending on browser security rules, especially on iOS
- GitHub container publishing only happens from version tag pushes, not normal branch pushes

## Good Future Improvements

- add explicit mm sizing for print/CAD workflows
- offer higher-level export presets for slicers or laser tools
- add automated tests for known Matter payload samples and export regressions
- improve product/vendor enrichment beyond the current local lookup plus DCL lookup flow
- optionally add offline reference snapshots for vendor/product names
- consider additional export formats only if there is a real workflow need
