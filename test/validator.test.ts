import * as assert from "assert";
import { parseJsonLdRegion } from "../src/jsonld/parser";
import { loadSchemaData } from "../src/schema/data";
import { validateParsedRegion } from "../src/schema/validator";

const data = loadSchemaData(process.cwd());

describe("validateParsedRegion", () => {
  it("accepts a well-formed Product with required fields", () => {
    const parsed = parse(`{
      "@context": "https://schema.org",
      "@type": "Product",
      "name": "Chair",
      "image": ["https://example.com/chair.jpg"],
      "offers": { "@type": "Offer", "price": "10", "priceCurrency": "USD" }
    }`);

    const issues = validateParsedRegion(parsed, data);
    assert.deepStrictEqual(
      issues.filter((issue) => issue.kind !== "missingRecommended").map((issue) => issue.kind),
      [],
    );
  });

  it("reports missing required Product properties", () => {
    const issues = validateParsedRegion(parse(`{"@type":"Product","name":"Chair"}`), data);
    assert.ok(issues.some((issue) => issue.kind === "missingRequired" && issue.propertyName === "image"));
    assert.ok(issues.some((issue) => issue.kind === "missingRequired" && issue.propertyName === "offers"));
  });

  it("reports unknown schema types and properties", () => {
    const unknownType = validateParsedRegion(parse(`{"@type":"Nope"}`), data);
    assert.ok(unknownType.some((issue) => issue.kind === "unknownType"));

    const unknownProperty = validateParsedRegion(
      parse(`{"@type":"Product","name":"Chair","image":[],"offers":{},"madeUp":true}`),
      data,
    );
    assert.ok(unknownProperty.some((issue) => issue.kind === "unknownProperty" && issue.propertyName === "madeUp"));
  });

  it("reports JSON syntax issues", () => {
    const issues = validateParsedRegion(parse(`{"@type":"Product",`), data);
    assert.ok(issues.some((issue) => issue.kind === "syntax"));
  });

  it("ignores Webflow bindings while checking syntax", () => {
    const parsed = parse(`{"@type":"Product","name":{{wf {&quot;path&quot;:&quot;name&quot;,&quot;type&quot;:&quot;PlainText&quot;\\} }},"image":[],"offers":{}}`);
    const issues = validateParsedRegion(parsed, data);
    assert.ok(!issues.some((issue) => issue.kind === "syntax"));
  });
});

function parse(text: string) {
  return parseJsonLdRegion({ start: 0, end: text.length, text });
}
