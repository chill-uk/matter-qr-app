# Matter QR Tool

A small client-side web app for decoding Matter QR codes, inspecting the extracted onboarding data, and exporting a clean SVG QR label.

I built this tool to help transplant Matter QR codes onto 3D printed models, for example in this [IKEA Bilresa to dual wall switch conversion](https://makerworld.com/en/models/2615078-ikea-bilresa-to-dual-wall-switch-conversion). Without the setup code, you cannot properly reset and recommission the device, which can make the hardware effectively useless.

If photo upload does not find a QR code, use your phone or another QR scanning app to read the code, copy the `MT:` value, and paste it directly into the `MT:` text field in the app.

## What It Does

- Upload a photo of a Matter QR code and decode it in the browser
- Extract the `MT:` Matter setup payload
- Derive the manual pairing code
- Parse common Matter onboarding fields such as:
  - setup PIN
  - discriminator
  - vendor ID
  - product ID
  - commissioning flow
  - rendezvous methods
- Optionally look up official vendor and product metadata from the CSA Distributed Compliance Ledger (DCL)
- Export a QR-only SVG, including a compatibility mode for tools that struggle with SVG viewport sizing

## Privacy

Default use is fully client-side:

- uploaded images stay in the browser
- decoded QR contents stay in the browser
- setup PINs and pairing codes stay in the browser

The only exception is the optional live DCL lookup button. When used, it sends only the extracted vendor ID and product ID through the app's same-origin proxy to the official CSA DCL service.

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

## Local Structure Notes

- `web/` contains the static browser app
- `docker/nginx.conf` serves the site and proxies `/api/dcl/` to the official CSA DCL observer node
- `docs/context.md` keeps the original project notes and scope

## Running With Docker

Build:

```bash
docker build -t matter-qr-tool .
```

Run:

```bash
docker run --rm -p 8080:80 matter-qr-tool
```

Then open:

```text
http://localhost:8080
```

## Pull From GHCR

Pull the latest published image:

```bash
docker pull ghcr.io/chill-uk/matter-qr-app:latest
```

Then run it:

```bash
docker run --rm -p 8080:80 ghcr.io/chill-uk/matter-qr-app:latest
```

## Notes

- The live DCL lookup works best when the app is served through the included Nginx config, because the proxy avoids browser CORS issues against the public DCL endpoints.
- The generated SVG is intentionally minimal to work better with CAD and slicer workflows.
- The Matter setup payload and pairing code are sensitive and should not be shared casually.
