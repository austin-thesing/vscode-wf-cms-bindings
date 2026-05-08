"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const assert = __importStar(require("assert"));
const locator_1 = require("../src/jsonld/locator");
const sanitizer_1 = require("../src/jsonld/sanitizer");
describe("sanitizeJsonLdRegion", () => {
    it("replaces quoted and unquoted bindings with same-length placeholders", () => {
        const text = `{
  "image": "{{wf {&quot;path&quot;:&quot;hero&quot;,&quot;type&quot;:&quot;ImageRef&quot;\\} }}",
  "price": {{wf {&quot;path&quot;:&quot;price&quot;,&quot;type&quot;:&quot;Number&quot;\\} }}
}`;
        const region = { start: 10, end: 10 + text.length, text };
        const sanitized = (0, sanitizer_1.sanitizeJsonLdRegion)(region);
        assert.strictEqual(sanitized.sanitized.length, text.length);
        assert.strictEqual(sanitized.bindings.length, 2);
        assert.doesNotThrow(() => JSON.parse(sanitized.sanitized));
        assert.strictEqual(sanitized.bindings[0].start, 10 + text.indexOf("{{wf"));
    });
});
describe("findJsonLdRegions", () => {
    it("finds JSON-LD script blocks in HTML", () => {
        const html = `<html><script type="application/ld+json">{"@type":"Product"}</script></html>`;
        const regions = (0, locator_1.findJsonLdRegions)(html, "html", "index.html");
        assert.strictEqual(regions.length, 1);
        assert.strictEqual(regions[0].text, `{"@type":"Product"}`);
    });
    it("treats JSON files as standalone regions", () => {
        const json = `{"@type":"Product"}`;
        const regions = (0, locator_1.findJsonLdRegions)(json, "json", "schema.json");
        assert.deepStrictEqual(regions, [{ start: 0, end: json.length, text: json }]);
    });
});
//# sourceMappingURL=sanitizer.test.js.map