import QRCode from "https://cdn.jsdelivr.net/npm/qrcode@1.5.4/+esm";
import {
  BrowserMultiFormatReader
} from "https://cdn.jsdelivr.net/npm/@zxing/browser@0.1.5/+esm";

const reader = new BrowserMultiFormatReader();
let finalSVG = "";
let finalSTL = "";
const fileInput = document.getElementById("file");
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
const mirrorSvgInput = document.getElementById("mirrorSvg");
const nozzleSizeInput = document.getElementById("nozzleSize");
const layerHeightInput = document.getElementById("layerHeight");
const moduleMultiplierInput = document.getElementById("moduleMultiplier");
const raisedLayerCountInput = document.getElementById("raisedLayerCount");
const mirrorStlInput = document.getElementById("mirrorStl");
const stlSummary = document.getElementById("stlSummary");
const MATTER_QR_PREFIX = "MT:";
const MATTER_BASE38_CHARSET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-.";
const STANDARD_COMMISSIONING_FLOW = 0;
const MATTER_LONG_TO_SHORT_DISCRIMINATOR_SHIFT = 8;
const DCL_PROXY_BASE = "/api/dcl";
const QR_QUIET_ZONE_MODULES = 4;
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

function formatSvgNumber(value) {
  return Number.parseFloat(value.toFixed(3)).toString();
}

function formatMillimeters(value) {
  return `${Number.parseFloat(value.toFixed(2)).toString()} mm`;
}

function setStatus(message, isError = false) {
  if (!status) {
    return;
  }
  status.textContent = message;
  status.style.color = isError ? "#b00020" : "#333";
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
  svgExportSection.hidden = !isSvgMode;
  stlExportSection.hidden = isSvgMode;
  svgExportSection.style.display = isSvgMode ? "" : "none";
  stlExportSection.style.display = isSvgMode ? "none" : "";
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
  return details.map(({ key, value = "", help = "", valueHtml = "" }) => `
    <div class="detail-card">
      <div class="detail-key">${escapeHtml(key)}</div>
      <div class="detail-value">${valueHtml || escapeHtml(value)}</div>
      <div class="detail-help">${escapeHtml(help)}</div>
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

  if (vendorRecord?.vendorLandingPageURL) {
    details.push({
      key: "Vendor Page",
      valueHtml: buildLinkValue(vendorRecord.vendorLandingPageURL, "Open vendor site"),
      help: "The official vendor landing page from the CSA DCL record."
    });
  }

  if (modelRecord?.productUrl) {
    details.push({
      key: "Product Page",
      valueHtml: buildLinkValue(modelRecord.productUrl, "Open product page"),
      help: "The product page published in the official CSA DCL model record."
    });
  }

  if (modelRecord?.supportUrl) {
    details.push({
      key: "Support Page",
      valueHtml: buildLinkValue(modelRecord.supportUrl, "Open support page"),
      help: "The support page published in the official CSA DCL model record."
    });
  }

  detailsGrid.innerHTML = renderDetailCards(details);
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

function updateStlSummary() {
  const { stl } = getExportOptions();
  const summaryParts = [
    `Each QR square will be <strong>${formatMillimeters(stl.moduleSizeMm)}</strong>.`,
    `The QR will be <strong>${formatMillimeters(stl.qrHeightMm)}</strong> tall.`
  ];
  const data = getNormalizedMatterQrText(dataInput.value);

  if (data) {
    try {
      const overallSize = getQrCanvasSize(data, stl.moduleSizeMm);
      summaryParts.push(`The full QR will be about <strong>${formatMillimeters(overallSize)} x ${formatMillimeters(overallSize)}</strong>.`);
    } catch {
      // Ignore invalid data here. The main generator will surface a clearer error.
    }
  }

  summaryParts.push(
    stl.mirror
      ? "Mirroring is enabled for underside printing."
      : "Mirroring is currently off."
  );

  stlSummary.innerHTML = summaryParts.join(" ");
}

function parsePositiveNumber(value, fallback) {
  const parsedValue = Number.parseFloat(value);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}

function parsePositiveInteger(value, fallback) {
  const parsedValue = Number.parseInt(value, 10);
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}

function decimalStringWithPadding(number, length) {
  return String(number).padStart(length, "0");
}

function getNormalizedMatterQrText(text) {
  const payload = extractMatterQrPayload(text);
  return payload ? `${MATTER_QR_PREFIX}${payload}` : "";
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

  return {
    exportMode,
    svg: {
      bambuSafeMode: bambuSafeModeInput.checked,
      mirror: mirrorSvgInput.checked
    },
    stl: {
      nozzleSize,
      layerHeight,
      moduleMultiplier,
      raisedLayerCount,
      mirror: mirrorStlInput.checked,
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
    const result = await reader.decodeFromImageUrl(url);
    const text = result.getText();

    dataInput.value = text;
    syncManualCodeFromData({ force: true });
    generateLabel();
    setStatus(
      lastAutoManualCode
        ? "QR code decoded. Manual pairing code extracted."
        : "QR code decoded. Ready to generate."
    );
  } catch (error) {
    setStatus(`Could not decode the uploaded image: ${error.message}`, true);
  } finally {
    URL.revokeObjectURL(url);
  }
});

dataInput.addEventListener("input", () => {
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

function renderQRModules(data, x, y, size, mirror = false) {
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

function renderBambuSafeQR(data, x, y, moduleSize = 4, mirror = false) {
  const { moduleCount, moduleData, quietZoneModules } = getQrDefinition(data);
  const totalModules = moduleCount + (quietZoneModules * 2);
  const rects = [];

  for (let row = 0; row < moduleCount; row += 1) {
    for (let col = 0; col < moduleCount; col += 1) {
      if (!moduleData[row * moduleCount + col]) continue;

      const drawColumn = mirror
        ? totalModules - quietZoneModules - col - 1
        : col + quietZoneModules;
      rects.push(
        `<rect x="${x + (drawColumn * moduleSize)}" y="${y + ((row + quietZoneModules) * moduleSize)}" width="${moduleSize}" height="${moduleSize}"/>`
      );
    }
  }

  return {
    svg: rects.join(""),
    width: totalModules * moduleSize,
    height: totalModules * moduleSize
  };
}

function buildBambuSafeSvg(data, includeSizingMetadata, mirror = false) {
  const safeQR = renderBambuSafeQR(data, 0, 0, 4, mirror);
  const sizeAttributes = includeSizingMetadata
    ? ` width="${safeQR.width}" height="${safeQR.height}" viewBox="0 0 ${safeQR.width} ${safeQR.height}"`
    : "";

  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg"${sizeAttributes}>${safeQR.svg}</svg>`,
    width: safeQR.width,
    height: safeQR.height
  };
}

function getQrCanvasSize(data, moduleSize = 4) {
  const { moduleCount, quietZoneModules } = getQrDefinition(data);
  return (moduleCount + (quietZoneModules * 2)) * moduleSize;
}

function buildNormalQrSvg(data, includeSizingMetadata, mirror = false) {
  const size = getQrCanvasSize(data, 4);
  const sizeAttributes = includeSizingMetadata
    ? ` width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"`
    : ` viewBox="0 0 ${size} ${size}"`;

  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg"${sizeAttributes}>${renderQRModules(data, 0, 0, size, mirror)}</svg>`,
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

function buildQrStl(data, settings) {
  const { moduleCount, moduleData, quietZoneModules } = getQrDefinition(data);
  const moduleSizeMm = settings.moduleSizeMm;
  const facets = [];
  const xOffset = settings.mirror
    ? (moduleCount + (quietZoneModules * 2)) * moduleSizeMm
    : 0;

  for (let row = 0; row < moduleCount; row += 1) {
    for (let col = 0; col < moduleCount; col += 1) {
      if (!moduleData[row * moduleCount + col]) continue;

      const rawX = (col + quietZoneModules) * moduleSizeMm;
      const y = (row + quietZoneModules) * moduleSizeMm;
      const x = settings.mirror
        ? xOffset - rawX - moduleSizeMm
        : rawX;

      appendPrismFacets(
        facets,
        x,
        y,
        moduleSizeMm,
        moduleSizeMm,
        0,
        settings.qrHeightMm
      );
    }
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
    setStatus("Enter or decode a valid Matter QR payload first.", true);
    clearGeneratedOutput();
    return;
  }

  try {
    syncManualCodeFromData({ force: true });

    if (selectedExportMode === "stl") {
      finalSTL = buildQrStl(data, stl);
      const previewNormalSvg = buildNormalQrSvg(data, true);
      finalSVG = "";
      output.innerHTML = previewNormalSvg.svg;
      return;
    }

    finalSTL = "";

    if (svg.bambuSafeMode) {
      const downloadSafeSvg = buildBambuSafeSvg(data, false, svg.mirror);
      const previewSafeSvg = buildBambuSafeSvg(data, true, svg.mirror);
      finalSVG = downloadSafeSvg.svg;
      output.innerHTML = previewSafeSvg.svg;
      return;
    }

    const downloadNormalSvg = buildNormalQrSvg(data, false, svg.mirror);
    const previewNormalSvg = buildNormalQrSvg(data, true, svg.mirror);
    finalSVG = downloadNormalSvg.svg;
    output.innerHTML = previewNormalSvg.svg;
  } catch (error) {
    clearGeneratedOutput();
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

svgModeBtn.addEventListener("click", (event) => {
  event.preventDefault();
  selectExportMode("svg");
});
stlModeBtn.addEventListener("click", (event) => {
  event.preventDefault();
  selectExportMode("stl");
});
downloadBtn.addEventListener("click", downloadLabel);
downloadStlBtn.addEventListener("click", downloadStl);

for (const input of [bambuSafeModeInput, mirrorSvgInput]) {
  input.addEventListener("change", () => {
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
  mirrorStlInput
]) {
  input.addEventListener("input", () => {
    updateStlSummary();
    if (dataInput.value.trim()) {
      generateLabel();
    }
  });
}

updateLookupButtonState();
updateExportModeUi();
updateStlSummary();
updatePayloadValidity("empty");
