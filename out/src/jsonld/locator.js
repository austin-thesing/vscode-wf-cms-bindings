"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findJsonLdRegions = findJsonLdRegions;
const JSON_LD_SCRIPT_OPEN = /<script\b(?=[^>]*\btype\s*=\s*(?:"application\/ld\+json"|'application\/ld\+json'|application\/ld\+json))[^>]*>/gi;
const SCRIPT_CLOSE = /<\/script\s*>/gi;
function findJsonLdRegions(text, languageId, fileName = "") {
    if (isStandaloneJson(languageId, fileName)) {
        return [{ start: 0, end: text.length, text }];
    }
    if (languageId !== "html") {
        return [];
    }
    const regions = [];
    JSON_LD_SCRIPT_OPEN.lastIndex = 0;
    let openMatch;
    while ((openMatch = JSON_LD_SCRIPT_OPEN.exec(text))) {
        const bodyStart = openMatch.index + openMatch[0].length;
        SCRIPT_CLOSE.lastIndex = bodyStart;
        const closeMatch = SCRIPT_CLOSE.exec(text);
        if (!closeMatch) {
            break;
        }
        regions.push({
            start: bodyStart,
            end: closeMatch.index,
            text: text.slice(bodyStart, closeMatch.index),
        });
        JSON_LD_SCRIPT_OPEN.lastIndex = closeMatch.index + closeMatch[0].length;
    }
    return regions;
}
function isStandaloneJson(languageId, fileName) {
    if (languageId === "json" || languageId === "jsonc") {
        return true;
    }
    const lower = fileName.toLowerCase();
    return lower.endsWith(".jsonld") || lower.endsWith(".schema.json");
}
//# sourceMappingURL=locator.js.map