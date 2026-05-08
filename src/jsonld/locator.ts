export interface JsonLdRegion {
  start: number;
  end: number;
  text: string;
}

const JSON_LD_SCRIPT_OPEN =
  /<script\b(?=[^>]*\btype\s*=\s*(?:"application\/ld\+json"|'application\/ld\+json'|application\/ld\+json))[^>]*>/gi;
const SCRIPT_CLOSE = /<\/script\s*>/gi;

export function findJsonLdRegions(
  text: string,
  languageId: string,
  fileName: string = "",
): JsonLdRegion[] {
  if (isStandaloneJson(languageId, fileName)) {
    return [{ start: 0, end: text.length, text }];
  }

  if (languageId !== "html") {
    return [];
  }

  const regions: JsonLdRegion[] = [];
  JSON_LD_SCRIPT_OPEN.lastIndex = 0;
  let openMatch: RegExpExecArray | null;
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

function isStandaloneJson(languageId: string, fileName: string): boolean {
  if (languageId === "json" || languageId === "jsonc") {
    return true;
  }
  const lower = fileName.toLowerCase();
  return lower.endsWith(".jsonld") || lower.endsWith(".schema.json");
}
