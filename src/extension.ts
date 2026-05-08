import * as vscode from "vscode";
import {
  findWebflowBindings,
  getBindingDisplayName,
  WebflowBindingMatch,
} from "./webflowBindings";
import { buildSchemaDiagnostics } from "./diagnostics";
import { findJsonLdRegions } from "./jsonld/locator";
import { parseJsonLdRegions, ParsedJsonLdRegion } from "./jsonld/parser";
import { loadSchemaData, SchemaData } from "./schema/data";
import {
  getCompletionsForKeyPosition,
  getRecommendedActionAtOffset,
  RecommendedAction,
} from "./schema/recommender";

const CONFIG_SECTION = "webflowCmsBindings";
const KEY_ENABLED = "enabled";
const KEY_DISPLAY_MODE = "displayMode";
const KEY_LANGUAGES = "languages";
const KEY_DEBOUNCE = "debounceMs";
const KEY_VALIDATE_ENABLED = "validate.enabled";
const KEY_VALIDATE_SEVERITY = "validate.severity";
const KEY_RECOMMEND_ENABLED = "recommend.enabled";
const KEY_RECOMMEND_INCLUDE_GOOGLE_REQUIRED = "recommend.includeGoogleRequired";

type DisplayMode = "highlight" | "pill";

let highlightDecorationType: vscode.TextEditorDecorationType | undefined;
let pillDecorationType: vscode.TextEditorDecorationType | undefined;
const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
const parsedRegionCache = new Map<string, ParsedJsonLdRegion[]>();

export function activate(context: vscode.ExtensionContext): void {
  const schemaData = loadSchemaData(context.extensionPath);
  const diagnostics = vscode.languages.createDiagnosticCollection("webflow-cms-bindings");
  highlightDecorationType = vscode.window.createTextEditorDecorationType({
    borderRadius: "4px",
    border: "1px solid rgba(139, 92, 246, 0.55)",
    rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
    light: {
      backgroundColor: "rgba(124, 58, 237, 0.18)",
      color: "#4c1d95",
    },
    dark: {
      backgroundColor: "rgba(139, 92, 246, 0.28)",
      color: "#f3e8ff",
    },
  });

  pillDecorationType = vscode.window.createTextEditorDecorationType({
    opacity: "0",
    border: "1px solid transparent",
    color: "transparent",
    backgroundColor: "transparent",
    // Collapse the source span as much as VS Code decorations allow while
    // keeping the encoded text present for save/copy/paste.
    textDecoration: "none; font-size: 0; letter-spacing: -999px;",
    rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
    before: {
      margin: "0 0.15em 0 0",
      border: "1px solid rgba(167, 139, 250, 0.85)",
      backgroundColor: "rgba(124, 58, 237, 0.92)",
      color: "#ffffff",
      fontStyle: "normal",
      fontWeight: "600",
      textDecoration: "none",
    },
  });

  context.subscriptions.push(highlightDecorationType, pillDecorationType, diagnostics);

  const refresh = (editor: vscode.TextEditor | undefined): void => {
    if (!editor || !highlightDecorationType || !pillDecorationType) {
      return;
    }
    if (!shouldDecorateDocument(editor.document)) {
      clearDecorations(editor);
      return;
    }
    if (!getEnabled()) {
      clearDecorations(editor);
      return;
    }
    const text = editor.document.getText();
    const matches = findWebflowBindings(text);
    const mode = getDisplayMode();
    refreshSchemaDiagnostics(editor.document, diagnostics, schemaData);

    if (mode === "pill") {
      editor.setDecorations(highlightDecorationType, []);
      editor.setDecorations(
        pillDecorationType,
        matches.map((m) => toDecoration(editor.document, m, mode)),
      );
      return;
    }

    editor.setDecorations(pillDecorationType, []);
    editor.setDecorations(
      highlightDecorationType,
      matches.map((m) => toDecoration(editor.document, m, mode)),
    );
  };

  const scheduleRefresh = (document: vscode.TextDocument): void => {
    if (!highlightDecorationType || !pillDecorationType) {
      return;
    }
    const langOk = shouldDecorateDocument(document);
    if (!langOk) {
      return;
    }

    const uri = document.uri.toString();
    const existing = debounceTimers.get(uri);
    if (existing) {
      clearTimeout(existing);
    }

    const ms = Math.max(0, getDebounceMs());
    debounceTimers.set(
      uri,
      setTimeout(() => {
        debounceTimers.delete(uri);
        const editor = vscode.window.visibleTextEditors.find(
          (e) => e.document.uri.toString() === uri,
        );
        if (editor) {
          refresh(editor);
        } else {
          refreshSchemaDiagnostics(document, diagnostics, schemaData);
        }
      }, ms),
    );
  };

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      refresh(editor);
    }),
  );

  context.subscriptions.push(
    vscode.window.onDidChangeVisibleTextEditors(() => {
      vscode.window.visibleTextEditors.forEach((ed) => refresh(ed));
    }),
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((ev) => {
      scheduleRefresh(ev.document);
    }),
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((ev) => {
      if (ev.affectsConfiguration(CONFIG_SECTION)) {
        vscode.window.visibleTextEditors.forEach((ed) => refresh(ed));
        for (const document of vscode.workspace.textDocuments) {
          refreshSchemaDiagnostics(document, diagnostics, schemaData);
        }
      }
    }),
  );

  context.subscriptions.push(registerCompletionProvider(schemaData));
  context.subscriptions.push(registerCodeActionProvider(schemaData));

  context.subscriptions.push({
    dispose: () => {
      for (const t of debounceTimers.values()) {
        clearTimeout(t);
      }
      debounceTimers.clear();
    },
  });

  context.subscriptions.push(
    vscode.commands.registerCommand("webflowCmsBindings.toggleHighlights", async () => {
      const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
      const current = config.get<boolean>(KEY_ENABLED) ?? true;
      await config.update(KEY_ENABLED, !current, vscode.ConfigurationTarget.Global);
      vscode.window.visibleTextEditors.forEach((ed) => refresh(ed));
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("webflowCmsBindings.toggleDisplayMode", async () => {
      const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
      const nextMode: DisplayMode = getDisplayMode() === "pill" ? "highlight" : "pill";
      await config.update(KEY_DISPLAY_MODE, nextMode, vscode.ConfigurationTarget.Global);
      vscode.window.visibleTextEditors.forEach((ed) => refresh(ed));
      void vscode.window.showInformationMessage(
        `Webflow CMS Bindings display mode: ${nextMode}`,
      );
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("webflowCmsBindings.validateSchema", () => {
      const document = vscode.window.activeTextEditor?.document;
      if (!document) {
        return;
      }
      refreshSchemaDiagnostics(document, diagnostics, schemaData);
      const count = diagnostics.get(document.uri)?.length ?? 0;
      void vscode.window.showInformationMessage(
        count === 0
          ? "Webflow schema validation found no issues."
          : `Webflow schema validation found ${count} issue${count === 1 ? "" : "s"}.`,
      );
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "webflowCmsBindings.insertRecommendedProperties",
      async (documentUri: vscode.Uri, action: RecommendedAction) => {
        const document = vscode.workspace.textDocuments.find(
          (d) => d.uri.toString() === documentUri.toString(),
        );
        if (!document) {
          return;
        }
        const edit = new vscode.WorkspaceEdit();
        edit.insert(documentUri, document.positionAt(action.insertOffset), action.insertText);
        await vscode.workspace.applyEdit(edit);
      },
    ),
  );

  refresh(vscode.window.activeTextEditor);
}

export function deactivate(): void {
  for (const t of debounceTimers.values()) {
    clearTimeout(t);
  }
  debounceTimers.clear();
}

function getEnabled(): boolean {
  return vscode.workspace.getConfiguration(CONFIG_SECTION).get<boolean>(KEY_ENABLED) ?? true;
}

function getDisplayMode(): DisplayMode {
  const value = vscode.workspace.getConfiguration(CONFIG_SECTION).get<string>(KEY_DISPLAY_MODE);
  return value === "highlight" ? "highlight" : "pill";
}

function getLanguageAllowlist(): string[] {
  const raw = vscode.workspace.getConfiguration(CONFIG_SECTION).get<string[]>(KEY_LANGUAGES);
  if (Array.isArray(raw) && raw.length > 0) {
    return raw;
  }
  return ["html", "javascript", "typescript", "json", "jsonc"];
}

function getDebounceMs(): number {
  const v = vscode.workspace.getConfiguration(CONFIG_SECTION).get<number>(KEY_DEBOUNCE);
  return typeof v === "number" && !Number.isNaN(v) ? v : 100;
}

function getValidateEnabled(): boolean {
  return vscode.workspace.getConfiguration(CONFIG_SECTION).get<boolean>(KEY_VALIDATE_ENABLED) ?? true;
}

function getValidateSeverity(): vscode.DiagnosticSeverity {
  const value = vscode.workspace.getConfiguration(CONFIG_SECTION).get<string>(KEY_VALIDATE_SEVERITY);
  if (value === "error") {
    return vscode.DiagnosticSeverity.Error;
  }
  if (value === "information") {
    return vscode.DiagnosticSeverity.Information;
  }
  return vscode.DiagnosticSeverity.Warning;
}

function getRecommendEnabled(): boolean {
  return vscode.workspace.getConfiguration(CONFIG_SECTION).get<boolean>(KEY_RECOMMEND_ENABLED) ?? true;
}

function getIncludeGoogleRequired(): boolean {
  return (
    vscode.workspace
      .getConfiguration(CONFIG_SECTION)
      .get<boolean>(KEY_RECOMMEND_INCLUDE_GOOGLE_REQUIRED) ?? true
  );
}

function shouldDecorateDocument(document: vscode.TextDocument): boolean {
  const allow = getLanguageAllowlist();
  return allow.includes(document.languageId);
}

function refreshSchemaDiagnostics(
  document: vscode.TextDocument,
  collection: vscode.DiagnosticCollection,
  data: SchemaData,
): void {
  if (!shouldDecorateDocument(document) || !getValidateEnabled()) {
    collection.delete(document.uri);
    parsedRegionCache.delete(document.uri.toString());
    return;
  }

  const result = buildSchemaDiagnostics(
    document,
    data,
    getValidateSeverity(),
    getIncludeGoogleRequired(),
  );
  parsedRegionCache.set(document.uri.toString(), result.parsedRegions);
  collection.set(document.uri, result.diagnostics);
}

function registerCompletionProvider(schemaData: SchemaData): vscode.Disposable {
  return vscode.languages.registerCompletionItemProvider(
    ["html", "json", "jsonc"],
    {
      provideCompletionItems(document, position) {
        if (!getRecommendEnabled() || !shouldDecorateDocument(document)) {
          return [];
        }
        const offset = document.offsetAt(position);
        const regions = getParsedRegions(document);
        const region = regions.find((r) => offset >= r.start && offset <= r.end);
        if (!region) {
          return [];
        }
        return getCompletionsForKeyPosition(region, offset, schemaData).map((recommendation) => {
          const item = new vscode.CompletionItem(
            recommendation.propertyName,
            vscode.CompletionItemKind.Property,
          );
          item.insertText = new vscode.SnippetString(
            `"${recommendation.propertyName}": ${recommendation.snippetValue}`,
          );
          item.detail = recommendation.expectedTypes.length
            ? `schema.org: ${recommendation.expectedTypes.join(" | ")}`
            : "schema.org property";
          if (recommendation.comment) {
            item.documentation = new vscode.MarkdownString(recommendation.comment);
          }
          return item;
        });
      },
    },
    '"',
  );
}

function registerCodeActionProvider(schemaData: SchemaData): vscode.Disposable {
  return vscode.languages.registerCodeActionsProvider(
    ["html", "json", "jsonc"],
    {
      provideCodeActions(document, range) {
        if (!getRecommendEnabled() || !shouldDecorateDocument(document)) {
          return [];
        }
        const offset = document.offsetAt(range.start);
        const regions = getParsedRegions(document);
        const region = regions.find((r) => offset >= r.start && offset <= r.end);
        if (!region) {
          return [];
        }
        const recommended = getRecommendedActionAtOffset(region, offset, schemaData);
        if (!recommended) {
          return [];
        }

        const action = new vscode.CodeAction(
          `Insert recommended properties for ${recommended.typeName}`,
          vscode.CodeActionKind.QuickFix,
        );
        action.command = {
          command: "webflowCmsBindings.insertRecommendedProperties",
          title: action.title,
          arguments: [document.uri, recommended],
        };
        return [action];
      },
    },
    { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] },
  );
}

function getParsedRegions(document: vscode.TextDocument): ParsedJsonLdRegion[] {
  const key = document.uri.toString();
  const cached = parsedRegionCache.get(key);
  if (cached) {
    return cached;
  }
  const parsed = parseJsonLdRegions(
    findJsonLdRegions(document.getText(), document.languageId, document.fileName),
  );
  parsedRegionCache.set(key, parsed);
  return parsed;
}

function toDecoration(
  document: vscode.TextDocument,
  match: WebflowBindingMatch,
  mode: DisplayMode,
): vscode.DecorationOptions {
  const startPos = document.positionAt(match.start);
  const endPos = document.positionAt(match.end);
  const range = new vscode.Range(startPos, endPos);

  const parts: string[] = ["**Webflow CMS binding**"];
  if (match.path) {
    parts.push(`Field: \`${match.path}\``);
  }
  if (match.fieldType) {
    parts.push(`Type: \`${match.fieldType}\``);
  }
  if (!match.path && !match.fieldType) {
    parts.push(`Could not decode field metadata from binding.`);
  }

  const md = new vscode.MarkdownString(parts.join("\n\n"));
  md.isTrusted = false;

  const decoration: vscode.DecorationOptions = {
    range,
    hoverMessage: md,
  };

  if (mode === "pill") {
    decoration.renderOptions = {
      before: {
        contentText: ` ${getBindingDisplayName(match)} `,
      },
    };
  }

  return decoration;
}

function clearDecorations(editor: vscode.TextEditor): void {
  if (highlightDecorationType) {
    editor.setDecorations(highlightDecorationType, []);
  }
  if (pillDecorationType) {
    editor.setDecorations(pillDecorationType, []);
  }
}
