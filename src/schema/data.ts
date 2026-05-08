import * as fs from "fs";
import * as path from "path";

export interface SchemaTypeInfo {
  parents: string[];
  properties: string[];
}

export interface SchemaPropertyInfo {
  expectedTypes: string[];
  comment: string;
}

export interface SchemaGraph {
  types: Record<string, SchemaTypeInfo>;
  properties: Record<string, SchemaPropertyInfo>;
}

export interface GoogleRequirements {
  required: string[];
  recommended: string[];
}

export interface SchemaData {
  schema: SchemaGraph;
  googleRequired: Record<string, GoogleRequirements>;
}

let cached: SchemaData | undefined;

export function loadSchemaData(extensionPath: string = path.resolve(__dirname, "..", "..")): SchemaData {
  if (cached) {
    return cached;
  }

  cached = {
    schema: readJson<SchemaGraph>(extensionPath, "data", "schemaorg.json"),
    googleRequired: readJson<Record<string, GoogleRequirements>>(
      extensionPath,
      "data",
      "googleRequired.json",
    ),
  };
  return cached;
}

export function getAllPropertiesForType(data: SchemaData, typeName: string): Set<string> {
  const out = new Set<string>(["@context", "@type", "@id"]);
  const seen = new Set<string>();
  const stack = [typeName];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || seen.has(current)) {
      continue;
    }
    seen.add(current);
    const info = data.schema.types[current];
    if (!info) {
      continue;
    }
    for (const prop of info.properties) {
      out.add(prop);
    }
    for (const parent of info.parents) {
      stack.push(parent);
    }
  }

  return out;
}

export function getGoogleRequirementsForType(
  data: SchemaData,
  typeName: string,
): GoogleRequirements | undefined {
  const names = [typeName, ...(data.schema.types[typeName]?.parents ?? [])];
  for (const name of names) {
    const requirements = data.googleRequired[name];
    if (requirements) {
      return requirements;
    }
  }
  return undefined;
}

function readJson<T>(extensionPath: string, ...parts: string[]): T {
  const raw = fs.readFileSync(path.join(extensionPath, ...parts), "utf8");
  return JSON.parse(raw) as T;
}
