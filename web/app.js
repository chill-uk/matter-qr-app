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
const cameraPanel = document.getElementById("cameraPanel");
const cameraCard = startCameraBtn?.closest(".scan-card") || cameraPanel?.closest(".scan-card") || null;
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
const themeToggle = document.getElementById("themeToggle");
const themeMenu = document.getElementById("themeMenu");
const themeOptionButtons = Array.from(document.querySelectorAll("[data-theme-option]"));
const languageToggle = document.getElementById("languageToggle");
const languageMenu = document.getElementById("languageMenu");
const languageOptionButtons = Array.from(document.querySelectorAll("[data-language-option]"));
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
const LANGUAGE_STORAGE_KEY = "matterQrLanguage";
const THEME_STORAGE_KEY = "matterQrTheme";
const LANGUAGE_FLAGS = {
  en: "🇬🇧",
  nl: "🇳🇱",
  es: "🇪🇸",
  de: "🇩🇪",
  fr: "🇫🇷",
  it: "🇮🇹"
};
const THEME_ICONS = {
  auto: "◐",
  light: "☀",
  dark: "☾"
};
const THEME_NAMES = {
  auto: "Auto",
  light: "Light",
  dark: "Dark"
};
const TRANSLATIONS = {
  en: {
    languageName: "English",
    "language.label": "Language",
    "theme.label": "Theme",
    "theme.auto": "Auto",
    "theme.light": "Light",
    "theme.dark": "Dark",
    "page.title": "Matter QR Code Tool",
    "page.lead1": "This tool lets you upload a Matter QR code, decode it, and recover the setup code.",
    "page.lead2": "You can then generate clean SVG or STL files, ready for 3D printing or creating replacement labels.",
    "privacy.local": "Everything runs locally in your browser. No sensitive data is sent anywhere.",
    "scan.title": "1. Scan Or Upload",
    "scan.camera.title": "Live Camera",
    "scan.camera.help": "Point your phone or laptop camera at the Matter QR code for fast scanning.",
    "scan.camera.start": "📷 Start Camera Scan",
    "scan.camera.stop": "Stop Camera Scan",
    "scan.upload.title": "Photo Upload",
    "scan.upload.help": "Choose an existing photo or screenshot if the live scanner is not convenient.",
    "scan.fallback": "If automatic decoding still does not work, you can paste the <code>MT:</code> payload directly into the field in step 2.",
    "payload.title": "2. Review Payload",
    "payload.waiting": "Waiting For Input",
    "payload.valid": "Valid MT Code",
    "payload.invalid": "Invalid MT Code",
    "payload.help": "The <code>MT:</code> value is the Matter setup payload stored in the QR code. It contains the commissioning data used to pair the device, so it should be treated as sensitive.",
    "payload.pairingLabel": "Extracted Pairing Code",
    "payload.warning": "Warning: do not share the extracted QR contents or pairing code with anyone you do not trust.",
    "lookup.request": "Request Official Product Info",
    "lookup.refresh": "Refresh Official Product Info",
    "lookup.loadingButton": "Looking Up Official Info...",
    "lookup.pending": "Requesting official product info...",
    "lookup.loadedProduct": "Loaded official product info.",
    "lookup.loadedVendor": "Loaded official vendor info.",
    "lookup.noRecord": "No matching official product record was found.",
    "lookup.unavailable": "Official product lookup is unavailable right now: {message}",
    "lookup.help": "Optional: This requests the product records via its product ID.",
    "lookup.privacy": "<strong>No sensitive information is sent.</strong> Only the extracted vendor and product IDs are used for the lookup, not the setup PIN or full <code>MT:</code> payload.",
    "export.title": "3. Export",
    "export.modeLabel": "Export mode",
    "export.svg": "SVG Export",
    "export.stl": "STL Export",
    "export.compatibility": "Compatibility mode: no viewport sizing",
    "stl.settings": "STL Settings",
    "stl.help": "Use the nozzle and layer settings from your slicer profile here. The tool will size the QR automatically.",
    "stl.printer": "Your Printer",
    "stl.nozzle": "Nozzle Size (mm)",
    "stl.layer": "Layer Height (mm)",
    "stl.output": "QR Code Output",
    "stl.width": "QR Square Width (x nozzle)",
    "stl.height": "QR Height (layers)",
    "stl.squareSize": "Each QR square will be ",
    "stl.qrHeight": "The QR will be ",
    "stl.tall": " tall.",
    "stl.fullSize": "The full QR will be about ",
    "stl.mirrorOn": "Mirroring is enabled for underside printing.",
    "stl.mirrorOff": "Mirroring is currently off.",
    "preview.title": "4. Preview & Download",
    "preview.moduleShape": "QR Module Shape",
    "preview.square": "Square",
    "preview.round": "Round Dots",
    "preview.cornerRadius": "Corner Radius (%)",
    "preview.orientation": "Print Orientation",
    "preview.standard": "Standard",
    "preview.mirrored": "Underside / Mirrored",
    "preview.label": "Preview",
    "download.svg": "Download SVG",
    "download.stl": "Download STL",
    "instructions.title": "Instructions for Bambu Lab / OrcaSlicer",
    "instructions.step1": "Generate and download the QR file you want to use.",
    "instructions.step2": "Right-click the part you want to modify.",
    "instructions.step3": "Choose <code>Add modifier</code>, then <code>Load</code>, and select the QR SVG or STL.",
    "instructions.step4": "Position the modifier where you want the QR.",
    "instructions.step5": "Change the filament color so it shows up on the finished print.",
    "instructions.step6": "If the final visible QR would end up reversed, enable mirroring before exporting.",
    "support.title": "Support",
    "support.copy": "If this tool helped you rescue a device or saved you some time, you can follow the project or support me here.",
    "support.github": "GitHub Repo",
    "support.kofi": "Support Me",
    "details.setupPin": "Setup PIN",
    "details.discriminator": "Discriminator",
    "details.vendorId": "Vendor ID",
    "details.productId": "Product ID",
    "details.version": "Version",
    "details.flow": "Flow",
    "details.rendezvous": "Rendezvous",
    "details.modelName": "Model Name",
    "details.partNumber": "Part Number",
    "details.vendorPage": "Vendor Page",
    "details.productPage": "Product Page",
    "details.supportPage": "Support Page",
    "details.officialLinks": "Official DCL Links",
    "details.openVendor": "Open vendor site",
    "details.openProduct": "Open product page",
    "details.openSupport": "Open support page",
    "flow.standard": "Standard",
    "flow.userIntent": "User-Intent",
    "flow.custom": "Custom",
    "flow.unknown": "Unknown ({value})",
    "status.validQr": "Valid QR code.",
    "status.qrDecoded": "QR decoded.",
    "status.invalidQr": "Invalid QR code.",
    "status.scanStopped": "Camera scan stopped.",
    "status.cameraUnsupported": "Camera scanning is not supported in this browser.",
    "status.cameraStarting": "Starting camera...",
    "status.waitingLiveScan": "Waiting for a live QR scan...",
    "status.scanComplete": "Scan complete.",
    "status.liveScanComplete": "Live QR scan complete.",
    "status.cameraUnavailable": "Unable to access the camera.",
    "status.cameraFailed": "Camera scan failed: {message}",
    "status.generateFailed": "Could not generate the QR label: {message}",
    "status.generateFirstSvg": "Generate a label before downloading.",
    "status.generateFirstStl": "Generate a label before downloading the STL.",
    "status.svgDownloaded": "SVG downloaded.",
    "status.stlDownloaded": "STL downloaded."
  },
  nl: {
    languageName: "Nederlands",
    "language.label": "Taal",
    "theme.label": "Thema",
    "theme.auto": "Automatisch",
    "theme.light": "Licht",
    "theme.dark": "Donker",
    "page.title": "Matter QR-code tool",
    "page.lead1": "Upload een Matter QR-code, decodeer hem en haal de installatiecode terug.",
    "page.lead2": "Maak daarna nette SVG- of STL-bestanden voor 3D-printen of vervangende labels.",
    "privacy.local": "Alles gebeurt lokaal in je browser. Er wordt geen gevoelige data verstuurd.",
    "scan.title": "1. Scannen of uploaden",
    "scan.camera.title": "Live camera",
    "scan.camera.help": "Richt de camera van je telefoon of laptop op de Matter QR-code voor snel scannen.",
    "scan.camera.start": "📷 Camera starten",
    "scan.camera.stop": "Camera stoppen",
    "scan.upload.title": "Foto uploaden",
    "scan.upload.help": "Kies een bestaande foto of screenshot als live scannen niet handig is.",
    "scan.fallback": "Als automatisch decoderen niet lukt, plak dan de <code>MT:</code>-payload direct in het veld bij stap 2.",
    "payload.title": "2. Payload controleren",
    "payload.waiting": "Wacht op invoer",
    "payload.valid": "Geldige MT-code",
    "payload.invalid": "Ongeldige MT-code",
    "payload.help": "De <code>MT:</code>-waarde is de Matter-installatiepayload uit de QR-code. Die bevat de gegevens om het apparaat te koppelen, dus behandel hem als gevoelig.",
    "payload.pairingLabel": "Uitgelezen koppelcode",
    "payload.warning": "Waarschuwing: deel de uitgelezen QR-inhoud of koppelcode niet met mensen die je niet vertrouwt.",
    "lookup.request": "Officiele productinfo opvragen",
    "lookup.refresh": "Officiele productinfo verversen",
    "lookup.loadingButton": "Officiele info ophalen...",
    "lookup.pending": "Officiele productinfo opvragen...",
    "lookup.loadedProduct": "Officiele productinfo geladen.",
    "lookup.loadedVendor": "Officiele fabrikantinfo geladen.",
    "lookup.noRecord": "Geen bijpassend officieel productrecord gevonden.",
    "lookup.unavailable": "Officiele productlookup is nu niet beschikbaar: {message}",
    "lookup.help": "Optioneel: hiermee worden productrecords opgevraagd via de product-ID.",
    "lookup.privacy": "<strong>Er wordt geen gevoelige informatie verstuurd.</strong> Alleen de uitgelezen fabrikant- en product-ID's worden gebruikt, niet de setup-PIN of volledige <code>MT:</code>-payload.",
    "export.title": "3. Exporteren",
    "export.modeLabel": "Exportmodus",
    "export.svg": "SVG-export",
    "export.stl": "STL-export",
    "export.compatibility": "Compatibiliteitsmodus: geen viewport-afmetingen",
    "stl.settings": "STL-instellingen",
    "stl.help": "Gebruik hier de nozzle- en laaginstellingen uit je slicerprofiel. De tool schaalt de QR-code automatisch.",
    "stl.printer": "Je printer",
    "stl.nozzle": "Nozzlemaat (mm)",
    "stl.layer": "Laaghoogte (mm)",
    "stl.output": "QR-code uitvoer",
    "stl.width": "Breedte QR-vakje (x nozzle)",
    "stl.height": "QR-hoogte (lagen)",
    "stl.squareSize": "Elk QR-vakje wordt ",
    "stl.qrHeight": "De QR-code wordt ",
    "stl.tall": " hoog.",
    "stl.fullSize": "De volledige QR-code wordt ongeveer ",
    "stl.mirrorOn": "Spiegelen staat aan voor printen aan de onderzijde.",
    "stl.mirrorOff": "Spiegelen staat uit.",
    "preview.title": "4. Voorbeeld en download",
    "preview.moduleShape": "Vorm van QR-modules",
    "preview.square": "Vierkant",
    "preview.round": "Ronde stippen",
    "preview.cornerRadius": "Hoekradius (%)",
    "preview.orientation": "Printorientatie",
    "preview.standard": "Standaard",
    "preview.mirrored": "Onderzijde / gespiegeld",
    "preview.label": "Voorbeeld",
    "download.svg": "SVG downloaden",
    "download.stl": "STL downloaden",
    "instructions.title": "Instructies voor Bambu Lab / OrcaSlicer",
    "instructions.step1": "Genereer en download het QR-bestand dat je wilt gebruiken.",
    "instructions.step2": "Klik met rechts op het onderdeel dat je wilt aanpassen.",
    "instructions.step3": "Kies <code>Add modifier</code>, daarna <code>Load</code>, en selecteer de QR-SVG of STL.",
    "instructions.step4": "Plaats de modifier waar je de QR-code wilt hebben.",
    "instructions.step5": "Verander de filamentkleur zodat hij zichtbaar is op de uiteindelijke print.",
    "instructions.step6": "Zet spiegelen aan voor het exporteren als de zichtbare QR-code anders omgekeerd zou uitkomen.",
    "support.title": "Support",
    "support.copy": "Als deze tool je heeft geholpen een apparaat te redden of tijd te besparen, kun je het project volgen of me hier steunen.",
    "support.github": "GitHub-repo",
    "support.kofi": "Steun mij",
    "details.setupPin": "Setup-PIN",
    "details.discriminator": "Discriminator",
    "details.vendorId": "Fabrikant-ID",
    "details.productId": "Product-ID",
    "details.version": "Versie",
    "details.flow": "Flow",
    "details.rendezvous": "Rendezvous",
    "details.modelName": "Modelnaam",
    "details.partNumber": "Onderdeelnummer",
    "details.vendorPage": "Fabrikantpagina",
    "details.productPage": "Productpagina",
    "details.supportPage": "Supportpagina",
    "details.officialLinks": "Officiele DCL-links",
    "details.openVendor": "Fabrikantsite openen",
    "details.openProduct": "Productpagina openen",
    "details.openSupport": "Supportpagina openen",
    "flow.standard": "Standaard",
    "flow.userIntent": "Gebruikersintentie",
    "flow.custom": "Aangepast",
    "flow.unknown": "Onbekend ({value})",
    "status.validQr": "Geldige QR-code.",
    "status.qrDecoded": "QR-code gedecodeerd.",
    "status.invalidQr": "Ongeldige QR-code.",
    "status.scanStopped": "Camerascan gestopt.",
    "status.cameraUnsupported": "Camerascan wordt niet ondersteund in deze browser.",
    "status.cameraStarting": "Camera starten...",
    "status.waitingLiveScan": "Wachten op een live QR-scan...",
    "status.scanComplete": "Scan voltooid.",
    "status.liveScanComplete": "Live QR-scan voltooid.",
    "status.cameraUnavailable": "Geen toegang tot de camera.",
    "status.cameraFailed": "Camerascan mislukt: {message}",
    "status.generateFailed": "Kon het QR-label niet genereren: {message}",
    "status.generateFirstSvg": "Genereer eerst een label voordat je downloadt.",
    "status.generateFirstStl": "Genereer eerst een label voordat je de STL downloadt.",
    "status.svgDownloaded": "SVG gedownload.",
    "status.stlDownloaded": "STL gedownload."
  },
  es: {
    languageName: "Español",
    "language.label": "Idioma",
    "theme.label": "Tema",
    "theme.auto": "Automático",
    "theme.light": "Claro",
    "theme.dark": "Oscuro",
    "page.title": "Herramienta de códigos QR Matter",
    "page.lead1": "Sube un código QR Matter, descífralo y recupera el código de configuración.",
    "page.lead2": "Después puedes generar archivos SVG o STL limpios, listos para impresión 3D o etiquetas de reemplazo.",
    "privacy.local": "Todo se ejecuta localmente en tu navegador. No se envía ningún dato sensible.",
    "scan.title": "1. Escanear o subir",
    "scan.camera.title": "Cámara en directo",
    "scan.camera.help": "Apunta la cámara de tu teléfono o portátil al código QR Matter para escanearlo rápido.",
    "scan.camera.start": "📷 Iniciar cámara",
    "scan.camera.stop": "Detener cámara",
    "scan.upload.title": "Subir foto",
    "scan.upload.help": "Elige una foto o captura existente si el escaneo en directo no es cómodo.",
    "scan.fallback": "Si la detección automática no funciona, pega la carga <code>MT:</code> directamente en el campo del paso 2.",
    "payload.title": "2. Revisar payload",
    "payload.waiting": "Esperando entrada",
    "payload.valid": "Código MT válido",
    "payload.invalid": "Código MT no válido",
    "payload.help": "El valor <code>MT:</code> es la carga de configuración Matter almacenada en el código QR. Contiene los datos usados para emparejar el dispositivo, así que trátalo como sensible.",
    "payload.pairingLabel": "Código de emparejamiento extraído",
    "payload.warning": "Advertencia: no compartas el contenido QR extraído ni el código de emparejamiento con nadie en quien no confíes.",
    "lookup.request": "Solicitar información oficial del producto",
    "lookup.refresh": "Actualizar información oficial del producto",
    "lookup.loadingButton": "Buscando información oficial...",
    "lookup.pending": "Solicitando información oficial del producto...",
    "lookup.loadedProduct": "Información oficial del producto cargada.",
    "lookup.loadedVendor": "Información oficial del fabricante cargada.",
    "lookup.noRecord": "No se encontró ningún registro oficial de producto coincidente.",
    "lookup.unavailable": "La búsqueda oficial del producto no está disponible ahora: {message}",
    "lookup.help": "Opcional: solicita los registros del producto mediante su ID de producto.",
    "lookup.privacy": "<strong>No se envía información sensible.</strong> Solo se usan los ID de fabricante y producto extraídos, no el PIN de configuración ni la carga <code>MT:</code> completa.",
    "export.title": "3. Exportar",
    "export.modeLabel": "Modo de exportación",
    "export.svg": "Exportar SVG",
    "export.stl": "Exportar STL",
    "export.compatibility": "Modo de compatibilidad: sin tamaño de viewport",
    "stl.settings": "Ajustes STL",
    "stl.help": "Usa aquí los ajustes de boquilla y capa de tu perfil de laminador. La herramienta ajustará el tamaño del QR automáticamente.",
    "stl.printer": "Tu impresora",
    "stl.nozzle": "Tamaño de boquilla (mm)",
    "stl.layer": "Altura de capa (mm)",
    "stl.output": "Salida del código QR",
    "stl.width": "Ancho del módulo QR (x boquilla)",
    "stl.height": "Altura del QR (capas)",
    "stl.squareSize": "Cada módulo del QR será de ",
    "stl.qrHeight": "El QR tendrá ",
    "stl.tall": " de alto.",
    "stl.fullSize": "El QR completo medirá aproximadamente ",
    "stl.mirrorOn": "El reflejo está activado para imprimir por la parte inferior.",
    "stl.mirrorOff": "El reflejo está desactivado.",
    "preview.title": "4. Vista previa y descarga",
    "preview.moduleShape": "Forma de los módulos QR",
    "preview.square": "Cuadrados",
    "preview.round": "Puntos redondos",
    "preview.cornerRadius": "Radio de esquina (%)",
    "preview.orientation": "Orientación de impresión",
    "preview.standard": "Estándar",
    "preview.mirrored": "Parte inferior / reflejado",
    "preview.label": "Vista previa",
    "download.svg": "Descargar SVG",
    "download.stl": "Descargar STL",
    "instructions.title": "Instrucciones para Bambu Lab / OrcaSlicer",
    "instructions.step1": "Genera y descarga el archivo QR que quieres usar.",
    "instructions.step2": "Haz clic derecho en la pieza que quieres modificar.",
    "instructions.step3": "Elige <code>Add modifier</code>, luego <code>Load</code>, y selecciona el SVG o STL del QR.",
    "instructions.step4": "Coloca el modificador donde quieras el QR.",
    "instructions.step5": "Cambia el color del filamento para que se vea en la impresión final.",
    "instructions.step6": "Si el QR visible final quedaría invertido, activa el reflejo antes de exportar.",
    "support.title": "Soporte",
    "support.copy": "Si esta herramienta te ayudó a rescatar un dispositivo o te ahorró tiempo, puedes seguir el proyecto o apoyarme aquí.",
    "support.github": "Repositorio de GitHub",
    "support.kofi": "Apóyame",
    "details.setupPin": "PIN de configuración",
    "details.discriminator": "Discriminador",
    "details.vendorId": "ID de fabricante",
    "details.productId": "ID de producto",
    "details.version": "Versión",
    "details.flow": "Flujo",
    "details.rendezvous": "Rendezvous",
    "details.modelName": "Nombre del modelo",
    "details.partNumber": "Número de pieza",
    "details.vendorPage": "Página del fabricante",
    "details.productPage": "Página del producto",
    "details.supportPage": "Página de soporte",
    "details.officialLinks": "Enlaces DCL oficiales",
    "details.openVendor": "Abrir sitio del fabricante",
    "details.openProduct": "Abrir página del producto",
    "details.openSupport": "Abrir página de soporte",
    "flow.standard": "Estándar",
    "flow.userIntent": "Intención del usuario",
    "flow.custom": "Personalizado",
    "flow.unknown": "Desconocido ({value})",
    "status.validQr": "Código QR válido.",
    "status.qrDecoded": "Código QR descifrado.",
    "status.invalidQr": "Código QR no válido.",
    "status.scanStopped": "Escaneo de cámara detenido.",
    "status.cameraUnsupported": "El escaneo con cámara no es compatible con este navegador.",
    "status.cameraStarting": "Iniciando cámara...",
    "status.waitingLiveScan": "Esperando un escaneo QR en directo...",
    "status.scanComplete": "Escaneo completado.",
    "status.liveScanComplete": "Escaneo QR en directo completado.",
    "status.cameraUnavailable": "No se puede acceder a la cámara.",
    "status.cameraFailed": "Error al escanear con la cámara: {message}",
    "status.generateFailed": "No se pudo generar la etiqueta QR: {message}",
    "status.generateFirstSvg": "Genera una etiqueta antes de descargar.",
    "status.generateFirstStl": "Genera una etiqueta antes de descargar el STL.",
    "status.svgDownloaded": "SVG descargado.",
    "status.stlDownloaded": "STL descargado."
  },
  de: {
    languageName: "Deutsch",
    "language.label": "Sprache",
    "theme.label": "Design",
    "theme.auto": "Automatisch",
    "theme.light": "Hell",
    "theme.dark": "Dunkel",
    "page.title": "Matter QR-Code Tool",
    "page.lead1": "Lade einen Matter QR-Code hoch, decodiere ihn und stelle den Einrichtungscode wieder her.",
    "page.lead2": "Anschließend kannst du saubere SVG- oder STL-Dateien für 3D-Drucke oder Ersatzetiketten erstellen.",
    "privacy.local": "Alles läuft lokal in deinem Browser. Es werden keine sensiblen Daten gesendet.",
    "scan.title": "1. Scannen oder hochladen",
    "scan.camera.title": "Live-Kamera",
    "scan.camera.help": "Richte die Kamera deines Telefons oder Laptops auf den Matter QR-Code, um ihn schnell zu scannen.",
    "scan.camera.start": "📷 Kamera starten",
    "scan.camera.stop": "Kamera stoppen",
    "scan.upload.title": "Foto hochladen",
    "scan.upload.help": "Wähle ein vorhandenes Foto oder einen Screenshot aus, wenn der Live-Scanner gerade nicht praktisch ist.",
    "scan.fallback": "Wenn die automatische Decodierung nicht funktioniert, füge die <code>MT:</code>-Payload direkt in das Feld in Schritt 2 ein.",
    "payload.title": "2. Payload prüfen",
    "payload.waiting": "Wartet auf Eingabe",
    "payload.valid": "Gültiger MT-Code",
    "payload.invalid": "Ungültiger MT-Code",
    "payload.help": "Der <code>MT:</code>-Wert ist die Matter-Einrichtungspayload aus dem QR-Code. Er enthält die Daten zum Koppeln des Geräts und sollte daher vertraulich behandelt werden.",
    "payload.pairingLabel": "Extrahierter Kopplungscode",
    "payload.warning": "Warnung: Teile den extrahierten QR-Inhalt oder Kopplungscode nicht mit Personen, denen du nicht vertraust.",
    "lookup.request": "Offizielle Produktinfos abrufen",
    "lookup.refresh": "Offizielle Produktinfos aktualisieren",
    "lookup.loadingButton": "Offizielle Infos werden gesucht...",
    "lookup.pending": "Offizielle Produktinfos werden abgerufen...",
    "lookup.loadedProduct": "Offizielle Produktinfos geladen.",
    "lookup.loadedVendor": "Offizielle Herstellerinfos geladen.",
    "lookup.noRecord": "Kein passender offizieller Produkteintrag gefunden.",
    "lookup.unavailable": "Die offizielle Produktsuche ist gerade nicht verfügbar: {message}",
    "lookup.help": "Optional: Ruft die Produktdatensätze über die Produkt-ID ab.",
    "lookup.privacy": "<strong>Es werden keine sensiblen Informationen gesendet.</strong> Nur die extrahierten Hersteller- und Produkt-IDs werden verwendet, nicht die Setup-PIN oder die vollständige <code>MT:</code>-Payload.",
    "export.title": "3. Exportieren",
    "export.modeLabel": "Exportmodus",
    "export.svg": "SVG-Export",
    "export.stl": "STL-Export",
    "export.compatibility": "Kompatibilitätsmodus: keine Viewport-Größe",
    "stl.settings": "STL-Einstellungen",
    "stl.help": "Verwende hier die Düsen- und Schichteinstellungen aus deinem Slicer-Profil. Das Tool skaliert den QR-Code automatisch.",
    "stl.printer": "Dein Drucker",
    "stl.nozzle": "Düsengröße (mm)",
    "stl.layer": "Schichthöhe (mm)",
    "stl.output": "QR-Code-Ausgabe",
    "stl.width": "Breite eines QR-Moduls (x Düse)",
    "stl.height": "QR-Höhe (Schichten)",
    "stl.squareSize": "Jedes QR-Modul wird ",
    "stl.qrHeight": "Der QR-Code wird ",
    "stl.tall": " hoch.",
    "stl.fullSize": "Der vollständige QR-Code wird ungefähr ",
    "stl.mirrorOn": "Spiegeln ist für das Drucken auf der Unterseite aktiviert.",
    "stl.mirrorOff": "Spiegeln ist derzeit deaktiviert.",
    "preview.title": "4. Vorschau und Download",
    "preview.moduleShape": "Form der QR-Module",
    "preview.square": "Quadratisch",
    "preview.round": "Runde Punkte",
    "preview.cornerRadius": "Eckenradius (%)",
    "preview.orientation": "Druckausrichtung",
    "preview.standard": "Standard",
    "preview.mirrored": "Unterseite / gespiegelt",
    "preview.label": "Vorschau",
    "download.svg": "SVG herunterladen",
    "download.stl": "STL herunterladen",
    "instructions.title": "Anleitung für Bambu Lab / OrcaSlicer",
    "instructions.step1": "Erzeuge und lade die QR-Datei herunter, die du verwenden möchtest.",
    "instructions.step2": "Klicke mit der rechten Maustaste auf das Teil, das du ändern möchtest.",
    "instructions.step3": "Wähle <code>Add modifier</code>, dann <code>Load</code>, und wähle die QR-SVG- oder STL-Datei aus.",
    "instructions.step4": "Platziere den Modifier dort, wo der QR-Code erscheinen soll.",
    "instructions.step5": "Ändere die Filamentfarbe, damit er auf dem fertigen Druck sichtbar ist.",
    "instructions.step6": "Wenn der sichtbare QR-Code am Ende gespiegelt wäre, aktiviere vor dem Exportieren die Spiegelung.",
    "support.title": "Support",
    "support.copy": "Wenn dir dieses Tool geholfen hat, ein Gerät zu retten oder Zeit zu sparen, kannst du dem Projekt folgen oder mich hier unterstützen.",
    "support.github": "GitHub-Repo",
    "support.kofi": "Mich unterstützen",
    "details.setupPin": "Setup-PIN",
    "details.discriminator": "Discriminator",
    "details.vendorId": "Hersteller-ID",
    "details.productId": "Produkt-ID",
    "details.version": "Version",
    "details.flow": "Flow",
    "details.rendezvous": "Rendezvous",
    "details.modelName": "Modellname",
    "details.partNumber": "Teilenummer",
    "details.vendorPage": "Herstellerseite",
    "details.productPage": "Produktseite",
    "details.supportPage": "Support-Seite",
    "details.officialLinks": "Offizielle DCL-Links",
    "details.openVendor": "Herstellerseite öffnen",
    "details.openProduct": "Produktseite öffnen",
    "details.openSupport": "Support-Seite öffnen",
    "flow.standard": "Standard",
    "flow.userIntent": "Nutzerabsicht",
    "flow.custom": "Benutzerdefiniert",
    "flow.unknown": "Unbekannt ({value})",
    "status.validQr": "Gültiger QR-Code.",
    "status.qrDecoded": "QR-Code decodiert.",
    "status.invalidQr": "Ungültiger QR-Code.",
    "status.scanStopped": "Kamerascan gestoppt.",
    "status.cameraUnsupported": "Kamerascan wird in diesem Browser nicht unterstützt.",
    "status.cameraStarting": "Kamera wird gestartet...",
    "status.waitingLiveScan": "Wartet auf einen Live-QR-Scan...",
    "status.scanComplete": "Scan abgeschlossen.",
    "status.liveScanComplete": "Live-QR-Scan abgeschlossen.",
    "status.cameraUnavailable": "Kein Zugriff auf die Kamera möglich.",
    "status.cameraFailed": "Kamerascan fehlgeschlagen: {message}",
    "status.generateFailed": "QR-Etikett konnte nicht erzeugt werden: {message}",
    "status.generateFirstSvg": "Erzeuge zuerst ein Etikett, bevor du es herunterlädst.",
    "status.generateFirstStl": "Erzeuge zuerst ein Etikett, bevor du die STL-Datei herunterlädst.",
    "status.svgDownloaded": "SVG heruntergeladen.",
    "status.stlDownloaded": "STL heruntergeladen."
  },
  fr: {
    languageName: "Français",
    "language.label": "Langue",
    "theme.label": "Thème",
    "theme.auto": "Automatique",
    "theme.light": "Clair",
    "theme.dark": "Sombre",
    "page.title": "Outil de code QR Matter",
    "page.lead1": "Importez un code QR Matter, décodez-le et récupérez le code de configuration.",
    "page.lead2": "Vous pouvez ensuite générer des fichiers SVG ou STL propres, prêts pour l'impression 3D ou des étiquettes de remplacement.",
    "privacy.local": "Tout s'exécute localement dans votre navigateur. Aucune donnée sensible n'est envoyée.",
    "scan.title": "1. Scanner ou importer",
    "scan.camera.title": "Caméra en direct",
    "scan.camera.help": "Pointez la caméra de votre téléphone ou ordinateur vers le code QR Matter pour le scanner rapidement.",
    "scan.camera.start": "📷 Démarrer la caméra",
    "scan.camera.stop": "Arrêter la caméra",
    "scan.upload.title": "Importer une photo",
    "scan.upload.help": "Choisissez une photo ou une capture d'écran existante si le scanner en direct n'est pas pratique.",
    "scan.fallback": "Si le décodage automatique ne fonctionne pas, collez directement le payload <code>MT:</code> dans le champ de l'étape 2.",
    "payload.title": "2. Vérifier le payload",
    "payload.waiting": "En attente de saisie",
    "payload.valid": "Code MT valide",
    "payload.invalid": "Code MT non valide",
    "payload.help": "La valeur <code>MT:</code> est le payload de configuration Matter stocké dans le code QR. Elle contient les données utilisées pour associer l'appareil, elle doit donc être traitée comme sensible.",
    "payload.pairingLabel": "Code d'association extrait",
    "payload.warning": "Attention : ne partagez pas le contenu QR extrait ni le code d'association avec une personne en qui vous n'avez pas confiance.",
    "lookup.request": "Demander les infos produit officielles",
    "lookup.refresh": "Actualiser les infos produit officielles",
    "lookup.loadingButton": "Recherche des infos officielles...",
    "lookup.pending": "Demande des infos produit officielles...",
    "lookup.loadedProduct": "Infos produit officielles chargées.",
    "lookup.loadedVendor": "Infos fabricant officielles chargées.",
    "lookup.noRecord": "Aucun enregistrement produit officiel correspondant n'a été trouvé.",
    "lookup.unavailable": "La recherche produit officielle est indisponible pour le moment : {message}",
    "lookup.help": "Facultatif : cette action demande les enregistrements produit via son ID produit.",
    "lookup.privacy": "<strong>Aucune information sensible n'est envoyée.</strong> Seuls les ID fabricant et produit extraits sont utilisés, pas le PIN de configuration ni le payload <code>MT:</code> complet.",
    "export.title": "3. Exporter",
    "export.modeLabel": "Mode d'export",
    "export.svg": "Export SVG",
    "export.stl": "Export STL",
    "export.compatibility": "Mode compatibilité : aucune taille de viewport",
    "stl.settings": "Réglages STL",
    "stl.help": "Utilisez ici les réglages de buse et de couche de votre profil de slicer. L'outil dimensionnera automatiquement le QR.",
    "stl.printer": "Votre imprimante",
    "stl.nozzle": "Taille de buse (mm)",
    "stl.layer": "Hauteur de couche (mm)",
    "stl.output": "Sortie du code QR",
    "stl.width": "Largeur du module QR (x buse)",
    "stl.height": "Hauteur du QR (couches)",
    "stl.squareSize": "Chaque module QR mesurera ",
    "stl.qrHeight": "Le QR mesurera ",
    "stl.tall": " de haut.",
    "stl.fullSize": "Le QR complet fera environ ",
    "stl.mirrorOn": "Le miroir est activé pour l'impression sur la face inférieure.",
    "stl.mirrorOff": "Le miroir est désactivé.",
    "preview.title": "4. Aperçu et téléchargement",
    "preview.moduleShape": "Forme des modules QR",
    "preview.square": "Carrés",
    "preview.round": "Points ronds",
    "preview.cornerRadius": "Rayon des angles (%)",
    "preview.orientation": "Orientation d'impression",
    "preview.standard": "Standard",
    "preview.mirrored": "Face inférieure / miroir",
    "preview.label": "Aperçu",
    "download.svg": "Télécharger le SVG",
    "download.stl": "Télécharger le STL",
    "instructions.title": "Instructions pour Bambu Lab / OrcaSlicer",
    "instructions.step1": "Générez et téléchargez le fichier QR que vous souhaitez utiliser.",
    "instructions.step2": "Faites un clic droit sur la pièce que vous souhaitez modifier.",
    "instructions.step3": "Choisissez <code>Add modifier</code>, puis <code>Load</code>, et sélectionnez le SVG ou STL du QR.",
    "instructions.step4": "Placez le modificateur à l'endroit souhaité pour le QR.",
    "instructions.step5": "Changez la couleur du filament pour qu'il soit visible sur l'impression finale.",
    "instructions.step6": "Si le QR visible final serait inversé, activez le miroir avant d'exporter.",
    "support.title": "Soutien",
    "support.copy": "Si cet outil vous a aidé à récupérer un appareil ou vous a fait gagner du temps, vous pouvez suivre le projet ou me soutenir ici.",
    "support.github": "Dépôt GitHub",
    "support.kofi": "Me soutenir",
    "details.setupPin": "PIN de configuration",
    "details.discriminator": "Discriminateur",
    "details.vendorId": "ID fabricant",
    "details.productId": "ID produit",
    "details.version": "Version",
    "details.flow": "Flux",
    "details.rendezvous": "Rendezvous",
    "details.modelName": "Nom du modèle",
    "details.partNumber": "Référence",
    "details.vendorPage": "Page fabricant",
    "details.productPage": "Page produit",
    "details.supportPage": "Page support",
    "details.officialLinks": "Liens DCL officiels",
    "details.openVendor": "Ouvrir le site du fabricant",
    "details.openProduct": "Ouvrir la page produit",
    "details.openSupport": "Ouvrir la page support",
    "flow.standard": "Standard",
    "flow.userIntent": "Intention utilisateur",
    "flow.custom": "Personnalisé",
    "flow.unknown": "Inconnu ({value})",
    "status.validQr": "Code QR valide.",
    "status.qrDecoded": "Code QR décodé.",
    "status.invalidQr": "Code QR non valide.",
    "status.scanStopped": "Scan caméra arrêté.",
    "status.cameraUnsupported": "Le scan par caméra n'est pas pris en charge dans ce navigateur.",
    "status.cameraStarting": "Démarrage de la caméra...",
    "status.waitingLiveScan": "En attente d'un scan QR en direct...",
    "status.scanComplete": "Scan terminé.",
    "status.liveScanComplete": "Scan QR en direct terminé.",
    "status.cameraUnavailable": "Impossible d'accéder à la caméra.",
    "status.cameraFailed": "Échec du scan caméra : {message}",
    "status.generateFailed": "Impossible de générer l'étiquette QR : {message}",
    "status.generateFirstSvg": "Générez une étiquette avant de télécharger.",
    "status.generateFirstStl": "Générez une étiquette avant de télécharger le STL.",
    "status.svgDownloaded": "SVG téléchargé.",
    "status.stlDownloaded": "STL téléchargé."
  },
  it: {
    languageName: "Italiano",
    "language.label": "Lingua",
    "theme.label": "Tema",
    "theme.auto": "Automatico",
    "theme.light": "Chiaro",
    "theme.dark": "Scuro",
    "page.title": "Strumento QR Matter",
    "page.lead1": "Carica un codice QR Matter, decodificalo e recupera il codice di configurazione.",
    "page.lead2": "Poi puoi generare file SVG o STL puliti, pronti per la stampa 3D o per etichette sostitutive.",
    "privacy.local": "Tutto viene eseguito localmente nel browser. Nessun dato sensibile viene inviato altrove.",
    "scan.title": "1. Scansiona o carica",
    "scan.camera.title": "Fotocamera live",
    "scan.camera.help": "Punta la fotocamera del telefono o del portatile verso il codice QR Matter per una scansione rapida.",
    "scan.camera.start": "📷 Avvia fotocamera",
    "scan.camera.stop": "Ferma fotocamera",
    "scan.upload.title": "Carica foto",
    "scan.upload.help": "Scegli una foto o uno screenshot esistente se la scansione live non è comoda.",
    "scan.fallback": "Se la decodifica automatica non funziona, incolla il payload <code>MT:</code> direttamente nel campo del passaggio 2.",
    "payload.title": "2. Controlla il payload",
    "payload.waiting": "In attesa di input",
    "payload.valid": "Codice MT valido",
    "payload.invalid": "Codice MT non valido",
    "payload.help": "Il valore <code>MT:</code> è il payload di configurazione Matter salvato nel codice QR. Contiene i dati usati per associare il dispositivo, quindi trattalo come informazione sensibile.",
    "payload.pairingLabel": "Codice di associazione estratto",
    "payload.warning": "Attenzione: non condividere il contenuto QR estratto o il codice di associazione con persone di cui non ti fidi.",
    "lookup.request": "Richiedi informazioni ufficiali sul prodotto",
    "lookup.refresh": "Aggiorna informazioni ufficiali sul prodotto",
    "lookup.loadingButton": "Ricerca informazioni ufficiali...",
    "lookup.pending": "Richiesta delle informazioni ufficiali sul prodotto...",
    "lookup.loadedProduct": "Informazioni ufficiali sul prodotto caricate.",
    "lookup.loadedVendor": "Informazioni ufficiali sul produttore caricate.",
    "lookup.noRecord": "Nessun record ufficiale del prodotto corrispondente trovato.",
    "lookup.unavailable": "La ricerca ufficiale del prodotto non è disponibile ora: {message}",
    "lookup.help": "Opzionale: richiede i record del prodotto tramite il suo ID prodotto.",
    "lookup.privacy": "<strong>Nessuna informazione sensibile viene inviata.</strong> Vengono usati solo gli ID produttore e prodotto estratti, non il PIN di configurazione o il payload <code>MT:</code> completo.",
    "export.title": "3. Esporta",
    "export.modeLabel": "Modalità di esportazione",
    "export.svg": "Esporta SVG",
    "export.stl": "Esporta STL",
    "export.compatibility": "Modalità compatibilità: nessuna dimensione viewport",
    "stl.settings": "Impostazioni STL",
    "stl.help": "Usa qui le impostazioni di ugello e layer del tuo profilo slicer. Lo strumento dimensionerà automaticamente il QR.",
    "stl.printer": "La tua stampante",
    "stl.nozzle": "Dimensione ugello (mm)",
    "stl.layer": "Altezza layer (mm)",
    "stl.output": "Output codice QR",
    "stl.width": "Larghezza modulo QR (x ugello)",
    "stl.height": "Altezza QR (layer)",
    "stl.squareSize": "Ogni modulo QR sarà ",
    "stl.qrHeight": "Il QR sarà alto ",
    "stl.tall": ".",
    "stl.fullSize": "Il QR completo sarà circa ",
    "stl.mirrorOn": "La specchiatura è attiva per la stampa dal lato inferiore.",
    "stl.mirrorOff": "La specchiatura è disattivata.",
    "preview.title": "4. Anteprima e download",
    "preview.moduleShape": "Forma dei moduli QR",
    "preview.square": "Quadrati",
    "preview.round": "Punti rotondi",
    "preview.cornerRadius": "Raggio angoli (%)",
    "preview.orientation": "Orientamento di stampa",
    "preview.standard": "Standard",
    "preview.mirrored": "Lato inferiore / specchiato",
    "preview.label": "Anteprima",
    "download.svg": "Scarica SVG",
    "download.stl": "Scarica STL",
    "instructions.title": "Istruzioni per Bambu Lab / OrcaSlicer",
    "instructions.step1": "Genera e scarica il file QR che vuoi usare.",
    "instructions.step2": "Fai clic destro sulla parte che vuoi modificare.",
    "instructions.step3": "Scegli <code>Add modifier</code>, poi <code>Load</code>, e seleziona l'SVG o STL del QR.",
    "instructions.step4": "Posiziona il modificatore dove vuoi il QR.",
    "instructions.step5": "Cambia il colore del filamento così sarà visibile nella stampa finale.",
    "instructions.step6": "Se il QR visibile finale risulterebbe invertito, attiva la specchiatura prima di esportare.",
    "support.title": "Supporto",
    "support.copy": "Se questo strumento ti ha aiutato a recuperare un dispositivo o ti ha fatto risparmiare tempo, puoi seguire il progetto o supportarmi qui.",
    "support.github": "Repository GitHub",
    "support.kofi": "Supportami",
    "details.setupPin": "PIN di configurazione",
    "details.discriminator": "Discriminatore",
    "details.vendorId": "ID produttore",
    "details.productId": "ID prodotto",
    "details.version": "Versione",
    "details.flow": "Flusso",
    "details.rendezvous": "Rendezvous",
    "details.modelName": "Nome modello",
    "details.partNumber": "Numero parte",
    "details.vendorPage": "Pagina produttore",
    "details.productPage": "Pagina prodotto",
    "details.supportPage": "Pagina supporto",
    "details.officialLinks": "Link DCL ufficiali",
    "details.openVendor": "Apri sito del produttore",
    "details.openProduct": "Apri pagina prodotto",
    "details.openSupport": "Apri pagina supporto",
    "flow.standard": "Standard",
    "flow.userIntent": "Intento utente",
    "flow.custom": "Personalizzato",
    "flow.unknown": "Sconosciuto ({value})",
    "status.validQr": "Codice QR valido.",
    "status.qrDecoded": "Codice QR decodificato.",
    "status.invalidQr": "Codice QR non valido.",
    "status.scanStopped": "Scansione fotocamera fermata.",
    "status.cameraUnsupported": "La scansione con fotocamera non è supportata in questo browser.",
    "status.cameraStarting": "Avvio fotocamera...",
    "status.waitingLiveScan": "In attesa di una scansione QR live...",
    "status.scanComplete": "Scansione completata.",
    "status.liveScanComplete": "Scansione QR live completata.",
    "status.cameraUnavailable": "Impossibile accedere alla fotocamera.",
    "status.cameraFailed": "Scansione con fotocamera non riuscita: {message}",
    "status.generateFailed": "Impossibile generare l'etichetta QR: {message}",
    "status.generateFirstSvg": "Genera un'etichetta prima di scaricare.",
    "status.generateFirstStl": "Genera un'etichetta prima di scaricare l'STL.",
    "status.svgDownloaded": "SVG scaricato.",
    "status.stlDownloaded": "STL scaricato."
  }
};
const SUPPORTED_LANGUAGES = Object.keys(TRANSLATIONS);
let currentLanguage = "en";
let lastAutoManualCode = "";
let currentPayload = null;
let liveLookupData = null;
let liveLookupPending = false;
let vendorDirectoryPromise = null;
const modelLookupCache = new Map();
let exportMode = "stl";
let cameraScanControls = null;
let cameraScanActive = false;
let currentTheme = "auto";
const themeMediaQuery = window.matchMedia?.("(prefers-color-scheme: dark)") || null;

function getLanguageCode(languageTag) {
  return String(languageTag || "").toLowerCase().split("-")[0];
}

function getInitialLanguage() {
  let storedLanguage = "";

  try {
    storedLanguage = getLanguageCode(window.localStorage.getItem(LANGUAGE_STORAGE_KEY));
  } catch {
    storedLanguage = "";
  }

  if (SUPPORTED_LANGUAGES.includes(storedLanguage)) {
    return storedLanguage;
  }

  for (const languageTag of navigator.languages || [navigator.language]) {
    const languageCode = getLanguageCode(languageTag);
    if (SUPPORTED_LANGUAGES.includes(languageCode)) {
      return languageCode;
    }
  }

  return "en";
}

function getThemeMode(theme) {
  return ["auto", "light", "dark"].includes(theme) ? theme : "auto";
}

function getInitialTheme() {
  try {
    return getThemeMode(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return "auto";
  }
}

function getResolvedTheme(theme = currentTheme) {
  return theme === "auto" && themeMediaQuery?.matches ? "dark" : theme === "dark" ? "dark" : "light";
}

function t(key, replacements = {}) {
  let value = TRANSLATIONS[currentLanguage]?.[key] ?? TRANSLATIONS.en[key] ?? key;

  for (const [replacementKey, replacementValue] of Object.entries(replacements)) {
    value = value.replaceAll(`{${replacementKey}}`, String(replacementValue));
  }

  return value;
}

function applyTranslations() {
  document.documentElement.lang = currentLanguage;
  document.title = t("page.title");

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.innerHTML = t(element.dataset.i18n);
  });

  document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
    element.setAttribute("aria-label", t(element.dataset.i18nAriaLabel));
  });

  for (const optionButton of themeOptionButtons) {
    const themeMode = getThemeMode(optionButton.dataset.themeOption);
    const themeLabel = t(`theme.${themeMode}`);
    optionButton.title = themeLabel;
    optionButton.setAttribute("aria-label", themeLabel);
  }

  if (languageToggle) {
    languageToggle.textContent = LANGUAGE_FLAGS[currentLanguage] || LANGUAGE_FLAGS.en;
    languageToggle.title = TRANSLATIONS[currentLanguage]?.languageName || TRANSLATIONS.en.languageName;
  }

  for (const optionButton of languageOptionButtons) {
    const isActive = optionButton.dataset.languageOption === currentLanguage;
    const languageCode = getLanguageCode(optionButton.dataset.languageOption);
    const languageName = TRANSLATIONS[languageCode]?.languageName || TRANSLATIONS.en.languageName;
    optionButton.title = languageName;
    optionButton.setAttribute("aria-label", languageName);
    optionButton.classList.toggle("is-active", isActive);
    optionButton.setAttribute("aria-selected", String(isActive));
  }

  updateCameraUi(cameraScanActive);
  updatePayloadValidity(currentPayload ? "valid" : dataInput.value.trim() ? "invalid" : "empty");
  updateLookupButtonState();
  updateDetailsDisplay(currentPayload);
  updateStlSummary();
}

function applyTheme() {
  document.documentElement.dataset.theme = getResolvedTheme();

  if (themeToggle) {
    themeToggle.textContent = THEME_ICONS[currentTheme] || THEME_ICONS.auto;
    themeToggle.title = t(`theme.${currentTheme}`) || THEME_NAMES[currentTheme] || THEME_NAMES.auto;
  }

  for (const optionButton of themeOptionButtons) {
    const isActive = optionButton.dataset.themeOption === currentTheme;
    optionButton.classList.toggle("is-active", isActive);
    optionButton.setAttribute("aria-selected", String(isActive));
  }
}

function setThemeMenuOpen(isOpen) {
  if (!themeMenu || !themeToggle) {
    return;
  }

  themeMenu.hidden = !isOpen;
  themeToggle.setAttribute("aria-expanded", String(isOpen));
}

function setLanguageMenuOpen(isOpen) {
  if (!languageMenu || !languageToggle) {
    return;
  }

  languageMenu.hidden = !isOpen;
  languageToggle.setAttribute("aria-expanded", String(isOpen));
}

function setCurrentLanguage(nextLanguage) {
  const languageCode = getLanguageCode(nextLanguage);

  if (!SUPPORTED_LANGUAGES.includes(languageCode)) {
    return;
  }

  currentLanguage = languageCode;
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, currentLanguage);
  } catch {
    // Language choice is still applied for this page load if storage is unavailable.
  }
  applyTranslations();
  applyTheme();
}

function setCurrentTheme(nextTheme) {
  currentTheme = getThemeMode(nextTheme);
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, currentTheme);
  } catch {
    // Theme choice is still applied for this page load if storage is unavailable.
  }
  applyTheme();
}

function handleSystemThemeChange() {
  if (currentTheme === "auto") {
    applyTheme();
  }
}

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
    status.hidden = true;
    status.innerHTML = "";
    return;
  }

  status.hidden = false;
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
    startCameraBtn.classList.toggle("camera-toggle-active", isActive);
    startCameraBtn.textContent = isActive
      ? t("scan.camera.stop")
      : t("scan.camera.start");
  }
}

function focusCameraPanel() {
  const focusTarget = cameraCard || cameraPanel;
  if (!focusTarget) {
    return;
  }

  window.requestAnimationFrame(() => {
    focusTarget.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  });
}

function updatePayloadValidity(state) {
  if (!payloadValidity) {
    return;
  }

  payloadValidity.classList.remove("is-valid", "is-invalid");

  if (state === "valid") {
    payloadValidity.classList.add("is-valid");
    payloadValidity.innerHTML = `<span class="validity-icon">✓</span><span>${escapeHtml(t("payload.valid"))}</span>`;
    return;
  }

  if (state === "invalid") {
    payloadValidity.classList.add("is-invalid");
    payloadValidity.innerHTML = `<span class="validity-icon">✕</span><span>${escapeHtml(t("payload.invalid"))}</span>`;
    return;
  }

  payloadValidity.innerHTML = `<span class="validity-icon">-</span><span>${escapeHtml(t("payload.waiting"))}</span>`;
}

function updateManualDisplay(value) {
  const hasValue = Boolean(value);
  manualDisplay.textContent = hasValue ? value : "-";
  manualDisplay.classList.toggle("is-empty", !hasValue);
}

function setLookupStatus(message, state = "success") {
  if (!lookupStatus) {
    return;
  }

  lookupStatus.classList.remove("is-success", "is-error");

  if (!message) {
    lookupStatus.hidden = true;
    lookupStatus.innerHTML = "";
    return;
  }

  lookupStatus.hidden = false;
  if (state === "error") {
    lookupStatus.classList.add("is-error");
  } else if (state === "success") {
    lookupStatus.classList.add("is-success");
  }

  const icon = state === "error" ? "✕" : state === "success" ? "✓" : "…";
  lookupStatus.innerHTML = `<span class="validity-icon">${icon}</span><span>${escapeHtml(message)}</span>`;
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
    lookupBtn.textContent = t("lookup.loadingButton");
    return;
  }

  lookupBtn.textContent =
    getActiveLookupData(currentPayload)
      ? t("lookup.refresh")
      : t("lookup.request");
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
  if (value === 0) return t("flow.standard");
  if (value === 1) return t("flow.userIntent");
  if (value === 2) return t("flow.custom");
  return String(value);
}

function formatRendezvousInformation(value) {
  const methods = [];

  if (value & 0x01) methods.push("SoftAP");
  if (value & 0x02) methods.push("BLE");
  if (value & 0x04) methods.push("On-network");

  if (methods.length === 0) {
    return t("flow.unknown", { value });
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
      key: t("details.setupPin"),
      value: payload.setupPinCode,
      help: "The onboarding passcode used during commissioning."
    },
    {
      key: t("details.discriminator"),
      value: payload.discriminator,
      help: "A short identifier that helps commissioners find the right device during setup."
    },
    {
      key: t("details.vendorId"),
      value: formatVendorDisplay(payload.vendorId, vendorRecord),
      help: vendorHelp
    },
    {
      key: t("details.productId"),
      value: formatProductDisplay(payload.vendorId, payload.productId, modelRecord),
      help: productHelpParts.join(" ")
    },
    {
      key: t("details.version"),
      value: payload.version,
      help: "The payload format version encoded in the QR value."
    },
    {
      key: t("details.flow"),
      value: formatCommissioningFlow(payload.commissioningFlow),
      help: "How the device expects commissioning to begin."
    },
    {
      key: t("details.rendezvous"),
      value: formatRendezvousInformation(payload.rendezvousInformation),
      help: "The discovery or transport methods the device supports for setup."
    }
  ];

  if (modelRecord?.productName && modelRecord.productName !== modelRecord.productLabel) {
    details.push({
      key: t("details.modelName"),
      value: modelRecord.productName,
      help: "The shorter product name from the official CSA DCL model record."
    });
  }

  if (modelRecord?.partNumber) {
    details.push({
      key: t("details.partNumber"),
      value: modelRecord.partNumber,
      help: "The manufacturer part number listed in the official CSA DCL model record."
    });
  }

  const dclLinks = [];

  if (vendorRecord?.vendorLandingPageURL) {
    dclLinks.push({
      key: t("details.vendorPage"),
      valueHtml: buildLinkValue(vendorRecord.vendorLandingPageURL, t("details.openVendor")),
      help: "The official vendor landing page from the CSA DCL record."
    });
  }

  if (modelRecord?.productUrl) {
    dclLinks.push({
      key: t("details.productPage"),
      valueHtml: buildLinkValue(modelRecord.productUrl, t("details.openProduct")),
      help: "The product page published in the official CSA DCL model record."
    });
  }

  if (modelRecord?.supportUrl) {
    dclLinks.push({
      key: t("details.supportPage"),
      valueHtml: buildLinkValue(modelRecord.supportUrl, t("details.openSupport")),
      help: "The support page published in the official CSA DCL model record."
    });
  }

  const linkSection = dclLinks.length
    ? `
      <div class="detail-group-card">
        <div class="detail-section-title">${escapeHtml(t("details.officialLinks"))}</div>
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
  setLookupStatus(t("lookup.pending"), "pending");

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
        setLookupStatus(t("lookup.loadedProduct"));
      } else if (vendorRecord) {
        setLookupStatus(t("lookup.loadedVendor"));
      } else {
        setLookupStatus(t("lookup.loadedProduct"));
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
      setLookupStatus(t("lookup.noRecord"));
      return;
    }

    throw new Error("The DCL lookup returned no usable vendor or model data.");
  } catch (error) {
    clearLiveLookupData();
    updateDetailsDisplay(currentPayload);
    setLookupStatus(
      t("lookup.unavailable", { message: error.message }),
      "error"
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
      { text: t("stl.squareSize") },
      { strong: formatMillimeters(stl.moduleSizeMm) },
      { text: "." }
    ]),
    buildStlSummaryLine([
      { text: t("stl.qrHeight") },
      { strong: formatMillimeters(stl.qrHeightMm) },
      { text: t("stl.tall") }
    ])
  ];
  const data = getNormalizedMatterQrText(dataInput.value);

  if (data) {
    try {
      const overallSize = getQrCanvasSize(data, stl.moduleSizeMm);
      summaryLines.push(buildStlSummaryLine([
        { text: t("stl.fullSize") },
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
          ? t("stl.mirrorOn")
          : t("stl.mirrorOff")
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

function applyDecodedQrText(text, successMessage = t("status.qrDecoded")) {
  dataInput.value = text;
  syncManualCodeFromData({ force: true });
  generateLabel();
  setStatus(
    lastAutoManualCode
      ? t("status.validQr")
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

  if (cameraScanActive) {
    stopCameraScan();
    setCameraStatus(t("status.scanStopped"));
    setStatus("");
    return;
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    setStatus(t("status.cameraUnsupported"), true);
    return;
  }

  stopCameraScan({ preserveStatus: true });
  cameraScanActive = true;
  updateCameraUi(true);
  focusCameraPanel();
  setCameraStatus(t("status.cameraStarting"));
  setStatus(t("status.waitingLiveScan"));

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
        setCameraStatus(t("status.scanComplete"));
        applyDecodedQrText(text, t("status.liveScanComplete"));
      }
    );

    setCameraStatus("");
  } catch (error) {
    stopCameraScan({ preserveStatus: true });
    setCameraStatus(t("status.cameraUnavailable"), true);
    setStatus(t("status.cameraFailed", { message: error.message }), true);
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
    setStatus(t("status.invalidQr"), true);
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
    const message = t("status.generateFailed", { message: error.message });
    renderPreviewError(message);
    setStatus(message, true);
  }
}

function downloadLabel() {
  if (!finalSVG) {
    setStatus(t("status.generateFirstSvg"), true);
    return;
  }

  downloadBlob(finalSVG, "image/svg+xml", "matter-label.svg");
  setStatus(t("status.svgDownloaded"));
}

function downloadStl() {
  if (!finalSTL) {
    setStatus(t("status.generateFirstStl"), true);
    return;
  }

  downloadBlob(finalSTL, "model/stl", "matter-label.stl");
  setStatus(t("status.stlDownloaded"));
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
themeToggle?.addEventListener("click", () => {
  setLanguageMenuOpen(false);
  setThemeMenuOpen(Boolean(themeMenu?.hidden));
});

for (const optionButton of themeOptionButtons) {
  optionButton.addEventListener("click", () => {
    setCurrentTheme(optionButton.dataset.themeOption);
    setThemeMenuOpen(false);
    themeToggle?.focus();
  });
}

languageToggle?.addEventListener("click", () => {
  setThemeMenuOpen(false);
  setLanguageMenuOpen(Boolean(languageMenu?.hidden));
});

for (const optionButton of languageOptionButtons) {
  optionButton.addEventListener("click", () => {
    setCurrentLanguage(optionButton.dataset.languageOption);
    setLanguageMenuOpen(false);
    languageToggle?.focus();
  });
}

document.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof Node)) {
    return;
  }

  if (themeMenu && !themeMenu.hidden && !themeMenu.contains(target) && !themeToggle?.contains(target)) {
    setThemeMenuOpen(false);
  }

  if (languageMenu && !languageMenu.hidden && !languageMenu.contains(target) && !languageToggle?.contains(target)) {
    setLanguageMenuOpen(false);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setThemeMenuOpen(false);
    setLanguageMenuOpen(false);
  }
});

if (themeMediaQuery) {
  if (typeof themeMediaQuery.addEventListener === "function") {
    themeMediaQuery.addEventListener("change", handleSystemThemeChange);
  } else {
    themeMediaQuery.addListener?.(handleSystemThemeChange);
  }
}

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

currentLanguage = getInitialLanguage();
currentTheme = getInitialTheme();
updateLookupButtonState();
updateExportModeUi();
updateCornerRadiusInputState();
updateStlSummary();
updatePayloadValidity("empty");
updateCameraUi(false);
setStatus("");
applyTranslations();
applyTheme();
