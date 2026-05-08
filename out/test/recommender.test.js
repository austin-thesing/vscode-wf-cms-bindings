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
const recommender_1 = require("../src/schema/recommender");
const data = (0, data_1.loadSchemaData)(process.cwd());
describe("schema recommender", () => {
    it("suggests Product properties not already present", () => {
        const text = `{"@type":"Product",}`;
        const region = (0, parser_1.parseJsonLdRegion)({ start: 0, end: text.length, text });
        const completions = (0, recommender_1.getCompletionsForKeyPosition)(region, text.indexOf("}") - 1, data);
        const labels = completions.map((item) => item.propertyName);
        assert.ok(labels.includes("name"));
        assert.ok(labels.includes("image"));
        assert.ok(labels.includes("offers"));
    });
    it("builds a recommended-field action for Product", () => {
        const text = `{"@type":"Product"}`;
        const region = (0, parser_1.parseJsonLdRegion)({ start: 0, end: text.length, text });
        const action = (0, recommender_1.getRecommendedActionAtOffset)(region, text.indexOf("Product"), data);
        assert.ok(action);
        if (!action) {
            return;
        }
        assert.strictEqual(action.typeName, "Product");
        assert.ok(action.missing.includes("name"));
        assert.ok(action.missing.includes("image"));
        assert.ok(action.missing.includes("offers"));
        assert.ok(action.insertText.includes(`"name"`));
    });
});
//# sourceMappingURL=recommender.test.js.map