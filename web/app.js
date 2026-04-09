import QRCode from "https://cdn.jsdelivr.net/npm/qrcode@1.5.4/+esm";
import {
  BrowserMultiFormatReader
} from "https://cdn.jsdelivr.net/npm/@zxing/browser@0.1.5/+esm";

const imageReader = new BrowserMultiFormatReader();
const cameraReader = new BrowserMultiFormatReader();
let finalSVG = "";
let finalSTL = "";
const fileInput = document.getElementById("file");
const startCameraBtn = document.getElementById("startCameraBtn");
const stopCameraBtn = document.getElementById("stopCameraBtn");
const cameraPanel = document.getElementById("cameraPanel");
const cameraPreview = document.getElementById("cameraPreview");
const cameraStatus = document.getElementById("cameraStatus");
const dataInput = document.getElementById("data");
const payloadValidity = document.getElementById("payloadValidity");
const manualDisplay = document.getElementById("manualDisplay");
const lookupBtn = document.getElementById("dclLookupBtn");
const lookupStatus = document.getElementById("lookupStatus");
const detailsGrid = document.getElementById("detailsGrid");
const output = document.getElementById("output");
const status = document.getElementById("status");
const svgModeBtn = document.getElementById("svgModeBtn");
const stlModeBtn = document.getElementById("stlModeBtn");
const svgExportSection = document.getElementById("svgExportSection");
const stlExportSection = document.getElementById("stlExportSection");
const downloadBtn = document.getElementById("downloadBtn");
const downloadStlBtn = document.getElementById("downloadStlBtn");
const bambuSafeModeInput = document.getElementById("bambuSafeMode");
const mirrorOutputInput = document.getElementById("mirrorOutput");
const moduleShapeInput = document.getElementById("moduleShape");
const cornerRadiusPercentInput = document.getElementById("cornerRadiusPercent");
const nozzleSizeInput = document.getElementById("nozzleSize");
const layerHeightInput = document.getElementById("layerHeight");
const moduleMultiplierInput = document.getElementById("moduleMultiplier");
const raisedLayerCountInput = document.getElementById("raisedLayerCount");
const stlSummary = document.getElementById("stlSummary");
const MATTER_QR_PREFIX = "MT:";
const MATTER_BASE38_CHARSET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-.";
const STANDARD_COMMISSIONING_FLOW = 0;
const MATTER_LONG_TO_SHORT_DISCRIMINATOR_SHIFT = 8;
const DCL_PROXY_BASE = "/api/dcl";
const QR_QUIET_ZONE_MODULES = 4;
const QR_MODULE_SHAPES = {
  SQUARE: "square",
  ROUND: "round"
};
const ROUND_STL_SEGMENTS = 48;
const DEFAULT_CORNER_RADIUS_PERCENT = 50;
const MODULE_CORNER_SEGMENTS = 4;
const MODULE_CORNER_BITS = {
  TOP_LEFT: 1,
  TOP_RIGHT: 2,
  BOTTOM_RIGHT: 4,
  BOTTOM_LEFT: 8
};
const MODULE_CORNER_CONFIGS = [
  {
    bit: MODULE_CORNER_BITS.TOP_LEFT,
    key: "topLeft",
    sideA: [-1, 0],
    sideB: [0, -1],
    diagonal: [-1, -1],
    corner: [0, 0],
    entry: [1, 0],
    center: [1, 1],
    arcStart: (3 * Math.PI) / 2,
    arcEnd: Math.PI
  },
  {
    bit: MODULE_CORNER_BITS.TOP_RIGHT,
    key: "topRight",
    sideA: [-1, 0],
    sideB: [0, 1],
    diagonal: [-1, 1],
    corner: [1, 0],
    entry: [0, 1],
    center: [-1, 1],
    arcStart: 0,
    arcEnd: -Math.PI / 2
  },
  {
    bit: MODULE_CORNER_BITS.BOTTOM_RIGHT,
    key: "bottomRight",
    sideA: [1, 0],
    sideB: [0, 1],
    diagonal: [1, 1],
    corner: [1, 1],
    entry: [-1, 0],
    center: [-1, -1],
    arcStart: Math.PI / 2,
    arcEnd: 0
  },
  {
    bit: MODULE_CORNER_BITS.BOTTOM_LEFT,
    key: "bottomLeft",
    sideA: [1, 0],
    sideB: [0, -1],
    diagonal: [1, -1],
    corner: [0, 1],
    entry: [0, -1],
    center: [1, -1],
    arcStart: Math.PI,
    arcEnd: Math.PI / 2
  }
];
const KNOWN_VENDOR_NAMES = {
  4476: "IKEA of Sweden"
};
const KNOWN_PRODUCT_NAMES = {
  4476: {
    32771: "DIRIGERA Hub for smart products"
  }
};
let lastAutoManualCode = "";
let currentPayload = null;
let liveLookupData = null;
let liveLookupPending = false;
let vendorDirectoryPromise = null;
const modelLookupCache = new Map();
let exportMode = "stl";
let cameraScanControls = null;
let cameraScanActive = false;

function formatSvgNumber(value) {
  return Number.parseFloat(value.toFixed(3)).toString();
}

function formatMillimeters(value) {
  return `${Number.parseFloat(value.toFixed(2)).toString()} mm`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function setStatus(message, isError = false) {
  if (!status) {
    return;
  }

  status.classList.remove("is-success", "is-error");

  if (!message) {
    status.innerHTML = '<span class="validity-icon">-</span><span>Waiting For Upload</span>';
    return;
  }

  status.classList.add(isError ? "is-error" : "is-success");
  status.innerHTML = `<span class="validity-icon">${isError ? "✕" : "✓"}</span><span>${escapeHtml(message)}</span>`;
}

function setCameraStatus(message, isError = false) {
  if (!cameraStatus) {
    return;
  }

  cameraStatus.textContent = message;
  cameraStatus.classList.toggle("is-error", Boolean(isError && message));
}

function updateCameraUi(isActive) {
  if (cameraPanel) {
    cameraPanel.hidden = !isActive;
  }

  if (startCameraBtn) {
    startCameraBtn.disabled = isActive;
  }

  if (stopCameraBtn) {
    stopCameraBtn.disabled = !isActive;
  }
}

function updatePayloadValidity(state) {
  if (!payloadValidity) {
    return;
  }

  payloadValidity.classList.remove("is-valid", "is-invalid");

  if (state === "valid") {
    payloadValidity.classList.add("is-valid");
    payloadValidity.innerHTML = '<span class="validity-icon">✓</span><span>Valid MT Code</span>';
    return;
  }

  if (state === "invalid") {
    payloadValidity.classList.add("is-invalid");
    payloadValidity.innerHTML = '<span class="validity-icon">✕</span><span>Invalid MT Code</span>';
    return;
  }

  payloadValidity.innerHTML = '<span class="validity-icon">-</span><span>Waiting For Input</span>';
}

function updateManualDisplay(value) {
  manualDisplay.textContent = value || "-";
  manualDisplay.style.color = value ? "#111" : "#888";
}

function setLookupStatus(message, isError = false) {
  lookupStatus.textContent = message;
  lookupStatus.style.color = isError ? "#b00020" : "#6c6358";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function formatMatterHex(value) {
  return `0x${value.toString(16).toUpperCase().padStart(4, "0")}`;
}

function getPayloadLookupKey(payload) {
  return payload ? `${payload.vendorId}:${payload.productId}` : "";
}

function getActiveLookupData(payload) {
  const payloadKey = getPayloadLookupKey(payload);
  if (!payloadKey || !liveLookupData || liveLookupData.key !== payloadKey) {
    return null;
  }
  return liveLookupData;
}

function clearLiveLookupData() {
  liveLookupData = null;
  liveLookupPending = false;
  setLookupStatus("");
}

function updateLookupButtonState() {
  const hasPayload = Boolean(currentPayload);
  lookupBtn.disabled = !hasPayload || liveLookupPending;

  if (liveLookupPending) {
    lookupBtn.textContent = "Looking Up Official Info...";
    return;
  }

  lookupBtn.textContent =
    getActiveLookupData(currentPayload)
      ? "Refresh Official Vendor/Product Info"
      : "Lookup Official Vendor/Product Info";
}

function updateExportModeUi() {
  const isSvgMode = exportMode === "svg";

  svgModeBtn.classList.toggle("is-active", isSvgMode);
  stlModeBtn.classList.toggle("is-active", !isSvgMode);
  svgModeBtn.setAttribute("aria-selected", String(isSvgMode));
  stlModeBtn.setAttribute("aria-selected", String(!isSvgMode));
  svgModeBtn.tabIndex = isSvgMode ? 0 : -1;
  stlModeBtn.tabIndex = isSvgMode ? -1 : 0;
  svgExportSection.hidden = !isSvgMode;
  stlExportSection.hidden = isSvgMode;
  downloadBtn.hidden = !isSvgMode;
  downloadStlBtn.hidden = isSvgMode;
}

function formatCommissioningFlow(value) {
  if (value === 0) return "Standard";
  if (value === 1) return "User-Intent";
  if (value === 2) return "Custom";
  return String(value);
}

function formatRendezvousInformation(value) {
  const methods = [];

  if (value & 0x01) methods.push("SoftAP");
  if (value & 0x02) methods.push("BLE");
  if (value & 0x04) methods.push("On-network");

  if (methods.length === 0) {
    return `Unknown (${value})`;
  }

  return methods.join(", ");
}

function getVendorName(vendorId, vendorRecord = null) {
  return (
    vendorRecord?.vendorName?.trim() ||
    vendorRecord?.companyPreferredName?.trim() ||
    KNOWN_VENDOR_NAMES[vendorId] ||
    ""
  );
}

function getProductName(vendorId, productId, modelRecord = null) {
  return (
    modelRecord?.productLabel?.trim() ||
    modelRecord?.productName?.trim() ||
    KNOWN_PRODUCT_NAMES[vendorId]?.[productId] ||
    ""
  );
}

function formatVendorDisplay(vendorId, vendorRecord = null) {
  const vendorName = getVendorName(vendorId, vendorRecord);
  const hexValue = formatMatterHex(vendorId);

  if (vendorName) {
    return `${vendorName} (${hexValue} / ${vendorId})`;
  }

  return `${hexValue} / ${vendorId}`;
}

function formatProductDisplay(vendorId, productId, modelRecord = null) {
  const productName = getProductName(vendorId, productId, modelRecord);
  const hexValue = formatMatterHex(productId);

  if (productName) {
    return `${productName} (${hexValue} / ${productId})`;
  }

  return `${hexValue} / ${productId}`;
}

function buildLinkValue(url, label) {
  try {
    const parsedUrl = new URL(url);

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return "";
    }

    return `<a href="${escapeHtml(parsedUrl.href)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`;
  } catch {
    return "";
  }
}

function renderDetailCards(details) {
  return details.map(({ key, value = "", valueHtml = "" }) => `
    <div class="detail-card">
      <div class="detail-key">${escapeHtml(key)}</div>
      <div class="detail-value">${valueHtml || escapeHtml(value)}</div>
    </div>
  `).join("");
}

function updateDetailsDisplay(payload) {
  if (!payload) {
    detailsGrid.innerHTML = "";
    return;
  }

  const lookupData = getActiveLookupData(payload);
  const vendorRecord = lookupData?.vendor ?? null;
  const modelRecord = lookupData?.model ?? null;
  const vendorHelp = vendorRecord?.companyLegalName
    ? `The certified manufacturer identifier assigned within Matter. Official DCL record: ${vendorRecord.companyLegalName}.`
    : "The certified manufacturer identifier assigned within Matter.";
  const productHelpParts = [
    "The manufacturer-defined product identifier for this device model."
  ];

  if (modelRecord?.productName && modelRecord.productName !== modelRecord.productLabel) {
    productHelpParts.push(`Official DCL model name: ${modelRecord.productName}.`);
  }

  if (modelRecord?.partNumber) {
    productHelpParts.push(`Part number: ${modelRecord.partNumber}.`);
  }

  const details = [
    {
      key: "Setup PIN",
      value: payload.setupPinCode,
      help: "The onboarding passcode used during commissioning."
    },
    {
      key: "Discriminator",
      value: payload.discriminator,
      help: "A short identifier that helps commissioners find the right device during setup."
    },
    {
      key: "Vendor ID",
      value: formatVendorDisplay(payload.vendorId, vendorRecord),
      help: vendorHelp
    },
    {
      key: "Product ID",
      value: formatProductDisplay(payload.vendorId, payload.productId, modelRecord),
      help: productHelpParts.join(" ")
    },
    {
      key: "Version",
      value: payload.version,
      help: "The payload format version encoded in the QR value."
    },
    {
      key: "Flow",
      value: formatCommissioningFlow(payload.commissioningFlow),
      help: "How the device expects commissioning to begin."
    },
    {
      key: "Rendezvous",
      value: formatRendezvousInformation(payload.rendezvousInformation),
      help: "The discovery or transport methods the device supports for setup."
    }
  ];

  if (modelRecord?.productName && modelRecord.productName !== modelRecord.productLabel) {
    details.push({
      key: "Model Name",
      value: modelRecord.productName,
      help: "The shorter product name from the official CSA DCL model record."
    });
  }

  if (modelRecord?.partNumber) {
    details.push({
      key: "Part Number",
      value: modelRecord.partNumber,
      help: "The manufacturer part number listed in the official CSA DCL model record."
    });
  }

  const dclLinks = [];

  if (vendorRecord?.vendorLandingPageURL) {
    dclLinks.push({
      key: "Vendor Page",
      valueHtml: buildLinkValue(vendorRecord.vendorLandingPageURL, "Open vendor site"),
      help: "The official vendor landing page from the CSA DCL record."
    });
  }

  if (modelRecord?.productUrl) {
    dclLinks.push({
      key: "Product Page",
      valueHtml: buildLinkValue(modelRecord.productUrl, "Open product page"),
      help: "The product page published in the official CSA DCL model record."
    });
  }

  if (modelRecord?.supportUrl) {
    dclLinks.push({
      key: "Support Page",
      valueHtml: buildLinkValue(modelRecord.supportUrl, "Open support page"),
      help: "The support page published in the official CSA DCL model record."
    });
  }

  const linkSection = dclLinks.length
    ? `
      <div class="detail-group-card">
        <div class="detail-section-title">Official DCL Links</div>
        <div class="details-links">
          ${renderDetailCards(dclLinks)}
        </div>
      </div>
    `
    : "";

  detailsGrid.innerHTML = `
    ${renderDetailCards(details)}
    ${linkSection}
  `;
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json"
    }
  });
  const responseText = await response.text();
  let responseData = null;

  if (responseText) {
    try {
      responseData = JSON.parse(responseText);
    } catch {
      if (response.ok) {
        throw new Error("Received a non-JSON response from the DCL lookup service.");
      }
    }
  }

  if (!response.ok) {
    const error = new Error(
      responseData?.message || `DCL lookup failed with status ${response.status}.`
    );

    error.status = response.status;
    throw error;
  }

  return responseData;
}

async function fetchDclVendorDirectory() {
  if (vendorDirectoryPromise) {
    return vendorDirectoryPromise;
  }

  vendorDirectoryPromise = (async () => {
    const vendors = new Map();
    let nextKey = "";

    do {
      const params = new URLSearchParams({
        "pagination.limit": "500"
      });

      if (nextKey) {
        params.set("pagination.key", nextKey);
      }

      const response = await fetchJson(`${DCL_PROXY_BASE}/vendorinfo/vendors?${params.toString()}`);

      for (const vendorRecord of response?.vendorInfo ?? []) {
        vendors.set(vendorRecord.vendorID, vendorRecord);
      }

      nextKey = response?.pagination?.next_key || "";
    } while (nextKey);

    return vendors;
  })().catch((error) => {
    vendorDirectoryPromise = null;
    throw error;
  });

  return vendorDirectoryPromise;
}

async function fetchDclVendorRecord(vendorId) {
  try {
    const response = await fetchJson(`${DCL_PROXY_BASE}/vendorinfo/vendors/${vendorId}`);

    if (Array.isArray(response?.vendorInfo)) {
      return response.vendorInfo[0] ?? null;
    }

    if (response?.vendorInfo) {
      return response.vendorInfo;
    }

    if (response?.vendor) {
      return response.vendor;
    }

    return null;
  } catch (error) {
    if (error.status === 404) {
      return null;
    }

    if (error.status === 501 || error.status === 405) {
      const vendors = await fetchDclVendorDirectory();
      return vendors.get(vendorId) || null;
    }

    throw error;
  }
}

async function fetchDclModelRecord(vendorId, productId) {
  const cacheKey = `${vendorId}:${productId}`;

  if (modelLookupCache.has(cacheKey)) {
    return modelLookupCache.get(cacheKey);
  }

  try {
    const response = await fetchJson(`${DCL_PROXY_BASE}/model/models/${vendorId}/${productId}`);
    const modelRecord = response?.model ?? null;

    modelLookupCache.set(cacheKey, modelRecord);
    return modelRecord;
  } catch (error) {
    if (error.status === 404 || error.status === 501) {
      modelLookupCache.set(cacheKey, null);
      return null;
    }

    throw error;
  }
}

async function lookupOfficialMatterInfo() {
  if (!currentPayload || liveLookupPending) {
    return;
  }

  const requestedPayload = currentPayload;
  const requestedKey = getPayloadLookupKey(requestedPayload);

  liveLookupPending = true;
  updateLookupButtonState();
  setLookupStatus("Looking up official CSA DCL vendor and model records...");

  try {
    const [vendorResult, modelResult] = await Promise.allSettled([
      fetchDclVendorRecord(requestedPayload.vendorId),
      fetchDclModelRecord(requestedPayload.vendorId, requestedPayload.productId)
    ]);

    if (requestedKey !== getPayloadLookupKey(currentPayload)) {
      return;
    }

    const vendorRecord = vendorResult.status === "fulfilled" ? vendorResult.value : null;
    const modelRecord = modelResult.status === "fulfilled"
      ? modelResult.value
      : null;

    if (vendorRecord || modelRecord) {
      liveLookupData = {
        key: requestedKey,
        vendor: vendorRecord,
        model: modelRecord
      };
      updateDetailsDisplay(currentPayload);

      if (vendorRecord && modelRecord) {
        setLookupStatus("Loaded official vendor and model metadata from the CSA DCL.");
      } else if (vendorRecord) {
        setLookupStatus("Loaded an official vendor record from the CSA DCL.");
      } else {
        setLookupStatus("Loaded an official model record from the CSA DCL.");
      }

      return;
    }

    liveLookupData = {
      key: requestedKey,
      vendor: null,
      model: null
    };
    updateDetailsDisplay(currentPayload);

    if (vendorResult.status === "fulfilled" && modelResult.status === "fulfilled") {
      setLookupStatus("No matching official vendor or model record was found in the CSA DCL.");
      return;
    }

    throw new Error("The DCL lookup returned no usable vendor or model data.");
  } catch (error) {
    clearLiveLookupData();
    updateDetailsDisplay(currentPayload);
    setLookupStatus(
      `Live DCL lookup is unavailable in this deployment: ${error.message} This usually means the /api/dcl proxy is missing or the upstream DCL service is temporarily unavailable.`,
      true
    );
  } finally {
    if (requestedKey === getPayloadLookupKey(currentPayload)) {
      liveLookupPending = false;
      updateLookupButtonState();
    }
  }
}

function clearGeneratedOutput() {
  output.innerHTML = "";
  finalSVG = "";
  finalSTL = "";
}

function renderPreviewError(message) {
  output.innerHTML = `<div class="preview-error">${escapeHtml(message)}</div>`;
}

function buildStlSummaryLine(parts) {
  const line = document.createElement("div");

  for (const part of parts) {
    if (part.strong) {
      const strong = document.createElement("strong");
      strong.textContent = part.strong;
      line.append(strong);
      continue;
    }

    line.append(part.text ?? "");
  }

  return line;
}

function updateStlSummary() {
  const { stl } = getExportOptions();
  const summaryLines = [
    buildStlSummaryLine([
      { text: "Each QR square will be " },
      { strong: formatMillimeters(stl.moduleSizeMm) },
      { text: "." }
    ]),
    buildStlSummaryLine([
      { text: "The QR will be " },
      { strong: formatMillimeters(stl.qrHeightMm) },
      { text: " tall." }
    ])
  ];
  const data = getNormalizedMatterQrText(dataInput.value);

  if (data) {
    try {
      const overallSize = getQrCanvasSize(data, stl.moduleSizeMm);
      summaryLines.push(buildStlSummaryLine([
        { text: "The full QR will be about " },
        { strong: `${formatMillimeters(overallSize)} x ${formatMillimeters(overallSize)}` },
        { text: "." }
      ]));
    } catch {
      // Ignore invalid data here. The main generator will surface a clearer error.
    }
  }

  summaryLines.push(
    buildStlSummaryLine([
      {
        text: stl.mirror
          ? "Mirroring is enabled for underside printing."
          : "Mirroring is currently off."
      }
    ])
  );

  while (stlSummary.firstChild) {
    stlSummary.removeChild(stlSummary.firstChild);
  }

  for (const line of summaryLines) {
    stlSummary.appendChild(line);
  }
}

function parsePositiveNumber(value, fallback) {
  const parsedValue = Number.parseFloat(value);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}

function parsePositiveInteger(value, fallback) {
  const parsedValue = Number.parseInt(value, 10);
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}

function parsePercent(value, fallback) {
  const parsedValue = Number.parseFloat(value);
  return Number.isFinite(parsedValue)
    ? clamp(parsedValue, 0, 100)
    : fallback;
}

function getCornerRadiusRatio(cornerRadiusPercent) {
  return clamp(cornerRadiusPercent, 0, 100) / 200;
}

function decimalStringWithPadding(number, length) {
  return String(number).padStart(length, "0");
}

function getNormalizedMatterQrText(text) {
  const payload = extractMatterQrPayload(text);
  return payload ? `${MATTER_QR_PREFIX}${payload}` : "";
}

function applyDecodedQrText(text, successMessage = "QR decoded.") {
  dataInput.value = text;
  syncManualCodeFromData({ force: true });
  generateLabel();
  setStatus(
    lastAutoManualCode
      ? "Valid QR code."
      : successMessage
  );
}

function stopCameraTracks() {
  if (!(cameraPreview instanceof HTMLVideoElement)) {
    return;
  }

  const stream = cameraPreview.srcObject;

  if (stream instanceof MediaStream) {
    for (const track of stream.getTracks()) {
      track.stop();
    }
  }

  cameraPreview.srcObject = null;
}

function stopCameraScan({ preserveStatus = false } = {}) {
  cameraScanActive = false;

  if (cameraScanControls) {
    cameraScanControls.stop();
    cameraScanControls = null;
  }

  stopCameraTracks();
  updateCameraUi(false);

  if (!preserveStatus) {
    setCameraStatus("");
  }
}

async function startCameraScan() {
  if (!startCameraBtn || !cameraPreview) {
    return;
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    setStatus("Camera scanning is not supported in this browser.", true);
    return;
  }

  stopCameraScan({ preserveStatus: true });
  cameraScanActive = true;
  updateCameraUi(true);
  setCameraStatus("Starting camera...");
  setStatus("Waiting for a live QR scan...");

  try {
    cameraScanControls = await cameraReader.decodeFromConstraints(
      {
        video: {
          facingMode: { ideal: "environment" }
        }
      },
      cameraPreview,
      (result) => {
        if (!cameraScanActive || !result) {
          return;
        }

        const text = result.getText();
        stopCameraScan({ preserveStatus: true });
        setCameraStatus("Scan complete.");
        applyDecodedQrText(text, "Live QR scan complete.");
      }
    );

    setCameraStatus("Point the camera at the Matter QR code.");
  } catch (error) {
    stopCameraScan({ preserveStatus: true });
    setCameraStatus("Unable to access the camera.", true);
    setStatus(`Camera scan failed: ${error.message}`, true);
  }
}

function extractMatterQrPayload(text) {
  if (!text) return "";

  for (const segment of text.trim().split("%")) {
    const normalizedSegment = segment.trim().toUpperCase();
    if (normalizedSegment.startsWith(MATTER_QR_PREFIX) && normalizedSegment.length > MATTER_QR_PREFIX.length) {
      return normalizedSegment.slice(MATTER_QR_PREFIX.length);
    }
  }

  return "";
}

function decodeBase38(payload) {
  const bytes = [];
  let remainingCharacters = payload.length;
  let offset = 0;

  while (remainingCharacters > 0) {
    let charactersInChunk = 0;
    let bytesInChunk = 0;

    if (remainingCharacters >= 5) {
      charactersInChunk = 5;
      bytesInChunk = 3;
    } else if (remainingCharacters === 4) {
      charactersInChunk = 4;
      bytesInChunk = 2;
    } else if (remainingCharacters === 2) {
      charactersInChunk = 2;
      bytesInChunk = 1;
    } else {
      throw new Error("Invalid Matter base38 payload length.");
    }

    let value = 0;

    for (let index = charactersInChunk - 1; index >= 0; index -= 1) {
      const digit = MATTER_BASE38_CHARSET.indexOf(payload[offset + index]);
      if (digit === -1) {
        throw new Error("Invalid character in Matter base38 payload.");
      }
      value = (value * 38) + digit;
    }

    for (let index = 0; index < bytesInChunk; index += 1) {
      bytes.push(value & 0xff);
      value >>= 8;
    }

    if (value > 0) {
      throw new Error("Invalid Matter base38 payload chunk.");
    }

    offset += charactersInChunk;
    remainingCharacters -= charactersInChunk;
  }

  return bytes;
}

function readBits(bytes, state, bitCount) {
  let value = 0;

  for (let offset = 0; offset < bitCount; offset += 1) {
    const bitIndex = state.index + offset;
    const byte = bytes[Math.floor(bitIndex / 8)];
    if (byte === undefined) {
      throw new Error("Matter payload ended unexpectedly.");
    }
    if (byte & (1 << (bitIndex % 8))) {
      value |= (1 << offset);
    }
  }

  state.index += bitCount;
  return value;
}

function parseMatterQrData(text) {
  const payload = extractMatterQrPayload(text);
  if (!payload) return null;

  const bytes = decodeBase38(payload);
  const state = { index: 0 };
  const version = readBits(bytes, state, 3);
  const vendorId = readBits(bytes, state, 16);
  const productId = readBits(bytes, state, 16);
  const commissioningFlow = readBits(bytes, state, 2);
  const rendezvousInformation = readBits(bytes, state, 8);
  const discriminator = readBits(bytes, state, 12);
  const setupPinCode = readBits(bytes, state, 27);
  const padding = readBits(bytes, state, 4);

  if (padding !== 0) {
    throw new Error("Matter payload padding bits are invalid.");
  }

  return {
    version,
    vendorId,
    productId,
    commissioningFlow,
    rendezvousInformation,
    discriminator,
    setupPinCode
  };
}

function computeVerhoeffCheckDigit(value) {
  const multiplicationTable = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
    [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
    [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
    [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
    [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
    [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
    [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
    [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
    [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
  ];
  const permutationTable = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
    [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
    [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
    [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
    [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
    [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
    [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
  ];
  const inverseTable = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9];
  const digits = value.split("").reverse().map((digit) => Number.parseInt(digit, 10));
  let checksum = 0;

  for (let index = 0; index < digits.length; index += 1) {
    checksum = multiplicationTable[checksum][permutationTable[(index + 1) % 8][digits[index]]];
  }

  return String(inverseTable[checksum]);
}

function generateManualPairingCode(text) {
  const payload = parseMatterQrData(text);
  if (!payload) return "";

  // The official Matter SDK derives the 4-bit manual discriminator from the
  // top bits of the 12-bit QR discriminator.
  const shortDiscriminator = (payload.discriminator >> MATTER_LONG_TO_SHORT_DISCRIMINATOR_SHIFT) & 0x0f;
  const hasVendorAndProduct = payload.commissioningFlow !== STANDARD_COMMISSIONING_FLOW;
  const chunk1 = ((shortDiscriminator >> 2) & 0x03) | (Number(hasVendorAndProduct) << 2);
  const chunk2 = (payload.setupPinCode & ((1 << 14) - 1)) | ((shortDiscriminator & 0x03) << 14);
  const chunk3 = (payload.setupPinCode >> 14) & ((1 << 13) - 1);

  let code =
    decimalStringWithPadding(chunk1, 1) +
    decimalStringWithPadding(chunk2, 5) +
    decimalStringWithPadding(chunk3, 4);

  if (hasVendorAndProduct) {
    code += decimalStringWithPadding(payload.vendorId, 5);
    code += decimalStringWithPadding(payload.productId, 5);
  }

  return code + computeVerhoeffCheckDigit(code);
}

function syncManualCodeFromData({ force = false } = {}) {
  const data = getNormalizedMatterQrText(dataInput.value);
  const previousLookupKey = getPayloadLookupKey(currentPayload);

  try {
    const payload = parseMatterQrData(data);
    const extractedCode = generateManualPairingCode(data);
    const nextLookupKey = getPayloadLookupKey(payload);
    const shouldUpdateManual = force || extractedCode !== lastAutoManualCode;

    currentPayload = payload;

    if (previousLookupKey !== nextLookupKey) {
      clearLiveLookupData();
    }

    lastAutoManualCode = extractedCode;

    if (shouldUpdateManual) {
      updateManualDisplay(extractedCode);
    }

    updatePayloadValidity(payload ? "valid" : "empty");
    updateLookupButtonState();
    updateDetailsDisplay(payload);
  } catch {
    currentPayload = null;
    clearLiveLookupData();
    lastAutoManualCode = "";
    updateManualDisplay("");
    updatePayloadValidity(data ? "invalid" : "empty");
    updateLookupButtonState();
    updateDetailsDisplay(null);
  }
}

function getExportOptions() {
  const nozzleSize = parsePositiveNumber(nozzleSizeInput.value, 0.4);
  const layerHeight = parsePositiveNumber(layerHeightInput.value, 0.2);
  const moduleMultiplier = parsePositiveInteger(moduleMultiplierInput.value, 4);
  const raisedLayerCount = parsePositiveInteger(raisedLayerCountInput.value, 2);
  const moduleShape = moduleShapeInput.value === QR_MODULE_SHAPES.ROUND
    ? QR_MODULE_SHAPES.ROUND
    : QR_MODULE_SHAPES.SQUARE;
  const cornerRadiusPercent = parsePercent(
    cornerRadiusPercentInput?.value,
    DEFAULT_CORNER_RADIUS_PERCENT
  );
  const cornerRadiusRatio = getCornerRadiusRatio(cornerRadiusPercent);

  return {
    exportMode,
    svg: {
      bambuSafeMode: bambuSafeModeInput.checked,
      mirror: getMirrorOutputEnabled(),
      moduleShape,
      cornerRadiusPercent,
      cornerRadiusRatio
    },
    stl: {
      nozzleSize,
      layerHeight,
      moduleMultiplier,
      raisedLayerCount,
      mirror: getMirrorOutputEnabled(),
      moduleShape,
      cornerRadiusPercent,
      cornerRadiusRatio,
      moduleSizeMm: nozzleSize * moduleMultiplier,
      qrHeightMm: layerHeight * raisedLayerCount
    }
  };
}

// Upload + decode
fileInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const url = URL.createObjectURL(file);

  try {
    const result = await imageReader.decodeFromImageUrl(url);
    applyDecodedQrText(result.getText());
  } catch (error) {
    setStatus("Invalid QR code.", true);
  } finally {
    URL.revokeObjectURL(url);
    fileInput.value = "";
  }
});

dataInput.addEventListener("input", () => {
  setStatus("");
  syncManualCodeFromData();
  updateStlSummary();
  if (!dataInput.value.trim()) {
    clearGeneratedOutput();
    return;
  }
  generateLabel();
});

function getQrDefinition(data) {
  const qr = QRCode.create(data, { errorCorrectionLevel: "M" });

  return {
    moduleCount: qr.modules.size,
    moduleData: qr.modules.data,
    quietZoneModules: QR_QUIET_ZONE_MODULES
  };
}

function getFinderPatternOrigins(moduleCount) {
  return [
    { row: 0, col: 0 },
    { row: 0, col: moduleCount - 7 },
    { row: moduleCount - 7, col: 0 }
  ];
}

function usesRoundFinderPatterns(moduleShape) {
  return moduleShape === QR_MODULE_SHAPES.ROUND;
}

function usesRoundedSquareCorners(moduleShape, cornerRadiusRatio) {
  return moduleShape === QR_MODULE_SHAPES.SQUARE && cornerRadiusRatio > 0;
}

function getMirrorOutputEnabled() {
  if (!mirrorOutputInput) {
    return false;
  }

  return mirrorOutputInput.value === "mirrored";
}

function updateCornerRadiusInputState() {
  if (!cornerRadiusPercentInput || !moduleShapeInput) {
    return;
  }

  const isDisabled = moduleShapeInput.value === QR_MODULE_SHAPES.ROUND;
  cornerRadiusPercentInput.disabled = isDisabled;
  cornerRadiusPercentInput
    .closest(".shape-setting")
    ?.classList.toggle("is-disabled", isDisabled);
}

function getModuleDrawColumn(totalModules, quietZoneModules, col, moduleSpan = 1, mirror = false) {
  return mirror
    ? totalModules - quietZoneModules - col - moduleSpan
    : col + quietZoneModules;
}

function isDarkModuleCell(moduleData, moduleCount, row, col) {
  if (row < 0 || col < 0 || row >= moduleCount || col >= moduleCount) {
    return false;
  }

  return Boolean(moduleData[row * moduleCount + col]);
}

function buildModuleBitmap(moduleData, moduleCount) {
  const bitmap = [];

  for (let row = 0; row < moduleCount; row += 1) {
    const rowValues = [];
    for (let col = 0; col < moduleCount; col += 1) {
      rowValues.push(Boolean(moduleData[row * moduleCount + col]));
    }
    bitmap.push(rowValues);
  }

  return bitmap;
}

function getBitmapCell(bitmap, row, col) {
  if (row < 0 || col < 0 || row >= bitmap.length || col >= bitmap.length) {
    return false;
  }

  return bitmap[row][col];
}

function isBitmapInBounds(bitmap, row, col) {
  return row >= 0 && col >= 0 && row < bitmap.length && col < bitmap.length;
}

function getMaskedCornerConfigs(mask) {
  return MODULE_CORNER_CONFIGS.filter(({ bit }) => (mask & bit) !== 0);
}

function getOutputCornerMask(mask, mirror = false) {
  if (!mirror || !mask) {
    return mask;
  }

  let mirroredMask = 0;

  if (mask & MODULE_CORNER_BITS.TOP_LEFT) {
    mirroredMask |= MODULE_CORNER_BITS.TOP_RIGHT;
  }
  if (mask & MODULE_CORNER_BITS.TOP_RIGHT) {
    mirroredMask |= MODULE_CORNER_BITS.TOP_LEFT;
  }
  if (mask & MODULE_CORNER_BITS.BOTTOM_RIGHT) {
    mirroredMask |= MODULE_CORNER_BITS.BOTTOM_LEFT;
  }
  if (mask & MODULE_CORNER_BITS.BOTTOM_LEFT) {
    mirroredMask |= MODULE_CORNER_BITS.BOTTOM_RIGHT;
  }

  return mirroredMask;
}

function buildModuleCornerMaskBitmap(moduleData, moduleCount) {
  const bitmap = buildModuleBitmap(moduleData, moduleCount);
  const cornerMasks = Array.from({ length: moduleCount }, () => Array(moduleCount).fill(0));
  const whiteCornerMasks = Array.from({ length: moduleCount }, () => Array(moduleCount).fill(0));

  for (let row = 0; row < moduleCount; row += 1) {
    for (let col = 0; col < moduleCount; col += 1) {
      const current = bitmap[row][col];
      let mask = 0;

      for (const corner of MODULE_CORNER_CONFIGS) {
        const sideA = getBitmapCell(bitmap, row + corner.sideA[0], col + corner.sideA[1]);
        const sideB = getBitmapCell(bitmap, row + corner.sideB[0], col + corner.sideB[1]);

        if (sideA !== current && sideB !== current) {
          mask |= corner.bit;
        }
      }

      cornerMasks[row][col] = mask;
      let whiteMask = current ? 0 : mask;

      // If the matching diagonal module is also white, suppress that white
      // corner so diagonal white cells do not form a pinched shared corner.
      if (!current) {
        for (const corner of MODULE_CORNER_CONFIGS) {
          const diagonalRow = row + corner.diagonal[0];
          const diagonalCol = col + corner.diagonal[1];

          if (isBitmapInBounds(bitmap, diagonalRow, diagonalCol) && !bitmap[diagonalRow][diagonalCol]) {
            whiteMask &= ~corner.bit;
          }
        }
      }

      whiteCornerMasks[row][col] = whiteMask;
    }
  }

  return {
    bitmap,
    cornerMasks,
    whiteCornerMasks
  };
}

function getModuleCornerRadiiFromMask(cornerMask, moduleSize, cornerRadiusRatio) {
  const cornerRadius = moduleSize * cornerRadiusRatio;
  const radii = {
    topLeft: 0,
    topRight: 0,
    bottomRight: 0,
    bottomLeft: 0
  };

  for (const corner of getMaskedCornerConfigs(cornerMask)) {
    radii[corner.key] = cornerRadius;
  }

  return radii;
}

function buildRoundedModuleSvgPath(x, y, size, radii) {
  const x1 = x + size;
  const y1 = y + size;
  const topLeft = radii.topLeft;
  const topRight = radii.topRight;
  const bottomRight = radii.bottomRight;
  const bottomLeft = radii.bottomLeft;
  const commands = [
    `M${formatSvgNumber(x + topLeft)} ${formatSvgNumber(y)}`,
    `H${formatSvgNumber(x1 - topRight)}`
  ];

  if (topRight > 0) {
    commands.push(
      `A${formatSvgNumber(topRight)} ${formatSvgNumber(topRight)} 0 0 1 ${formatSvgNumber(x1)} ${formatSvgNumber(y + topRight)}`
    );
  } else {
    commands.push(`L${formatSvgNumber(x1)} ${formatSvgNumber(y)}`);
  }

  commands.push(`V${formatSvgNumber(y1 - bottomRight)}`);

  if (bottomRight > 0) {
    commands.push(
      `A${formatSvgNumber(bottomRight)} ${formatSvgNumber(bottomRight)} 0 0 1 ${formatSvgNumber(x1 - bottomRight)} ${formatSvgNumber(y1)}`
    );
  } else {
    commands.push(`L${formatSvgNumber(x1)} ${formatSvgNumber(y1)}`);
  }

  commands.push(`H${formatSvgNumber(x + bottomLeft)}`);

  if (bottomLeft > 0) {
    commands.push(
      `A${formatSvgNumber(bottomLeft)} ${formatSvgNumber(bottomLeft)} 0 0 1 ${formatSvgNumber(x)} ${formatSvgNumber(y1 - bottomLeft)}`
    );
  } else {
    commands.push(`L${formatSvgNumber(x)} ${formatSvgNumber(y1)}`);
  }

  commands.push(`V${formatSvgNumber(y + topLeft)}`);

  if (topLeft > 0) {
    commands.push(
      `A${formatSvgNumber(topLeft)} ${formatSvgNumber(topLeft)} 0 0 1 ${formatSvgNumber(x + topLeft)} ${formatSvgNumber(y)}`
    );
  } else {
    commands.push(`L${formatSvgNumber(x)} ${formatSvgNumber(y)}`);
  }

  commands.push("Z");
  return commands.join("");
}

function appendRoundedCornerPolygonPoints(points, centerX, centerY, radius, startAngle, endAngle, segments) {
  for (let index = 1; index <= segments; index += 1) {
    const angle = startAngle + (((endAngle - startAngle) * index) / segments);
    points.push([
      centerX + (Math.cos(angle) * radius),
      centerY + (Math.sin(angle) * radius)
    ]);
  }
}

function buildRoundedModulePolygonPoints(x, y, size, radii) {
  const x1 = x + size;
  const y1 = y + size;
  const topLeft = radii.topLeft;
  const topRight = radii.topRight;
  const bottomRight = radii.bottomRight;
  const bottomLeft = radii.bottomLeft;
  const points = [];

  points.push([x + topLeft, y]);
  points.push([x1 - topRight, y]);

  if (topRight > 0) {
    appendRoundedCornerPolygonPoints(
      points,
      x1 - topRight,
      y + topRight,
      topRight,
      -Math.PI / 2,
      0,
      MODULE_CORNER_SEGMENTS
    );
  } else {
    points.push([x1, y]);
  }

  points.push([x1, y1 - bottomRight]);

  if (bottomRight > 0) {
    appendRoundedCornerPolygonPoints(
      points,
      x1 - bottomRight,
      y1 - bottomRight,
      bottomRight,
      0,
      Math.PI / 2,
      MODULE_CORNER_SEGMENTS
    );
  } else {
    points.push([x1, y1]);
  }

  points.push([x + bottomLeft, y1]);

  if (bottomLeft > 0) {
    appendRoundedCornerPolygonPoints(
      points,
      x + bottomLeft,
      y1 - bottomLeft,
      bottomLeft,
      Math.PI / 2,
      Math.PI,
      MODULE_CORNER_SEGMENTS
    );
  } else {
    points.push([x, y1]);
  }

  points.push([x, y + topLeft]);

  if (topLeft > 0) {
    appendRoundedCornerPolygonPoints(
      points,
      x + topLeft,
      y + topLeft,
      topLeft,
      Math.PI,
      (3 * Math.PI) / 2,
      MODULE_CORNER_SEGMENTS
    );
  } else {
    points.push([x, y]);
  }

  return cleanPolygonPoints(points);
}

function buildPolygonSvgPath(points) {
  if (!points.length) {
    return "";
  }

  const [firstX, firstY] = points[0];
  const commands = [`M${formatSvgNumber(firstX)} ${formatSvgNumber(firstY)}`];

  for (let index = 1; index < points.length; index += 1) {
    const [pointX, pointY] = points[index];
    commands.push(`L${formatSvgNumber(pointX)} ${formatSvgNumber(pointY)}`);
  }

  commands.push("Z");
  return commands.join("");
}

function buildWhiteCornerFilletPolygonPoints(x, y, size, corner, cornerRadiusRatio) {
  const radius = size * cornerRadiusRatio;

  if (radius <= 0) {
    return [];
  }

  const cornerX = x + (corner.corner[0] * size);
  const cornerY = y + (corner.corner[1] * size);
  const points = [];

  points.push(
    [cornerX, cornerY],
    [cornerX + (corner.entry[0] * radius), cornerY + (corner.entry[1] * radius)]
  );
  appendRoundedCornerPolygonPoints(
    points,
    cornerX + (corner.center[0] * radius),
    cornerY + (corner.center[1] * radius),
    radius,
    corner.arcStart,
    corner.arcEnd,
    MODULE_CORNER_SEGMENTS
  );

  return cleanPolygonPoints(points);
}

function buildWhiteCornerFilletPolygons(x, y, size, whiteCornerMask, cornerRadiusRatio) {
  return getMaskedCornerConfigs(whiteCornerMask).map((corner) =>
    buildWhiteCornerFilletPolygonPoints(x, y, size, corner, cornerRadiusRatio)
  );
}

function buildWhiteCornerFilletSvgPath(x, y, size, whiteCornerMask, cornerRadiusRatio) {
  if (!whiteCornerMask) {
    return "";
  }

  return buildWhiteCornerFilletPolygons(x, y, size, whiteCornerMask, cornerRadiusRatio)
    .map((points) => buildPolygonSvgPath(points))
    .join("");
}

function appendWhiteCornerFilletFacets(facets, x, y, size, whiteCornerMask, baseZ, topZ, cornerRadiusRatio) {
  if (!whiteCornerMask) {
    return;
  }

  for (const points of buildWhiteCornerFilletPolygons(x, y, size, whiteCornerMask, cornerRadiusRatio)) {
    appendPolygonPrismFacets(
      facets,
      points,
      baseZ,
      topZ
    );
  }
}

function isFinderPatternCell(row, col, moduleCount) {
  return getFinderPatternOrigins(moduleCount).some((origin) =>
    row >= origin.row &&
    row < origin.row + 7 &&
    col >= origin.col &&
    col < origin.col + 7
  );
}

function renderRoundFinderPatterns(x, y, moduleSize, moduleCount, mirror = false) {
  const totalModules = moduleCount + QR_QUIET_ZONE_MODULES * 2;
  const finderPatterns = [];

  for (const origin of getFinderPatternOrigins(moduleCount)) {
    const drawColumn = mirror
      ? totalModules - QR_QUIET_ZONE_MODULES - origin.col - 7
      : origin.col + QR_QUIET_ZONE_MODULES;
    const centerX = x + ((drawColumn + 3.5) * moduleSize);
    const centerY = y + ((origin.row + QR_QUIET_ZONE_MODULES + 3.5) * moduleSize);

    finderPatterns.push(
      `<circle cx="${formatSvgNumber(centerX)}" cy="${formatSvgNumber(centerY)}" r="${formatSvgNumber(3 * moduleSize)}" fill="none" stroke="black" stroke-width="${formatSvgNumber(moduleSize)}"/>`
    );
    finderPatterns.push(
      `<circle cx="${formatSvgNumber(centerX)}" cy="${formatSvgNumber(centerY)}" r="${formatSvgNumber(1.5 * moduleSize)}" fill="black"/>`
    );
  }

  return finderPatterns.join("");
}

function renderRoundQrModules(data, x, y, size, mirror = false) {
  const { moduleCount, moduleData, quietZoneModules } = getQrDefinition(data);
  const totalModules = moduleCount + quietZoneModules * 2;
  const moduleSize = size / totalModules;
  const circles = [];

  for (let row = 0; row < moduleCount; row += 1) {
    for (let col = 0; col < moduleCount; col += 1) {
      if (!moduleData[row * moduleCount + col]) continue;
      if (isFinderPatternCell(row, col, moduleCount)) continue;

      const drawColumn = mirror
        ? totalModules - quietZoneModules - col - 1
        : col + quietZoneModules;
      const centerX = x + ((drawColumn + 0.5) * moduleSize);
      const centerY = y + ((row + quietZoneModules + 0.5) * moduleSize);

      circles.push(
        `<circle cx="${formatSvgNumber(centerX)}" cy="${formatSvgNumber(centerY)}" r="${formatSvgNumber(moduleSize / 2)}"/>`
      );
    }
  }

  circles.push(renderRoundFinderPatterns(x, y, moduleSize, moduleCount, mirror));

  return `<g fill="black">${circles.join("")}</g>`;
}

function renderSharpSquareQrModules(data, x, y, size, mirror = false) {
  const { moduleCount, moduleData, quietZoneModules } = getQrDefinition(data);
  const totalModules = moduleCount + quietZoneModules * 2;
  const moduleSize = size / totalModules;
  const pathCommands = [];

  for (let row = 0; row < moduleCount; row += 1) {
    let runStart = -1;

    for (let col = 0; col <= moduleCount; col += 1) {
      const isDark = col < moduleCount && moduleData[row * moduleCount + col];

      if (isDark && runStart === -1) {
        runStart = col;
      }

      if (!isDark && runStart !== -1) {
        const runColumn = mirror
          ? totalModules - quietZoneModules - col
          : runStart + quietZoneModules;
        const runX = x + (runColumn * moduleSize);
        const runY = y + ((row + quietZoneModules) * moduleSize);
        const runWidth = (col - runStart) * moduleSize;

        pathCommands.push(
          `M${formatSvgNumber(runX)} ${formatSvgNumber(runY)}h${formatSvgNumber(runWidth)}v${formatSvgNumber(moduleSize)}H${formatSvgNumber(runX)}Z`
        );

        runStart = -1;
      }
    }
  }

  return `<path d="${pathCommands.join("")}" fill="black"/>`;
}

function renderQRModules(data, x, y, size, mirror = false, moduleShape = QR_MODULE_SHAPES.SQUARE, cornerRadiusRatio = 0) {
  if (moduleShape === QR_MODULE_SHAPES.ROUND) {
    return renderRoundQrModules(data, x, y, size, mirror);
  }

  if (!usesRoundedSquareCorners(moduleShape, cornerRadiusRatio)) {
    return renderSharpSquareQrModules(data, x, y, size, mirror);
  }

  const { moduleCount, moduleData, quietZoneModules } = getQrDefinition(data);
  const { cornerMasks, whiteCornerMasks } = buildModuleCornerMaskBitmap(moduleData, moduleCount);
  const totalModules = moduleCount + quietZoneModules * 2;
  const moduleSize = size / totalModules;
  const pathCommands = [];

  for (let row = 0; row < moduleCount; row += 1) {
    for (let col = 0; col < moduleCount; col += 1) {
      if (!moduleData[row * moduleCount + col]) continue;
      const drawColumn = getModuleDrawColumn(totalModules, quietZoneModules, col, 1, mirror);
      const moduleX = x + (drawColumn * moduleSize);
      const moduleY = y + ((row + quietZoneModules) * moduleSize);
      const cornerMask = getOutputCornerMask(cornerMasks[row][col], mirror);
      const cornerRadii = getModuleCornerRadiiFromMask(cornerMask, moduleSize, cornerRadiusRatio);
      pathCommands.push(buildRoundedModuleSvgPath(moduleX, moduleY, moduleSize, cornerRadii));
    }
  }

  for (let row = 0; row < moduleCount; row += 1) {
    for (let col = 0; col < moduleCount; col += 1) {
      if (moduleData[row * moduleCount + col]) continue;
      const whiteCornerMask = getOutputCornerMask(whiteCornerMasks[row][col], mirror);
      if (!whiteCornerMask) continue;
      const drawColumn = getModuleDrawColumn(totalModules, quietZoneModules, col, 1, mirror);
      const moduleX = x + (drawColumn * moduleSize);
      const moduleY = y + ((row + quietZoneModules) * moduleSize);
      const filletPath = buildWhiteCornerFilletSvgPath(moduleX, moduleY, moduleSize, whiteCornerMask, cornerRadiusRatio);
      if (filletPath) {
        pathCommands.push(filletPath);
      }
    }
  }

  return `<path d="${pathCommands.join("")}" fill="black"/>`;
}

function renderBambuSafeQR(data, x, y, moduleSize = 4, mirror = false, moduleShape = QR_MODULE_SHAPES.SQUARE, cornerRadiusRatio = 0) {
  const { moduleCount, moduleData, quietZoneModules } = getQrDefinition(data);
  const { cornerMasks, whiteCornerMasks } = buildModuleCornerMaskBitmap(moduleData, moduleCount);
  const totalModules = moduleCount + (quietZoneModules * 2);
  const elements = [];

  for (let row = 0; row < moduleCount; row += 1) {
    for (let col = 0; col < moduleCount; col += 1) {
      if (!moduleData[row * moduleCount + col]) continue;
      if (usesRoundFinderPatterns(moduleShape) && isFinderPatternCell(row, col, moduleCount)) continue;

      const drawColumn = getModuleDrawColumn(totalModules, quietZoneModules, col, 1, mirror);
      if (moduleShape === QR_MODULE_SHAPES.ROUND) {
        elements.push(
            `<circle cx="${x + ((drawColumn + 0.5) * moduleSize)}" cy="${y + ((row + quietZoneModules + 0.5) * moduleSize)}" r="${moduleSize / 2}"/>`
        );
      } else if (!usesRoundedSquareCorners(moduleShape, cornerRadiusRatio)) {
        elements.push(
          `<rect x="${x + (drawColumn * moduleSize)}" y="${y + ((row + quietZoneModules) * moduleSize)}" width="${moduleSize}" height="${moduleSize}"/>`
        );
      } else {
        const moduleX = x + (drawColumn * moduleSize);
        const moduleY = y + ((row + quietZoneModules) * moduleSize);
        const cornerMask = getOutputCornerMask(cornerMasks[row][col], mirror);
        const cornerRadii = getModuleCornerRadiiFromMask(cornerMask, moduleSize, cornerRadiusRatio);
        elements.push(
          `<path d="${buildRoundedModuleSvgPath(moduleX, moduleY, moduleSize, cornerRadii)}"/>`
        );
      }
    }
  }

  if (usesRoundedSquareCorners(moduleShape, cornerRadiusRatio)) {
    for (let row = 0; row < moduleCount; row += 1) {
      for (let col = 0; col < moduleCount; col += 1) {
        if (moduleData[row * moduleCount + col]) continue;
        const whiteCornerMask = getOutputCornerMask(whiteCornerMasks[row][col], mirror);
        if (!whiteCornerMask) continue;
        const drawColumn = getModuleDrawColumn(totalModules, quietZoneModules, col, 1, mirror);
        const moduleX = x + (drawColumn * moduleSize);
        const moduleY = y + ((row + quietZoneModules) * moduleSize);
        const filletPath = buildWhiteCornerFilletSvgPath(moduleX, moduleY, moduleSize, whiteCornerMask, cornerRadiusRatio);
        if (filletPath) {
          elements.push(`<path d="${filletPath}"/>`);
        }
      }
    }
  }

  if (usesRoundFinderPatterns(moduleShape)) {
    elements.push(renderRoundFinderPatterns(x, y, moduleSize, moduleCount, mirror));
  }

  return {
    svg: elements.join(""),
    width: totalModules * moduleSize,
    height: totalModules * moduleSize
  };
}

function buildBambuSafeSvg(data, includeSizingMetadata, mirror = false, moduleShape = QR_MODULE_SHAPES.SQUARE, cornerRadiusRatio = 0) {
  const safeQR = renderBambuSafeQR(data, 0, 0, 4, mirror, moduleShape, cornerRadiusRatio);
  const sizeAttributes = includeSizingMetadata
    ? ` width="${safeQR.width}" height="${safeQR.height}" viewBox="0 0 ${safeQR.width} ${safeQR.height}"`
    : "";

  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg"${sizeAttributes}><g fill="black">${safeQR.svg}</g></svg>`,
    width: safeQR.width,
    height: safeQR.height
  };
}

function getQrCanvasSize(data, moduleSize = 4) {
  const { moduleCount, quietZoneModules } = getQrDefinition(data);
  return (moduleCount + (quietZoneModules * 2)) * moduleSize;
}

function buildNormalQrSvg(data, includeSizingMetadata, mirror = false, moduleShape = QR_MODULE_SHAPES.SQUARE, cornerRadiusRatio = 0) {
  const size = getQrCanvasSize(data, 4);
  const sizeAttributes = includeSizingMetadata
    ? ` width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"`
    : ` viewBox="0 0 ${size} ${size}"`;

  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg"${sizeAttributes}>${renderQRModules(data, 0, 0, size, mirror, moduleShape, cornerRadiusRatio)}</svg>`,
    size
  };
}

function formatStlNumber(value) {
  return Number.parseFloat(value.toFixed(4)).toString();
}

function buildStlFacet(normal, vertices) {
  const formatVertex = ([x, y, z]) =>
    `      vertex ${formatStlNumber(x)} ${formatStlNumber(y)} ${formatStlNumber(z)}`;

  return [
    `  facet normal ${normal.join(" ")}`,
    "    outer loop",
    ...vertices.map(formatVertex),
    "    endloop",
    "  endfacet"
  ].join("\n");
}

function appendPrismFacets(facets, x, y, width, height, baseZ, topZ) {
  const p000 = [x, y, baseZ];
  const p100 = [x + width, y, baseZ];
  const p110 = [x + width, y + height, baseZ];
  const p010 = [x, y + height, baseZ];
  const p001 = [x, y, topZ];
  const p101 = [x + width, y, topZ];
  const p111 = [x + width, y + height, topZ];
  const p011 = [x, y + height, topZ];

  facets.push(buildStlFacet(["0", "0", "-1"], [p000, p110, p100]));
  facets.push(buildStlFacet(["0", "0", "-1"], [p000, p010, p110]));
  facets.push(buildStlFacet(["0", "0", "1"], [p001, p101, p111]));
  facets.push(buildStlFacet(["0", "0", "1"], [p001, p111, p011]));
  facets.push(buildStlFacet(["0", "-1", "0"], [p000, p100, p101]));
  facets.push(buildStlFacet(["0", "-1", "0"], [p000, p101, p001]));
  facets.push(buildStlFacet(["1", "0", "0"], [p100, p110, p111]));
  facets.push(buildStlFacet(["1", "0", "0"], [p100, p111, p101]));
  facets.push(buildStlFacet(["0", "1", "0"], [p110, p010, p011]));
  facets.push(buildStlFacet(["0", "1", "0"], [p110, p011, p111]));
  facets.push(buildStlFacet(["-1", "0", "0"], [p010, p000, p001]));
  facets.push(buildStlFacet(["-1", "0", "0"], [p010, p001, p011]));
}

function pointsAlmostEqual(pointA, pointB, epsilon = 1e-9) {
  return Math.abs(pointA[0] - pointB[0]) < epsilon && Math.abs(pointA[1] - pointB[1]) < epsilon;
}

function cleanPolygonPoints(points, epsilon = 1e-9) {
  if (points.length <= 3) {
    return points;
  }

  const uniquePoints = [];

  for (const point of points) {
    if (uniquePoints.length === 0 || !pointsAlmostEqual(uniquePoints[uniquePoints.length - 1], point, epsilon)) {
      uniquePoints.push(point);
    }
  }

  if (uniquePoints.length > 1 && pointsAlmostEqual(uniquePoints[0], uniquePoints[uniquePoints.length - 1], epsilon)) {
    uniquePoints.pop();
  }

  if (uniquePoints.length <= 3) {
    return uniquePoints;
  }

  const cleanedPoints = [];

  for (let index = 0; index < uniquePoints.length; index += 1) {
    const previousPoint = uniquePoints[(index - 1 + uniquePoints.length) % uniquePoints.length];
    const currentPoint = uniquePoints[index];
    const nextPoint = uniquePoints[(index + 1) % uniquePoints.length];
    const edgeAX = currentPoint[0] - previousPoint[0];
    const edgeAY = currentPoint[1] - previousPoint[1];
    const edgeBX = nextPoint[0] - currentPoint[0];
    const edgeBY = nextPoint[1] - currentPoint[1];
    const cross = (edgeAX * edgeBY) - (edgeAY * edgeBX);
    const dot = (edgeAX * edgeBX) + (edgeAY * edgeBY);

    if (Math.abs(cross) < epsilon && dot >= 0) {
      continue;
    }

    cleanedPoints.push(currentPoint);
  }

  return cleanedPoints.length >= 3 ? cleanedPoints : uniquePoints;
}

function pointOnSegment(point, segmentStart, segmentEnd, epsilon = 1e-9) {
  const segmentDX = segmentEnd[0] - segmentStart[0];
  const segmentDY = segmentEnd[1] - segmentStart[1];
  const pointDX = point[0] - segmentStart[0];
  const pointDY = point[1] - segmentStart[1];
  const cross = (segmentDX * pointDY) - (segmentDY * pointDX);

  if (Math.abs(cross) > epsilon) {
    return false;
  }

  const dot = (pointDX * segmentDX) + (pointDY * segmentDY);
  if (dot < -epsilon) {
    return false;
  }

  const squaredLength = (segmentDX * segmentDX) + (segmentDY * segmentDY);
  return dot <= squaredLength + epsilon;
}

function getTurnDirection(pointA, pointB, pointC, epsilon = 1e-9) {
  const cross = ((pointB[0] - pointA[0]) * (pointC[1] - pointA[1])) - ((pointB[1] - pointA[1]) * (pointC[0] - pointA[0]));

  if (Math.abs(cross) < epsilon) {
    return 0;
  }

  return cross > 0 ? 1 : -1;
}

function segmentsIntersect(pointA, pointB, pointC, pointD, epsilon = 1e-9) {
  const turnA = getTurnDirection(pointA, pointB, pointC, epsilon);
  const turnB = getTurnDirection(pointA, pointB, pointD, epsilon);
  const turnC = getTurnDirection(pointC, pointD, pointA, epsilon);
  const turnD = getTurnDirection(pointC, pointD, pointB, epsilon);

  if (turnA !== turnB && turnC !== turnD) {
    return true;
  }

  if (turnA === 0 && pointOnSegment(pointC, pointA, pointB, epsilon)) return true;
  if (turnB === 0 && pointOnSegment(pointD, pointA, pointB, epsilon)) return true;
  if (turnC === 0 && pointOnSegment(pointA, pointC, pointD, epsilon)) return true;
  if (turnD === 0 && pointOnSegment(pointB, pointC, pointD, epsilon)) return true;

  return false;
}

function isPointInsidePolygon(point, polygon, epsilon = 1e-9) {
  let inside = false;

  for (let index = 0; index < polygon.length; index += 1) {
    const currentPoint = polygon[index];
    const nextPoint = polygon[(index + 1) % polygon.length];

    if (pointOnSegment(point, currentPoint, nextPoint, epsilon)) {
      return true;
    }

    const crossesRay = ((currentPoint[1] > point[1]) !== (nextPoint[1] > point[1])) &&
      (point[0] < (((nextPoint[0] - currentPoint[0]) * (point[1] - currentPoint[1])) / ((nextPoint[1] - currentPoint[1]) || epsilon)) + currentPoint[0]);

    if (crossesRay) {
      inside = !inside;
    }
  }

  return inside;
}

function isVisibleHoleBridge(outerPoints, holePoints, holeIndex, outerIndex, epsilon = 1e-9) {
  const holePoint = holePoints[holeIndex];
  const outerPoint = outerPoints[outerIndex];

  if (outerPoint[0] <= holePoint[0] + epsilon) {
    return false;
  }

  const midpoint = [
    (holePoint[0] + outerPoint[0]) / 2,
    (holePoint[1] + outerPoint[1]) / 2
  ];

  if (!isPointInsidePolygon(midpoint, outerPoints, epsilon)) {
    return false;
  }

  for (let index = 0; index < outerPoints.length; index += 1) {
    const edgeStart = outerPoints[index];
    const edgeEnd = outerPoints[(index + 1) % outerPoints.length];

    if (pointsAlmostEqual(edgeStart, outerPoint, epsilon) || pointsAlmostEqual(edgeEnd, outerPoint, epsilon)) {
      continue;
    }

    if (segmentsIntersect(holePoint, outerPoint, edgeStart, edgeEnd, epsilon)) {
      return false;
    }
  }

  for (let index = 0; index < holePoints.length; index += 1) {
    const edgeStart = holePoints[index];
    const edgeEnd = holePoints[(index + 1) % holePoints.length];

    if (
      pointsAlmostEqual(edgeStart, holePoint, epsilon) ||
      pointsAlmostEqual(edgeEnd, holePoint, epsilon)
    ) {
      continue;
    }

    if (segmentsIntersect(holePoint, outerPoint, edgeStart, edgeEnd, epsilon)) {
      return false;
    }
  }

  return true;
}

function getSignedPolygonArea(points) {
  let area = 0;

  for (let index = 0; index < points.length; index += 1) {
    const [x1, y1] = points[index];
    const [x2, y2] = points[(index + 1) % points.length];
    area += (x1 * y2) - (x2 * y1);
  }

  return area / 2;
}

function isPointInsideTriangle(point, triangleA, triangleB, triangleC, epsilon = 1e-9) {
  const turnAB = getTurnDirection(triangleA, triangleB, point, epsilon);
  const turnBC = getTurnDirection(triangleB, triangleC, point, epsilon);
  const turnCA = getTurnDirection(triangleC, triangleA, point, epsilon);
  const hasNegative = turnAB < 0 || turnBC < 0 || turnCA < 0;
  const hasPositive = turnAB > 0 || turnBC > 0 || turnCA > 0;

  return !(hasNegative && hasPositive);
}

function triangulatePolygonPoints(points) {
  const orderedPoints = cleanPolygonPoints(points);

  if (orderedPoints.length < 3) {
    throw new Error("Polygon must have at least three points.");
  }

  if (orderedPoints.length === 3) {
    return {
      orderedPoints,
      triangles: [[0, 1, 2]]
    };
  }

  const isCounterClockwise = getSignedPolygonArea(orderedPoints) > 0;
  const remainingIndexes = orderedPoints.map((_, index) => index);
  const triangles = [];
  let guard = 0;
  const maxGuard = orderedPoints.length * orderedPoints.length;

  while (remainingIndexes.length > 3 && guard < maxGuard) {
    guard += 1;
    let earFound = false;

    for (let index = 0; index < remainingIndexes.length; index += 1) {
      const previousIndex = remainingIndexes[(index - 1 + remainingIndexes.length) % remainingIndexes.length];
      const currentIndex = remainingIndexes[index];
      const nextIndex = remainingIndexes[(index + 1) % remainingIndexes.length];
      const previousPoint = orderedPoints[previousIndex];
      const currentPoint = orderedPoints[currentIndex];
      const nextPoint = orderedPoints[nextIndex];
      const turn = getTurnDirection(previousPoint, currentPoint, nextPoint);

      if (turn === 0) {
        continue;
      }

      if ((isCounterClockwise && turn < 0) || (!isCounterClockwise && turn > 0)) {
        continue;
      }

      let hasInteriorPoint = false;

      for (const testIndex of remainingIndexes) {
        if (testIndex === previousIndex || testIndex === currentIndex || testIndex === nextIndex) {
          continue;
        }

        if (isPointInsideTriangle(orderedPoints[testIndex], previousPoint, currentPoint, nextPoint)) {
          hasInteriorPoint = true;
          break;
        }
      }

      if (hasInteriorPoint) {
        continue;
      }

      triangles.push([previousIndex, currentIndex, nextIndex]);
      remainingIndexes.splice(index, 1);
      earFound = true;
      break;
    }

    if (!earFound) {
      break;
    }
  }

  if (remainingIndexes.length === 3) {
    triangles.push([remainingIndexes[0], remainingIndexes[1], remainingIndexes[2]]);
  }

  if (triangles.length === 0) {
    // Fallback to fan triangulation for highly degenerate cases.
    for (let index = 1; index < orderedPoints.length - 1; index += 1) {
      triangles.push([0, index, index + 1]);
    }
  }

  return {
    orderedPoints,
    triangles
  };
}

function appendPolygonPrismFacets(facets, points, baseZ, topZ) {
  const { orderedPoints, triangles } = triangulatePolygonPoints(points);
  const basePoints = orderedPoints.map(([pointX, pointY]) => [pointX, pointY, baseZ]);
  const topPoints = orderedPoints.map(([pointX, pointY]) => [pointX, pointY, topZ]);

  for (const [firstIndex, secondIndex, thirdIndex] of triangles) {
    facets.push(buildStlFacet(["0", "0", "-1"], [basePoints[firstIndex], basePoints[thirdIndex], basePoints[secondIndex]]));
    facets.push(buildStlFacet(["0", "0", "1"], [topPoints[firstIndex], topPoints[secondIndex], topPoints[thirdIndex]]));
  }

  for (let index = 0; index < orderedPoints.length; index += 1) {
    const nextIndex = (index + 1) % orderedPoints.length;
    const currentBase = basePoints[index];
    const nextBase = basePoints[nextIndex];
    const currentTop = topPoints[index];
    const nextTop = topPoints[nextIndex];
    const edgeX = nextBase[0] - currentBase[0];
    const edgeY = nextBase[1] - currentBase[1];
    const edgeLength = Math.hypot(edgeX, edgeY) || 1;
    const normal = [
      formatStlNumber(edgeY / edgeLength),
      formatStlNumber(-edgeX / edgeLength),
      "0"
    ];

    facets.push(buildStlFacet(normal, [currentBase, nextBase, nextTop]));
    facets.push(buildStlFacet(normal, [currentBase, nextTop, currentTop]));
  }
}

function appendRoundPrismFacets(facets, centerX, centerY, radius, sides, baseZ, topZ) {
  const baseCenter = [centerX, centerY, baseZ];
  const topCenter = [centerX, centerY, topZ];
  const basePoints = [];
  const topPoints = [];

  for (let index = 0; index < sides; index += 1) {
    const angle = (-Math.PI / 2) + ((Math.PI * 2 * index) / sides);
    const pointX = centerX + (Math.cos(angle) * radius);
    const pointY = centerY + (Math.sin(angle) * radius);
    basePoints.push([pointX, pointY, baseZ]);
    topPoints.push([pointX, pointY, topZ]);
  }

  for (let index = 0; index < sides; index += 1) {
    const nextIndex = (index + 1) % sides;
    facets.push(buildStlFacet(["0", "0", "-1"], [baseCenter, basePoints[nextIndex], basePoints[index]]));
    facets.push(buildStlFacet(["0", "0", "1"], [topCenter, topPoints[index], topPoints[nextIndex]]));
  }

  for (let index = 0; index < sides; index += 1) {
    const nextIndex = (index + 1) % sides;
    const currentBase = basePoints[index];
    const nextBase = basePoints[nextIndex];
    const currentTop = topPoints[index];
    const nextTop = topPoints[nextIndex];
    const midX = ((currentBase[0] + nextBase[0]) / 2) - centerX;
    const midY = ((currentBase[1] + nextBase[1]) / 2) - centerY;
    const length = Math.hypot(midX, midY) || 1;
    const normal = [
      formatStlNumber(midX / length),
      formatStlNumber(midY / length),
      "0"
    ];

    facets.push(buildStlFacet(normal, [currentBase, nextBase, nextTop]));
    facets.push(buildStlFacet(normal, [currentBase, nextTop, currentTop]));
  }
}

function appendRingPrismFacets(facets, centerX, centerY, outerRadius, innerRadius, sides, baseZ, topZ) {
  const outerBasePoints = [];
  const outerTopPoints = [];
  const innerBasePoints = [];
  const innerTopPoints = [];

  for (let index = 0; index < sides; index += 1) {
    const angle = (-Math.PI / 2) + ((Math.PI * 2 * index) / sides);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    outerBasePoints.push([centerX + (cos * outerRadius), centerY + (sin * outerRadius), baseZ]);
    outerTopPoints.push([centerX + (cos * outerRadius), centerY + (sin * outerRadius), topZ]);
    innerBasePoints.push([centerX + (cos * innerRadius), centerY + (sin * innerRadius), baseZ]);
    innerTopPoints.push([centerX + (cos * innerRadius), centerY + (sin * innerRadius), topZ]);
  }

  for (let index = 0; index < sides; index += 1) {
    const nextIndex = (index + 1) % sides;
    const outerBase = outerBasePoints[index];
    const outerBaseNext = outerBasePoints[nextIndex];
    const outerTop = outerTopPoints[index];
    const outerTopNext = outerTopPoints[nextIndex];
    const innerBase = innerBasePoints[index];
    const innerBaseNext = innerBasePoints[nextIndex];
    const innerTop = innerTopPoints[index];
    const innerTopNext = innerTopPoints[nextIndex];
    const outerMidX = ((outerBase[0] + outerBaseNext[0]) / 2) - centerX;
    const outerMidY = ((outerBase[1] + outerBaseNext[1]) / 2) - centerY;
    const outerLength = Math.hypot(outerMidX, outerMidY) || 1;
    const innerMidX = ((innerBase[0] + innerBaseNext[0]) / 2) - centerX;
    const innerMidY = ((innerBase[1] + innerBaseNext[1]) / 2) - centerY;
    const innerLength = Math.hypot(innerMidX, innerMidY) || 1;
    const outerNormal = [
      formatStlNumber(outerMidX / outerLength),
      formatStlNumber(outerMidY / outerLength),
      "0"
    ];
    const innerNormal = [
      formatStlNumber(-innerMidX / innerLength),
      formatStlNumber(-innerMidY / innerLength),
      "0"
    ];

    facets.push(buildStlFacet(["0", "0", "-1"], [outerBase, innerBaseNext, innerBase]));
    facets.push(buildStlFacet(["0", "0", "-1"], [outerBase, outerBaseNext, innerBaseNext]));
    facets.push(buildStlFacet(["0", "0", "1"], [outerTop, innerTop, innerTopNext]));
    facets.push(buildStlFacet(["0", "0", "1"], [outerTop, innerTopNext, outerTopNext]));
    facets.push(buildStlFacet(outerNormal, [outerBase, outerBaseNext, outerTopNext]));
    facets.push(buildStlFacet(outerNormal, [outerBase, outerTopNext, outerTop]));
    facets.push(buildStlFacet(innerNormal, [innerBase, innerTopNext, innerBaseNext]));
    facets.push(buildStlFacet(innerNormal, [innerBase, innerTop, innerTopNext]));
  }
}

function appendRoundFinderPatternFacets(facets, moduleSize, qrHeightMm, moduleCount, mirror = false) {
  const totalModules = moduleCount + QR_QUIET_ZONE_MODULES * 2;

  for (const origin of getFinderPatternOrigins(moduleCount)) {
    const drawColumn = mirror
      ? totalModules - QR_QUIET_ZONE_MODULES - origin.col - 7
      : origin.col + QR_QUIET_ZONE_MODULES;
    const centerX = (drawColumn + 3.5) * moduleSize;
    const centerY = (origin.row + QR_QUIET_ZONE_MODULES + 3.5) * moduleSize;

    appendRingPrismFacets(
      facets,
      centerX,
      centerY,
      3.5 * moduleSize,
      2.5 * moduleSize,
      ROUND_STL_SEGMENTS,
      0,
      qrHeightMm
    );
    appendRoundPrismFacets(
      facets,
      centerX,
      centerY,
      1.5 * moduleSize,
      ROUND_STL_SEGMENTS,
      0,
      qrHeightMm
    );
  }
}

function buildQrStl(data, settings) {
  const { moduleCount, moduleData, quietZoneModules } = getQrDefinition(data);
  const { cornerMasks, whiteCornerMasks } = buildModuleCornerMaskBitmap(moduleData, moduleCount);
  const moduleSizeMm = settings.moduleSizeMm;
  const facets = [];
  for (let row = 0; row < moduleCount; row += 1) {
    for (let col = 0; col < moduleCount; col += 1) {
      if (!moduleData[row * moduleCount + col]) continue;
      if (usesRoundFinderPatterns(settings.moduleShape) && isFinderPatternCell(row, col, moduleCount)) continue;

      const drawColumn = getModuleDrawColumn(
        moduleCount + (quietZoneModules * 2),
        quietZoneModules,
        col,
        1,
        settings.mirror
      );
      const y = (row + quietZoneModules) * moduleSizeMm;
      const x = drawColumn * moduleSizeMm;

      if (settings.moduleShape === QR_MODULE_SHAPES.ROUND) {
        appendRoundPrismFacets(
          facets,
          x + (moduleSizeMm / 2),
          y + (moduleSizeMm / 2),
          moduleSizeMm / 2,
          ROUND_STL_SEGMENTS,
          0,
          settings.qrHeightMm
        );
      } else if (!usesRoundedSquareCorners(settings.moduleShape, settings.cornerRadiusRatio)) {
        appendPrismFacets(
          facets,
          x,
          y,
          moduleSizeMm,
          moduleSizeMm,
          0,
          settings.qrHeightMm
        );
      } else {
        const cornerMask = getOutputCornerMask(cornerMasks[row][col], settings.mirror);
        const cornerRadii = getModuleCornerRadiiFromMask(cornerMask, moduleSizeMm, settings.cornerRadiusRatio);
        const roundedPolygon = buildRoundedModulePolygonPoints(x, y, moduleSizeMm, cornerRadii);
        appendPolygonPrismFacets(facets, roundedPolygon, 0, settings.qrHeightMm);
      }
    }
  }

  if (usesRoundedSquareCorners(settings.moduleShape, settings.cornerRadiusRatio)) {
    for (let row = 0; row < moduleCount; row += 1) {
      for (let col = 0; col < moduleCount; col += 1) {
        if (moduleData[row * moduleCount + col]) continue;
        const whiteCornerMask = getOutputCornerMask(whiteCornerMasks[row][col], settings.mirror);
        if (!whiteCornerMask) continue;
        const drawColumn = getModuleDrawColumn(
          moduleCount + (quietZoneModules * 2),
          quietZoneModules,
          col,
          1,
          settings.mirror
        );
        const y = (row + quietZoneModules) * moduleSizeMm;
        const x = drawColumn * moduleSizeMm;

        appendWhiteCornerFilletFacets(
          facets,
          x,
          y,
          moduleSizeMm,
          whiteCornerMask,
          0,
          settings.qrHeightMm,
          settings.cornerRadiusRatio
        );
      }
    }
  }

  if (usesRoundFinderPatterns(settings.moduleShape)) {
    appendRoundFinderPatternFacets(
      facets,
      moduleSizeMm,
      settings.qrHeightMm,
      moduleCount,
      settings.mirror
    );
  }

  return [
    "solid matter_qr",
    ...facets,
    "endsolid matter_qr"
  ].join("\n");
}

async function generateLabel() {
  const data = getNormalizedMatterQrText(dataInput.value);
  const { exportMode: selectedExportMode, svg, stl } = getExportOptions();
  updateStlSummary();

  if (!data) {
    clearGeneratedOutput();
    return;
  }

  try {
    syncManualCodeFromData({ force: true });

    if (selectedExportMode === "stl") {
      finalSTL = buildQrStl(data, stl);
      const previewNormalSvg = buildNormalQrSvg(data, true, stl.mirror, stl.moduleShape, stl.cornerRadiusRatio);
      finalSVG = "";
      output.innerHTML = previewNormalSvg.svg;
      return;
    }

    finalSTL = "";

    if (svg.bambuSafeMode) {
      const downloadSafeSvg = buildBambuSafeSvg(data, false, svg.mirror, svg.moduleShape, svg.cornerRadiusRatio);
      const previewSafeSvg = buildBambuSafeSvg(data, true, svg.mirror, svg.moduleShape, svg.cornerRadiusRatio);
      finalSVG = downloadSafeSvg.svg;
      output.innerHTML = previewSafeSvg.svg;
      return;
    }

    const downloadNormalSvg = buildNormalQrSvg(data, false, svg.mirror, svg.moduleShape, svg.cornerRadiusRatio);
    const previewNormalSvg = buildNormalQrSvg(data, true, svg.mirror, svg.moduleShape, svg.cornerRadiusRatio);
    finalSVG = downloadNormalSvg.svg;
    output.innerHTML = previewNormalSvg.svg;
  } catch (error) {
    renderPreviewError(`Could not generate the QR label: ${error.message}`);
    setStatus(`Could not generate the QR label: ${error.message}`, true);
  }
}

function downloadLabel() {
  if (!finalSVG) {
    setStatus("Generate a label before downloading.", true);
    return;
  }

  downloadBlob(finalSVG, "image/svg+xml", "matter-label.svg");
  setStatus("SVG downloaded.");
}

function downloadStl() {
  if (!finalSTL) {
    setStatus("Generate a label before downloading the STL.", true);
    return;
  }

  downloadBlob(finalSTL, "model/stl", "matter-label.stl");
  setStatus("STL downloaded.");
}

function downloadBlob(contents, mimeType, filename) {
  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

lookupBtn.addEventListener("click", lookupOfficialMatterInfo);
function selectExportMode(nextMode) {
  exportMode = nextMode;
  updateExportModeUi();
  if (dataInput.value.trim()) {
    generateLabel();
  }
}

function moveExportModeFocus(nextMode) {
  selectExportMode(nextMode);
  (nextMode === "svg" ? svgModeBtn : stlModeBtn).focus();
}

function handleExportModeKeydown(event) {
  switch (event.key) {
    case "ArrowLeft":
    case "ArrowUp":
      event.preventDefault();
      moveExportModeFocus(exportMode === "svg" ? "stl" : "svg");
      break;
    case "ArrowRight":
    case "ArrowDown":
      event.preventDefault();
      moveExportModeFocus(exportMode === "svg" ? "stl" : "svg");
      break;
    case "Home":
      event.preventDefault();
      moveExportModeFocus("svg");
      break;
    case "End":
      event.preventDefault();
      moveExportModeFocus("stl");
      break;
    default:
      break;
  }
}

svgModeBtn.addEventListener("click", (event) => {
  event.preventDefault();
  selectExportMode("svg");
});
stlModeBtn.addEventListener("click", (event) => {
  event.preventDefault();
  selectExportMode("stl");
});
svgModeBtn.addEventListener("keydown", handleExportModeKeydown);
stlModeBtn.addEventListener("keydown", handleExportModeKeydown);
downloadBtn.addEventListener("click", downloadLabel);
downloadStlBtn.addEventListener("click", downloadStl);
startCameraBtn?.addEventListener("click", startCameraScan);
stopCameraBtn?.addEventListener("click", () => {
  stopCameraScan();
  setCameraStatus("Camera scan stopped.");
  setStatus("");
});

for (const input of [bambuSafeModeInput, mirrorOutputInput, moduleShapeInput].filter(Boolean)) {
  input.addEventListener("change", () => {
    updateCornerRadiusInputState();
    updateStlSummary();
    if (dataInput.value.trim()) {
      generateLabel();
    } else {
      clearGeneratedOutput();
    }
  });
}

for (const input of [
  nozzleSizeInput,
  layerHeightInput,
  moduleMultiplierInput,
  raisedLayerCountInput,
  cornerRadiusPercentInput
].filter(Boolean)) {
  input.addEventListener("input", () => {
    updateStlSummary();
    if (dataInput.value.trim()) {
      generateLabel();
    }
  });
}

updateLookupButtonState();
updateExportModeUi();
updateCornerRadiusInputState();
updateStlSummary();
updatePayloadValidity("empty");
updateCameraUi(false);
setStatus("");
