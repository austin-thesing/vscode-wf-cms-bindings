import * as assert from "assert";
import { findJsonLdRegions } from "../src/jsonld/locator";
import { sanitizeJsonLdRegion } from "../src/jsonld/sanitizer";

describe("sanitizeJsonLdRegion", () => {
  it("replaces quoted and unquoted bindings with same-length placeholders", () => {
    const text = `{
  "image": "{{wf {&quot;path&quot;:&quot;hero&quot;,&quot;type&quot;:&quot;ImageRef&quot;\\} }}",
  "price": {{wf {&quot;path&quot;:&quot;price&quot;,&quot;type&quot;:&quot;Number&quot;\\} }}
}`;
    const region = { start: 10, end: 10 + text.length, text };
    const sanitized = sanitizeJsonLdRegion(region);

    assert.strictEqual(sanitized.sanitized.length, text.length);
    assert.strictEqual(sanitized.bindings.length, 2);
    assert.doesNotThrow(() => JSON.parse(sanitized.sanitized));
    assert.strictEqual(sanitized.bindings[0].start, 10 + text.indexOf("{{wf"));
  });
});

describe("findJsonLdRegions", () => {
  it("finds JSON-LD script blocks in HTML", () => {
    const html = `<html><script type="application/ld+json">{"@type":"Product"}</script></html>`;
    const regions = findJsonLdRegions(html, "html", "index.html");
    assert.strictEqual(regions.length, 1);
    assert.strictEqual(regions[0].text, `{"@type":"Product"}`);
  });

  it("treats JSON files as standalone regions", () => {
    const json = `{"@type":"Product"}`;
    const regions = findJsonLdRegions(json, "json", "schema.json");
    assert.deepStrictEqual(regions, [{ start: 0, end: json.length, text: json }]);
  });
});
