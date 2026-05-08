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
exports.buildSchemaDiagnostics = buildSchemaDiagnostics;
const vscode = __importStar(require("vscode"));
const locator_1 = require("./jsonld/locator");
const parser_1 = require("./jsonld/parser");
const validator_1 = require("./schema/validator");
function buildSchemaDiagnostics(document, data, severity, includeGoogleRequired) {
    const regions = (0, locator_1.findJsonLdRegions)(document.getText(), document.languageId, document.fileName);
    const parsedRegions = (0, parser_1.parseJsonLdRegions)(regions);
    const diagnostics = [];
    for (const region of parsedRegions) {
        for (const issue of (0, validator_1.validateParsedRegion)(region, data, includeGoogleRequired)) {
            const diagnostic = new vscode.Diagnostic(toRange(document, issue.offset, issue.length), issue.message, issue.kind === "missingRecommended"
                ? vscode.DiagnosticSeverity.Information
                : issue.kind === "syntax"
                    ? vscode.DiagnosticSeverity.Error
                    : severity);
            diagnostic.source = "Webflow Schema";
            diagnostic.code = issue.kind;
            diagnostics.push(diagnostic);
        }
    }
    return { parsedRegions, diagnostics };
}
function toRange(document, offset, length) {
    return new vscode.Range(document.positionAt(offset), document.positionAt(offset + Math.max(1, length)));
}
//# sourceMappingURL=diagnostics.js.map