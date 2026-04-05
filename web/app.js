import QRCode from "https://cdn.jsdelivr.net/npm/qrcode@1.5.4/+esm";
import {
  BrowserMultiFormatReader
} from "https://cdn.jsdelivr.net/npm/@zxing/browser@0.1.5/+esm";

const reader = new BrowserMultiFormatReader();
let finalSVG = "";
const fileInput = document.getElementById("file");
const decodedOutput = document.getElementById("decoded");
const dataInput = document.getElementById("data");
const manualDisplay = document.getElementById("manualDisplay");
const lookupBtn = document.getElementById("dclLookupBtn");
const lookupStatus = document.getElementById("lookupStatus");
const detailsGrid = document.getElementById("detailsGrid");
const output = document.getElementById("output");
const status = document.getElementById("status");
const downloadBtn = document.getElementById("downloadBtn");
const bambuSafeModeInput = document.getElementById("bambuSafeMode");
const MATTER_QR_PREFIX = "MT:";
const MATTER_BASE38_CHARSET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-.";
const STANDARD_COMMISSIONING_FLOW = 0;
const MATTER_LONG_TO_SHORT_DISCRIMINATOR_SHIFT = 8;
const DCL_PROXY_BASE = "/api/dcl";
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

function formatSvgNumber(value) {
  return Number.parseFloat(value.toFixed(3)).toString();
}

function setStatus(message, isError = false) {
  status.textContent = message;
  status.style.color = isError ? "#b00020" : "#333";
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
      fetchDclVendorDirectory(),
      fetchDclModelRecord(requestedPayload.vendorId, requestedPayload.productId)
    ]);

    if (requestedKey !== getPayloadLookupKey(currentPayload)) {
      return;
    }

    const vendorRecord = vendorResult.status === "fulfilled"
      ? (vendorResult.value.get(requestedPayload.vendorId) || null)
      : null;
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
}

function decimalStringWithPadding(number, length) {
  return String(number).padStart(length, "0");
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
  const data = dataInput.value.trim();
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

    updateLookupButtonState();
    updateDetailsDisplay(payload);
  } catch {
    currentPayload = null;
    clearLiveLookupData();
    lastAutoManualCode = "";
    updateManualDisplay("");
    updateLookupButtonState();
    updateDetailsDisplay(null);
  }
}

function getExportOptions() {
  return {
    bambuSafeMode: bambuSafeModeInput.checked
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

    decodedOutput.textContent = text;
    dataInput.value = text;
    syncManualCodeFromData({ force: true });
    generateLabel();
    setStatus(
      lastAutoManualCode
        ? "QR code decoded. Manual pairing code extracted."
        : "QR code decoded. Ready to generate."
    );
  } catch (error) {
    decodedOutput.textContent = "No QR code found";
    setStatus(`Could not decode the uploaded image: ${error.message}`, true);
  } finally {
    URL.revokeObjectURL(url);
  }
});

dataInput.addEventListener("input", () => {
  syncManualCodeFromData();
  if (!dataInput.value.trim()) {
    clearGeneratedOutput();
    return;
  }
  generateLabel();
});

const matterLogoWidth = 512;
const matterLogo = `
<path d="M152 128.5c21.5 17.5 47.1 29.2 74.4 34.2V17.1L256.1 0l29.6 17.1v145.5c27.3-4.9 52.9-16.7 74.5-34.2l53.8 31.1c-87.6 86.5-228.5 86.5-316.1 0zM217.5 500c31.2-119.1-39.4-241.1-158.2-273.5v62.3c25.9 9.9 48.9 26.2 66.8 47.4L0 408.8V443l29.7 17 126.1-72.7c9.4 26.1 12 54.2 7.6 81.4l54.1 31.4Zm235.3-273.5C334 259 263.6 381 294.8 500l54-31.2c-4.4-27.4-1.7-55.4 7.6-81.4l126 72.6 29.6-17.1v-34.2L385.9 336c17.9-21.2 40.9-37.5 66.8-47.4v-62.2Z" fill="black"/>
`;

function renderQRModules(data, x, y, size) {
  const qr = QRCode.create(data, { errorCorrectionLevel: "M" });
  const moduleCount = qr.modules.size;
  const moduleData = qr.modules.data;
  const quietZoneModules = 4;
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
        const runX = x + ((runStart + quietZoneModules) * moduleSize);
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

function renderBambuSafeQR(data, x, y, moduleSize = 4) {
  const qr = QRCode.create(data, { errorCorrectionLevel: "M" });
  const moduleCount = qr.modules.size;
  const moduleData = qr.modules.data;
  const quietZoneModules = 4;
  const rects = [];

  for (let row = 0; row < moduleCount; row += 1) {
    for (let col = 0; col < moduleCount; col += 1) {
      if (!moduleData[row * moduleCount + col]) continue;

      rects.push(
        `<rect x="${x + ((col + quietZoneModules) * moduleSize)}" y="${y + ((row + quietZoneModules) * moduleSize)}" width="${moduleSize}" height="${moduleSize}"/>`
      );
    }
  }

  return {
    svg: rects.join(""),
    width: (moduleCount + (quietZoneModules * 2)) * moduleSize,
    height: (moduleCount + (quietZoneModules * 2)) * moduleSize
  };
}

function buildBambuSafeSvg(data, includeSizingMetadata) {
  const safeQR = renderBambuSafeQR(data, 0, 0, 4);
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
  const qr = QRCode.create(data, { errorCorrectionLevel: "M" });
  const quietZoneModules = 4;
  return (qr.modules.size + (quietZoneModules * 2)) * moduleSize;
}

function buildNormalQrSvg(data, includeSizingMetadata) {
  const size = getQrCanvasSize(data, 4);
  const sizeAttributes = includeSizingMetadata
    ? ` width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"`
    : ` viewBox="0 0 ${size} ${size}"`;

  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg"${sizeAttributes}>${renderQRModules(data, 0, 0, size)}</svg>`,
    size
  };
}

function roundedRectPath(x, y, width, height, radius, reverse = false) {
  const right = x + width;
  const bottom = y + height;
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));

  if (reverse) {
    return [
      `M ${x + r} ${y}`,
      `H ${right - r}`,
      `A ${r} ${r} 0 0 0 ${right} ${y + r}`,
      `V ${bottom - r}`,
      `A ${r} ${r} 0 0 0 ${right - r} ${bottom}`,
      `H ${x + r}`,
      `A ${r} ${r} 0 0 0 ${x} ${bottom - r}`,
      `V ${y + r}`,
      `A ${r} ${r} 0 0 0 ${x + r} ${y}`,
      "Z"
    ].join(" ");
  }

  return [
    `M ${x + r} ${y}`,
    `H ${right - r}`,
    `A ${r} ${r} 0 0 1 ${right} ${y + r}`,
    `V ${bottom - r}`,
    `A ${r} ${r} 0 0 1 ${right - r} ${bottom}`,
    `H ${x + r}`,
    `A ${r} ${r} 0 0 1 ${x} ${bottom - r}`,
    `V ${y + r}`,
    `A ${r} ${r} 0 0 1 ${x + r} ${y}`,
    "Z"
  ].join(" ");
}

function renderRoundedFrame(x, y, size, radius, thickness) {
  const innerInset = thickness;
  const outerPath = roundedRectPath(x, y, size, size, radius);
  const innerPath = roundedRectPath(
    x + innerInset,
    y + innerInset,
    size - (innerInset * 2),
    size - (innerInset * 2),
    Math.max(radius - innerInset, 0),
    true
  );

  return `<path d="${outerPath} ${innerPath}" fill="black" fill-rule="evenodd"/>`;
}

function renderManualCode(manual, centerX, baselineY, availableWidth) {
  if (!manual) return "";

  const segmentMap = {
    "0": ["a", "b", "c", "d", "e", "f"],
    "1": ["b", "c"],
    "2": ["a", "b", "g", "e", "d"],
    "3": ["a", "b", "g", "c", "d"],
    "4": ["f", "g", "b", "c"],
    "5": ["a", "f", "g", "c", "d"],
    "6": ["a", "f", "g", "e", "c", "d"],
    "7": ["a", "b", "c"],
    "8": ["a", "b", "c", "d", "e", "f", "g"],
    "9": ["a", "b", "c", "d", "f", "g"]
  };
  const spacing = 2;
  const digitWidth = Math.min(12, (availableWidth - ((manual.length - 1) * spacing)) / manual.length);
  const digitHeight = digitWidth * 1.9;
  const thickness = Math.max(1.4, digitWidth * 0.18);
  const totalWidth = (digitWidth * manual.length) + (spacing * (manual.length - 1));
  const startX = centerX - (totalWidth / 2);
  const topY = baselineY - digitHeight;
  const verticalHeight = (digitHeight - (3 * thickness)) / 2;
  const segments = [];

  function horizontalSegment(x, y) {
    return `<rect x="${x.toFixed(4)}" y="${y.toFixed(4)}" width="${digitWidth.toFixed(4)}" height="${thickness.toFixed(4)}" />`;
  }

  function verticalSegment(x, y) {
    return `<rect x="${x.toFixed(4)}" y="${y.toFixed(4)}" width="${thickness.toFixed(4)}" height="${verticalHeight.toFixed(4)}" />`;
  }

  for (let index = 0; index < manual.length; index += 1) {
    const digit = manual[index];
    const activeSegments = segmentMap[digit] ?? [];
    const x = startX + (index * (digitWidth + spacing));

    if (activeSegments.includes("a")) segments.push(horizontalSegment(x, topY));
    if (activeSegments.includes("g")) segments.push(horizontalSegment(x, topY + thickness + verticalHeight));
    if (activeSegments.includes("d")) segments.push(horizontalSegment(x, topY + (2 * thickness) + (2 * verticalHeight)));
    if (activeSegments.includes("f")) segments.push(verticalSegment(x, topY + thickness));
    if (activeSegments.includes("b")) segments.push(verticalSegment(x + digitWidth - thickness, topY + thickness));
    if (activeSegments.includes("e")) segments.push(verticalSegment(x, topY + (2 * thickness) + verticalHeight));
    if (activeSegments.includes("c")) segments.push(verticalSegment(x + digitWidth - thickness, topY + (2 * thickness) + verticalHeight));
  }

  return `<g fill="black">${segments.join("")}</g>`;
}

async function generateLabel() {
  const data = dataInput.value.trim();
  const { bambuSafeMode } = getExportOptions();

  if (!data) {
    setStatus("Enter or decode a Matter QR payload first.", true);
    clearGeneratedOutput();
    return;
  }

  try {
    syncManualCodeFromData({ force: true });

    if (bambuSafeMode) {
      const downloadSafeSvg = buildBambuSafeSvg(data, false);
      const previewSafeSvg = buildBambuSafeSvg(data, true);
      finalSVG = downloadSafeSvg.svg;
      output.innerHTML = previewSafeSvg.svg;
      return;
    }

    const downloadNormalSvg = buildNormalQrSvg(data, false);
    const previewNormalSvg = buildNormalQrSvg(data, true);
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

  const blob = new Blob([finalSVG], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "matter-label.svg";
  a.click();

  URL.revokeObjectURL(url);
  setStatus("SVG downloaded.");
}

lookupBtn.addEventListener("click", lookupOfficialMatterInfo);
downloadBtn.addEventListener("click", downloadLabel);

for (const input of [bambuSafeModeInput]) {
  input.addEventListener("change", () => {
    if (dataInput.value.trim()) {
      generateLabel();
    } else {
      clearGeneratedOutput();
    }
  });
}

updateLookupButtonState();
