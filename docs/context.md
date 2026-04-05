# Matter QR Tool Context

## Project Goal

Build a very small web app that helps users work with Matter onboarding QR codes without needing a backend-heavy service.

Primary use cases:

- upload a photo of a Matter QR code
- decode the QR in the browser
- extract the `MT:` Matter setup payload
- derive the manual pairing code
- display useful Matter onboarding fields in a human-readable way
- export a clean QR-only SVG for CAD, laser, or slicer workflows

## Current Product Shape

The app is now intentionally simpler than the original label-generator idea.

Current behavior:

- photo upload and QR decode
- direct `MT:` payload input/editing
- automatic manual pairing code extraction
- parsed Matter details display:
  - setup PIN
  - discriminator
  - vendor ID
  - product ID
  - version
  - commissioning flow
  - rendezvous methods
- optional live vendor/product lookup through the CSA DCL
- QR-only SVG export
- compatibility mode for apps that fail on SVG viewport sizing

The current export does not include the Matter logo, rounded frame, or printed pairing code in the SVG output.

## Privacy Model

Default use is client-side only:

- uploaded images stay in the browser
- decoded QR contents stay in the browser
- setup PINs and pairing codes stay in the browser

Optional behavior:

- if the user clicks the live CSA DCL lookup button, only the extracted vendor ID and product ID are sent through the app's same-origin proxy to the official CSA DCL service

## Tech Stack

- static frontend
- plain HTML, CSS, and JavaScript
- `qrcode` for QR generation
- `@zxing/browser` for QR decoding
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

## Current Constraints

- SVG export is optimized for simplicity and compatibility, not branded label fidelity
- the optional DCL lookup depends on the upstream CSA service being available
- the app is intentionally lightweight and has no persistence layer
- no mm-based physical sizing workflow has been added yet

## Good Future Improvements

- add explicit mm sizing for print/CAD workflows
- offer higher-level export presets for slicers or laser tools
- improve product/vendor enrichment beyond the current local lookup plus DCL lookup flow
- optionally add offline reference snapshots for vendor/product names
- consider additional export formats only if there is a real workflow need
