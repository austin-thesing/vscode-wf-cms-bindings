import { findNodeAtOffset, getLocation, Node as JsonNode } from "jsonc-parser";
import { ParsedJsonLdRegion } from "../jsonld/parser";
import {
  getAllPropertiesForType,
  getGoogleRequirementsForType,
  SchemaData,
} from "./data";
import { getObjectKeys, getPropertyValueNode, getStringValues } from "./validator";

export interface RecommendedAction {
  typeName: string;
  missing: string[];
  insertOffset: number;
  insertText: string;
}

export interface PropertyRecommendation {
  propertyName: string;
  expectedTypes: string[];
  comment: string;
  snippetValue: string;
}

export function getCompletionsForKeyPosition(
  region: ParsedJsonLdRegion,
  absoluteOffset: number,
  data: SchemaData,
): PropertyRecommendation[] {
  if (!region.root) {
    return [];
  }
  const relativeOffset = absoluteOffset - region.start;
  if (relativeOffset < 0 || relativeOffset > region.text.length) {
    return [];
  }

  const location = getLocation(region.sanitized, relativeOffset);
  if (!isObjectKeyLocation(location.path)) {
    return [];
  }

  const objectNode = findEnclosingObject(region.root, relativeOffset);
  if (!objectNode) {
    return [];
  }

  const typeNames = getStringValues(getPropertyValueNode(objectNode, "@type")).filter(
    (typeName) => data.schema.types[typeName],
  );
  if (typeNames.length === 0) {
    return [];
  }

  const present = getObjectKeys(objectNode);
  const properties = new Set<string>();
  for (const typeName of typeNames) {
    for (const prop of getAllPropertiesForType(data, typeName)) {
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

export function getRecommendedActionAtOffset(
  region: ParsedJsonLdRegion,
  absoluteOffset: number,
  data: SchemaData,
): RecommendedAction | undefined {
  if (!region.root) {
    return undefined;
  }

  const relativeOffset = absoluteOffset - region.start;
  const objectNode = findEnclosingObject(region.root, relativeOffset);
  if (!objectNode) {
    return undefined;
  }

  const typeNames = getStringValues(getPropertyValueNode(objectNode, "@type")).filter(
    (typeName) => data.schema.types[typeName],
  );
  if (typeNames.length === 0) {
    return undefined;
  }

  const present = getObjectKeys(objectNode);
  const missing = new Set<string>();
  for (const typeName of typeNames) {
    const requirements = getGoogleRequirementsForType(data, typeName);
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

export function findEnclosingObject(root: JsonNode, relativeOffset: number): JsonNode | undefined {
  const node = findNodeAtOffset(root, relativeOffset, true);
  let current: JsonNode | undefined = node;
  while (current) {
    if (current.type === "object") {
      return current;
    }
    current = current.parent;
  }
  return undefined;
}

function isObjectKeyLocation(path: (string | number)[]): boolean {
  return path.length === 0 || typeof path[path.length - 1] === "string";
}

function buildInsertText(objectNode: JsonNode, missing: string[], data: SchemaData): string {
  const hasExistingProps = (objectNode.children?.length ?? 0) > 0;
  const lines = missing.map((prop, index) => {
    const info = data.schema.properties[prop];
    const comma = index === missing.length - 1 ? "" : ",";
    return `  "${prop}": ${defaultValueForProperty(prop, info?.expectedTypes ?? [])}${comma}`;
  });
  return `${hasExistingProps ? "," : ""}\n${lines.join("\n")}\n`;
}

function snippetValueForProperty(prop: string, expectedTypes: string[]): string {
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

function defaultValueForProperty(prop: string, expectedTypes: string[]): string {
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

function isLikelyArray(prop: string): boolean {
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

function isLikelyObject(prop: string, expectedTypes: string[]): boolean {
  if (["offers", "aggregateRating", "brand", "author", "publisher", "address", "location"].includes(prop)) {
    return true;
  }
  return expectedTypes.some((type) => /^[A-Z]/.test(type) && !["Text", "URL", "Date", "DateTime"].includes(type));
}
