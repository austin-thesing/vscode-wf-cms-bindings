"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCompletionsForKeyPosition = getCompletionsForKeyPosition;
exports.getRecommendedActionAtOffset = getRecommendedActionAtOffset;
exports.findEnclosingObject = findEnclosingObject;
const jsonc_parser_1 = require("jsonc-parser");
const data_1 = require("./data");
const validator_1 = require("./validator");
function getCompletionsForKeyPosition(region, absoluteOffset, data) {
    if (!region.root) {
        return [];
    }
    const relativeOffset = absoluteOffset - region.start;
    if (relativeOffset < 0 || relativeOffset > region.text.length) {
        return [];
    }
    const location = (0, jsonc_parser_1.getLocation)(region.sanitized, relativeOffset);
    if (!isObjectKeyLocation(location.path)) {
        return [];
    }
    const objectNode = findEnclosingObject(region.root, relativeOffset);
    if (!objectNode) {
        return [];
    }
    const typeNames = (0, validator_1.getStringValues)((0, validator_1.getPropertyValueNode)(objectNode, "@type")).filter((typeName) => data.schema.types[typeName]);
    if (typeNames.length === 0) {
        return [];
    }
    const present = (0, validator_1.getObjectKeys)(objectNode);
    const properties = new Set();
    for (const typeName of typeNames) {
        for (const prop of (0, data_1.getAllPropertiesForType)(data, typeName)) {
            properties.add(prop);
        }
    }
    return [...properties]
        .filter((prop) => !present.has(prop))
        .sort()
        .map((prop) => {
        const info = data.schema.properties[prop];
        return {
            propertyName: prop,
            expectedTypes: info?.expectedTypes ?? [],
            comment: info?.comment ?? "",
            snippetValue: snippetValueForProperty(prop, info?.expectedTypes ?? []),
        };
    });
}
function getRecommendedActionAtOffset(region, absoluteOffset, data) {
    if (!region.root) {
        return undefined;
    }
    const relativeOffset = absoluteOffset - region.start;
    const objectNode = findEnclosingObject(region.root, relativeOffset);
    if (!objectNode) {
        return undefined;
    }
    const typeNames = (0, validator_1.getStringValues)((0, validator_1.getPropertyValueNode)(objectNode, "@type")).filter((typeName) => data.schema.types[typeName]);
    if (typeNames.length === 0) {
        return undefined;
    }
    const present = (0, validator_1.getObjectKeys)(objectNode);
    const missing = new Set();
    for (const typeName of typeNames) {
        const requirements = (0, data_1.getGoogleRequirementsForType)(data, typeName);
        if (!requirements) {
            continue;
        }
        for (const prop of [...requirements.required, ...requirements.recommended]) {
            if (!present.has(prop)) {
                missing.add(prop);
            }
        }
    }
    if (missing.size === 0) {
        return undefined;
    }
    const missingList = [...missing];
    return {
        typeName: typeNames[0],
        missing: missingList,
        insertOffset: region.start + objectNode.offset + objectNode.length - 1,
        insertText: buildInsertText(objectNode, missingList, data),
    };
}
function findEnclosingObject(root, relativeOffset) {
    const node = (0, jsonc_parser_1.findNodeAtOffset)(root, relativeOffset, true);
    let current = node;
    while (current) {
        if (current.type === "object") {
            return current;
        }
        current = current.parent;
    }
    return undefined;
}
function isObjectKeyLocation(path) {
    return path.length === 0 || typeof path[path.length - 1] === "string";
}
function buildInsertText(objectNode, missing, data) {
    const hasExistingProps = (objectNode.children?.length ?? 0) > 0;
    const lines = missing.map((prop, index) => {
        const info = data.schema.properties[prop];
        const comma = index === missing.length - 1 ? "" : ",";
        return `  "${prop}": ${defaultValueForProperty(prop, info?.expectedTypes ?? [])}${comma}`;
    });
    return `${hasExistingProps ? "," : ""}\n${lines.join("\n")}\n`;
}
function snippetValueForProperty(prop, expectedTypes) {
    if (expectedTypes.some((type) => type === "URL")) {
        return '"${1:https://example.com}"';
    }
    if (expectedTypes.some((type) => type === "Number" || type === "Integer")) {
        return "${1:0}";
    }
    if (isLikelyObject(prop, expectedTypes)) {
        return "{\n  \"@type\": \"${1:Thing}\"\n}";
    }
    if (isLikelyArray(prop)) {
        return "[\n  ${1}\n]";
    }
    return '"${1}"';
}
function defaultValueForProperty(prop, expectedTypes) {
    if (isLikelyArray(prop)) {
        return "[]";
    }
    if (isLikelyObject(prop, expectedTypes)) {
        return "{ \"@type\": \"Thing\" }";
    }
    if (expectedTypes.some((type) => type === "Number" || type === "Integer")) {
        return "0";
    }
    return "\"\"";
}
function isLikelyArray(prop) {
    return [
        "image",
        "sameAs",
        "recipeIngredient",
        "recipeInstructions",
        "itemListElement",
        "mainEntity",
        "contactPoint",
    ].includes(prop);
}
function isLikelyObject(prop, expectedTypes) {
    if (["offers", "aggregateRating", "brand", "author", "publisher", "address", "location"].includes(prop)) {
        return true;
    }
    return expectedTypes.some((type) => /^[A-Z]/.test(type) && !["Text", "URL", "Date", "DateTime"].includes(type));
}
//# sourceMappingURL=recommender.js.map