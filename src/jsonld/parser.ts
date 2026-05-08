import {
  findNodeAtOffset,
  getLocation,
  Node as JsonNode,
  printParseErrorCode,
  ParseError,
  parseTree,
  Segment,
} from "jsonc-parser";
import { sanitizeJsonLdRegion, SanitizedJsonLdRegion } from "./sanitizer";
import { JsonLdRegion } from "./locator";

export interface JsonSyntaxIssue {
  message: string;
  offset: number;
  length: number;
}

export interface ParsedJsonLdRegion extends SanitizedJsonLdRegion {
  root?: JsonNode;
  syntaxIssues: JsonSyntaxIssue[];
}

export { findNodeAtOffset, getLocation, JsonNode, Segment };

export function parseJsonLdRegion(region: JsonLdRegion): ParsedJsonLdRegion {
  const sanitized = sanitizeJsonLdRegion(region);
  const errors: ParseError[] = [];
  const root = parseTree(sanitized.sanitized, errors, {
    allowTrailingComma: false,
    disallowComments: false,
  });

  return {
    ...sanitized,
    root,
    syntaxIssues: errors.map((error) => ({
      message: printParseErrorCode(error.error),
      offset: region.start + error.offset,
      length: Math.max(1, error.length),
    })),
  };
}

export function parseJsonLdRegions(regions: JsonLdRegion[]): ParsedJsonLdRegion[] {
  return regions.map(parseJsonLdRegion);
}
