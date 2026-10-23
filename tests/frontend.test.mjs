import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { TRANSLATIONS } from "../web/i18n/translations.js";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("every supported language has the same translation keys", () => {
  const english = Object.keys(TRANSLATIONS.en).sort();
  assert.deepEqual(Object.keys(TRANSLATIONS).sort(), ["de", "en", "es", "fr", "it", "nl"]);
  for (const [language, entries] of Object.entries(TRANSLATIONS)) {
    assert.deepEqual(Object.keys(entries).sort(), english, language);
    for (const [key, value] of Object.entries(entries)) {
      assert.equal(typeof value, "string", `${language}.${key}`);
      assert.ok(value.length > 0, `${language}.${key} must not be empty`);
    }
  }
});

test("translated interpolation parameters match English", () => {
  const parameters = (value) => [...value.matchAll(/\\{([a-zA-Z][a-zA-Z0-9]*)\\}/g)]
    .map((match) => match[1]).sort();
  for (const [language, entries] of Object.entries(TRANSLATIONS)) {
    for (const [key, value] of Object.entries(entries)) {
      assert.deepEqual(parameters(value), parameters(TRANSLATIONS.en[key]), `${language}.${key}`);
    }
  }
});

test("HTML refers to extracted assets", () => {
  const html = read("../web/index.html");
  const app = read("../web/app.js");
  assert.match(html, /href="styles\\/app\\.css"/);
  assert.match(html, /src="app\\.js\\?v=[^"]+"/);
  assert.match(app, /import \\{ TRANSLATIONS \\} from "\\.\\/i18n\\/translations\\.js"/);
  assert.doesNotMatch(html, /<style[\\s>]/i);
});

test("primary UI labels exist in all languages", () => {
  for (const locale of Object.values(TRANSLATIONS)) {
    for (const key of ["payload.title", "payload.pairingLabel", "details.rendezvous", "details.flow", "preview.moduleShape"]) {
      assert.ok(locale[key]);
    }
  }
});
