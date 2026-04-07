# Matter QR Tool

A small client-side web app for decoding Matter QR codes, inspecting the extracted onboarding data, and exporting an SVG / STL QR label for transplanting onto 3D-printed models.

## Why

I built this tool to help transplant Matter QR codes onto 3D printed models, for example in this [IKEA Bilresa to dual wall switch conversion](https://makerworld.com/en/models/2615078-ikea-bilresa-to-dual-wall-switch-conversion). The QR code is stored on the outer body and, without it, you cannot properly reset and recommission the device, which can make the hardware effectively useless.

Note: The regenerated QR code will often look different from the original label. Different QR generators choose different mask patterns, module layouts, sizing, quiet-zone handling, but it will still encode the exact same `MT:` payload.

## What It Does

### Decode

- Upload a photo of a Matter QR code and decode it in the browser
- Extract the `MT:` Matter setup payload
- Derive the manual pairing code

#### If Decoding Fails

If photo upload does not find a QR code, use your phone or another QR scanning app to read the code, copy the `MT:` value, and paste it directly into the `MT:` text field in the app. You must use a 3rd party app to scan the QR code as the apple built in one will try and pair your device.

### Inspect

- Parse common Matter onboarding fields such as:
  - setup PIN
  - discriminator
  - vendor ID
  - product ID
  - commissioning flow
  - rendezvous methods
- Optionally look up official vendor and product metadata from the CSA Distributed Compliance Ledger (DCL)

### Export

- Export an SVG
- Export an STL

## STL Instructions for Bambu Lab / OrcaSlicer

- Generate and download the QR code STL
- Right-click the part you want to modify.
- Choose Add modifier, then Load, and select the QR-code STL.
- Position the modifier where you want the QR.
- Change the filament color so it shows up on the finished print.
- If the final visible QR would end up reversed, enable the mirror option before exporting.

## Privacy

Default use is fully client-side:

- uploaded images stay in the browser
- decoded QR contents stay in the browser
- setup PINs and pairing codes stay in the browser

The only exception is the optional live DCL lookup button. When used, it requests the vendor and product records for the extracted IDs through the app's same-origin proxy to the official CSA DCL service. The full `MT:` payload is not sent during that lookup, though some CSA deployments may require a public vendor-directory fallback for vendor enrichment.

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
- `docs/context.md` keeps the project notes and current scope

## Running With Docker

Build:

```bash
docker build -t matter-qr-tool .
```

Run:

```bash
docker run -p 8080:80 matter-qr-tool
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

## Support

If this tool saved you some time, you can support it on Ko-fi:

- [ko-fi.com/chill_uk](https://ko-fi.com/chill_uk)
