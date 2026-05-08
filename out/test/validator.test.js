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
const parser_1 = require("../src/jsonld/parser");
const data_1 = require("../src/schema/data");
const validator_1 = require("../src/schema/validator");
const data = (0, data_1.loadSchemaData)(process.cwd());
describe("validateParsedRegion", () => {
    it("accepts a well-formed Product with required fields", () => {
        const parsed = parse(`{
      "@context": "https://schema.org",
      "@type": "Product",
      "name": "Chair",
      "image": ["https://example.com/chair.jpg"],
      "offers": { "@type": "Offer", "price": "10", "priceCurrency": "USD" }
    }`);
        const issues = (0, validator_1.validateParsedRegion)(parsed, data);
        assert.deepStrictEqual(issues.filter((issue) => issue.kind !== "missingRecommended").map((issue) => issue.kind), []);
    });
    it("reports missing required Product properties", () => {
        const issues = (0, validator_1.validateParsedRegion)(parse(`{"@type":"Product","name":"Chair"}`), data);
        assert.ok(issues.some((issue) => issue.kind === "missingRequired" && issue.propertyName === "image"));
        assert.ok(issues.some((issue) => issue.kind === "missingRequired" && issue.propertyName === "offers"));
    });
    it("reports unknown schema types and properties", () => {
        const unknownType = (0, validator_1.validateParsedRegion)(parse(`{"@type":"Nope"}`), data);
        assert.ok(unknownType.some((issue) => issue.kind === "unknownType"));
        const unknownProperty = (0, validator_1.validateParsedRegion)(parse(`{"@type":"Product","name":"Chair","image":[],"offers":{},"madeUp":true}`), data);
        assert.ok(unknownProperty.some((issue) => issue.kind === "unknownProperty" && issue.propertyName === "madeUp"));
    });
    it("reports JSON syntax issues", () => {
        const issues = (0, validator_1.validateParsedRegion)(parse(`{"@type":"Product",`), data);
        assert.ok(issues.some((issue) => issue.kind === "syntax"));
    });
    it("ignores Webflow bindings while checking syntax", () => {
        const parsed = parse(`{"@type":"Product","name":{{wf {&quot;path&quot;:&quot;name&quot;,&quot;type&quot;:&quot;PlainText&quot;\\} }},"image":[],"offers":{}}`);
        const issues = (0, validator_1.validateParsedRegion)(parsed, data);
        assert.ok(!issues.some((issue) => issue.kind === "syntax"));
    });
});
function parse(text) {
    return (0, parser_1.parseJsonLdRegion)({ start: 0, end: text.length, text });
}
//# sourceMappingURL=validator.test.js.map