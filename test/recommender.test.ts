import * as assert from "assert";
import { parseJsonLdRegion } from "../src/jsonld/parser";
import { loadSchemaData } from "../src/schema/data";
import {
  getCompletionsForKeyPosition,
  getRecommendedActionAtOffset,
} from "../src/schema/recommender";

const data = loadSchemaData(process.cwd());

describe("schema recommender", () => {
  it("suggests Product properties not already present", () => {
    const text = `{"@type":"Product",}`;
    const region = parseJsonLdRegion({ start: 0, end: text.length, text });
    const completions = getCompletionsForKeyPosition(region, text.indexOf("}") - 1, data);
    const labels = completions.map((item) => item.propertyName);

    assert.ok(labels.includes("name"));
    assert.ok(labels.includes("image"));
    assert.ok(labels.includes("offers"));
  });

  it("builds a recommended-field action for Product", () => {
    const text = `{"@type":"Product"}`;
    const region = parseJsonLdRegion({ start: 0, end: text.length, text });
    const action = getRecommendedActionAtOffset(region, text.indexOf("Product"), data);

    assert.ok(action);
    if (!action) {
      return;
    }
    assert.strictEqual(action.typeName, "Product");
    assert.ok(action.missing.includes("name"));
    assert.ok(action.missing.includes("image"));
    assert.ok(action.missing.includes("offers"));
    assert.ok(action.insertText.includes(`"name"`));
  });
});
