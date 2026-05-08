"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLocation = exports.findNodeAtOffset = void 0;
exports.parseJsonLdRegion = parseJsonLdRegion;
exports.parseJsonLdRegions = parseJsonLdRegions;
const jsonc_parser_1 = require("jsonc-parser");
Object.defineProperty(exports, "findNodeAtOffset", { enumerable: true, get: function () { return jsonc_parser_1.findNodeAtOffset; } });
Object.defineProperty(exports, "getLocation", { enumerable: true, get: function () { return jsonc_parser_1.getLocation; } });
const sanitizer_1 = require("./sanitizer");
function parseJsonLdRegion(region) {
    const sanitized = (0, sanitizer_1.sanitizeJsonLdRegion)(region);
    const errors = [];
    const root = (0, jsonc_parser_1.parseTree)(sanitized.sanitized, errors, {
        allowTrailingComma: false,
        disallowComments: false,
    });
    return {
        ...sanitized,
        root,
        syntaxIssues: errors.map((error) => ({
            message: (0, jsonc_parser_1.printParseErrorCode)(error.error),
            offset: region.start + error.offset,
            length: Math.max(1, error.length),
        })),
    };
}
function parseJsonLdRegions(regions) {
    return regions.map(parseJsonLdRegion);
}
//# sourceMappingURL=parser.js.map