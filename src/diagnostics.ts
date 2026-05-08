import * as vscode from "vscode";
import { findJsonLdRegions } from "./jsonld/locator";
import { parseJsonLdRegions, ParsedJsonLdRegion } from "./jsonld/parser";
import { SchemaData } from "./schema/data";
import { validateParsedRegion } from "./schema/validator";

export interface SchemaDiagnosticsResult {
  parsedRegions: ParsedJsonLdRegion[];
  diagnostics: vscode.Diagnostic[];
}

export function buildSchemaDiagnostics(
  document: vscode.TextDocument,
  data: SchemaData,
  severity: vscode.DiagnosticSeverity,
  includeGoogleRequired: boolean,
): SchemaDiagnosticsResult {
  const regions = findJsonLdRegions(document.getText(), document.languageId, document.fileName);
  const parsedRegions = parseJsonLdRegions(regions);
  const diagnostics: vscode.Diagnostic[] = [];

  for (const region of parsedRegions) {
    for (const issue of validateParsedRegion(region, data, includeGoogleRequired)) {
      const diagnostic = new vscode.Diagnostic(
        toRange(document, issue.offset, issue.length),
        issue.message,
        issue.kind === "missingRecommended"
          ? vscode.DiagnosticSeverity.Information
          : issue.kind === "syntax"
            ? vscode.DiagnosticSeverity.Error
            : severity,
      );
      diagnostic.source = "Webflow Schema";
      diagnostic.code = issue.kind;
      diagnostics.push(diagnostic);
    }
  }

  return { parsedRegions, diagnostics };
}

function toRange(document: vscode.TextDocument, offset: number, length: number): vscode.Range {
  return new vscode.Range(document.positionAt(offset), document.positionAt(offset + Math.max(1, length)));
}
