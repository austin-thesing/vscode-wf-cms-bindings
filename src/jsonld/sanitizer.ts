import { findWebflowBindings, WebflowBindingMatch } from "../webflowBindings";
import { JsonLdRegion } from "./locator";

export interface SanitizedJsonLdRegion extends JsonLdRegion {
  sanitized: string;
  bindings: WebflowBindingMatch[];
}

export function sanitizeJsonLdRegion(region: JsonLdRegion): SanitizedJsonLdRegion {
  const bindings = findWebflowBindings(region.text);
  const chars = [...region.text];

  bindings.forEach((binding, index) => {
    const replacement = createPlaceholder(region.text, binding, index);
    for (let i = 0; i < replacement.length; i++) {
      chars[binding.start + i] = replacement[i];
    }
  });

  return {
    ...region,
    sanitized: chars.join(""),
    bindings: bindings.map((binding) => ({
      ...binding,
      start: binding.start + region.start,
      end: binding.end + region.start,
    })),
  };
}

function createPlaceholder(text: string, binding: WebflowBindingMatch, index: number): string {
  const length = binding.end - binding.start;
  if (length < 3) {
    return "_".repeat(length);
  }

  const quoted =
    binding.start > 0 &&
    binding.end < text.length &&
    text[binding.start - 1] === "\"" &&
    text[binding.end] === "\"";
  if (quoted) {
    return createStringBodyPlaceholder(length, index);
  }

  const core = `__WF${index}__`;
  const bodyLength = length - 2;
  const body =
    core.length <= bodyLength ? core.padEnd(bodyLength, "_") : core.slice(0, bodyLength);
  return `"${body}"`;
}

function createStringBodyPlaceholder(length: number, index: number): string {
  const core = `__WF${index}__`;
  return core.length <= length ? core.padEnd(length, "_") : core.slice(0, length);
}
