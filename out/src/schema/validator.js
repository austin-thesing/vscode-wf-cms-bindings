"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateParsedRegion = validateParsedRegion;
exports.getPropertyValueNode = getPropertyValueNode;
exports.getObjectKeys = getObjectKeys;
exports.getStringValues = getStringValues;
const data_1 = require("./data");
function validateParsedRegion(region, data, includeGoogleRequired = true) {
    const issues = region.syntaxIssues.map((issue) => ({
        kind: "syntax",
        message: issue.message,
        offset: issue.offset,
        length: issue.length,
    }));
    if (!region.root || region.syntaxIssues.length > 0) {
        return issues;
    }
    walk(region.root, (node) => {
        if (node.type !== "object") {
            return;
        }
        const typeNode = getPropertyValueNode(node, "@type");
        const typeNames = getStringValues(typeNode);
        if (typeNames.length === 0) {
            return;
        }
        for (const typeName of typeNames) {
            if (!data.schema.types[typeName]) {
                issues.push({
                    kind: "unknownType",
                    message: `Unknown schema.org type "${typeName}".`,
                    offset: region.start + (typeNode?.offset ?? node.offset),
                    length: typeNode?.length ?? 1,
                    typeName,
                });
            }
        }
        const validTypes = typeNames.filter((typeName) => data.schema.types[typeName]);
        if (validTypes.length === 0) {
            return;
        }
        const allowed = new Set();
        for (const typeName of validTypes) {
            for (const prop of (0, data_1.getAllPropertiesForType)(data, typeName)) {
                allowed.add(prop);
            }
        }
        for (const property of node.children ?? []) {
            const keyNode = property.children?.[0];
            const key = typeof keyNode?.value === "string" ? keyNode.value : undefined;
            if (!keyNode || !key || key.startsWith("@") || allowed.has(key)) {
                continue;
            }
            issues.push({
                kind: "unknownProperty",
                message: `Property "${key}" is not recognized for ${validTypes.join(" or ")}.`,
                offset: region.start + keyNode.offset,
                length: keyNode.length,
                typeName: validTypes[0],
                propertyName: key,
            });
        }
        if (!includeGoogleRequired) {
            return;
        }
        const present = getObjectKeys(node);
        const requirements = mergeRequirements(data, validTypes);
        for (const propertyName of requirements.required) {
            if (!present.has(propertyName)) {
                issues.push({
                    kind: "missingRequired",
                    message: `${validTypes[0]} is missing required rich-result property "${propertyName}".`,
                    offset: region.start + node.offset,
                    length: 1,
                    typeName: validTypes[0],
                    propertyName,
                });
            }
        }
        for (const propertyName of requirements.recommended) {
            if (!present.has(propertyName)) {
                issues.push({
                    kind: "missingRecommended",
                    message: `${validTypes[0]} is missing recommended rich-result property "${propertyName}".`,
                    offset: region.start + node.offset,
                    length: 1,
                    typeName: validTypes[0],
                    propertyName,
                });
            }
        }
    });
    return issues;
}
function getPropertyValueNode(objectNode, key) {
    for (const property of objectNode.children ?? []) {
        const keyNode = property.children?.[0];
        if (keyNode?.value === key) {
            return property.children?.[1];
        }
    }
    return undefined;
}
function getObjectKeys(objectNode) {
    const keys = new Set();
    for (const property of objectNode.children ?? []) {
        const key = property.children?.[0]?.value;
        if (typeof key === "string") {
            keys.add(key);
        }
    }
    return keys;
}
function getStringValues(node) {
    if (!node) {
        return [];
    }
    if (node.type === "string" && typeof node.value === "string") {
        return [node.value];
    }
    if (node.type === "array") {
        return (node.children ?? [])
            .filter((child) => child.type === "string" && typeof child.value === "string")
            .map((child) => child.value);
    }
    return [];
}
function mergeRequirements(data, typeNames) {
    const required = new Set();
    const recommended = new Set();
    for (const typeName of typeNames) {
        const requirements = (0, data_1.getGoogleRequirementsForType)(data, typeName);
        if (!requirements) {
            continue;
        }
        for (const prop of requirements.required) {
            required.add(prop);
        }
        for (const prop of requirements.recommended) {
            recommended.add(prop);
        }
    }
    for (const prop of required) {
        recommended.delete(prop);
    }
    return { required: [...required], recommended: [...recommended] };
}
function walk(node, visit) {
    visit(node);
    for (const child of node.children ?? []) {
        walk(child, visit);
    }
}
//# sourceMappingURL=validator.js.map