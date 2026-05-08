import * as fs from "fs";
import * as path from "path";

interface JsonLdNode {
  "@id"?: string;
  "@type"?: string | string[];
  "rdfs:comment"?: string | { "@value"?: string };
  "rdfs:label"?: string | { "@value"?: string };
  "rdfs:subClassOf"?: Ref | Ref[];
  "schema:domainIncludes"?: Ref | Ref[];
  "schema:rangeIncludes"?: Ref | Ref[];
}

interface Ref {
  "@id"?: string;
}

interface SchemaDump {
  "@graph": JsonLdNode[];
}

interface TypeInfo {
  parents: string[];
  properties: string[];
}

interface PropertyInfo {
  expectedTypes: string[];
  comment: string;
}

const SOURCE_URL = "https://schema.org/version/latest/schemaorg-current-https.jsonld";

async function main(): Promise<void> {
  const res = await fetch(SOURCE_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch schema.org data: ${res.status} ${res.statusText}`);
  }

  const dump = (await res.json()) as SchemaDump;
  const types: Record<string, TypeInfo> = {};
  const directPropsByType = new Map<string, Set<string>>();
  const properties: Record<string, PropertyInfo> = {};

  for (const node of dump["@graph"]) {
    const id = cleanId(node["@id"]);
    if (!id) {
      continue;
    }

    if (hasType(node, "rdfs:Class")) {
      types[id] = {
        parents: refsToNames(node["rdfs:subClassOf"]),
        properties: [],
      };
      continue;
    }

    if (hasType(node, "rdf:Property")) {
      const domains = refsToNames(node["schema:domainIncludes"]);
      const ranges = refsToNames(node["schema:rangeIncludes"]);
      properties[id] = {
        expectedTypes: ranges,
        comment: commentToString(node["rdfs:comment"]),
      };

      for (const domain of domains) {
        let props = directPropsByType.get(domain);
        if (!props) {
          props = new Set<string>();
          directPropsByType.set(domain, props);
        }
        props.add(id);
      }
    }
  }

  for (const typeName of Object.keys(types)) {
    const allProps = new Set<string>();
    const stack = [typeName, ...types[typeName].parents];
    const seen = new Set<string>();
    while (stack.length > 0) {
      const name = stack.pop();
      if (!name || seen.has(name)) {
        continue;
      }
      seen.add(name);
      for (const prop of directPropsByType.get(name) ?? []) {
        allProps.add(prop);
      }
      for (const parent of types[name]?.parents ?? []) {
        stack.push(parent);
      }
    }
    types[typeName].properties = [...allProps].sort();
  }

  const out = { types, properties };
  const outPath = path.join(process.cwd(), "data", "schemaorg.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(out, null, 2)}\n`);
}

function hasType(node: JsonLdNode, type: string): boolean {
  const raw = node["@type"];
  return Array.isArray(raw) ? raw.includes(type) : raw === type;
}

function refsToNames(value: Ref | Ref[] | undefined): string[] {
  if (!value) {
    return [];
  }
  const refs = Array.isArray(value) ? value : [value];
  return refs.map((ref) => cleanId(ref["@id"])).filter((v): v is string => Boolean(v));
}

function cleanId(id: string | undefined): string | undefined {
  if (!id) {
    return undefined;
  }
  return id.replace(/^schema:/, "").replace(/^http:\/\/schema\.org\//, "").replace(/^https:\/\/schema\.org\//, "");
}

function commentToString(value: JsonLdNode["rdfs:comment"]): string {
  if (!value) {
    return "";
  }
  return typeof value === "string" ? value : value["@value"] ?? "";
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
