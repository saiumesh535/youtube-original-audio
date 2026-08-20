/** JSON value model so we never need any/unknown when parsing responses. */

export type JsonPrimitive = string | number | boolean | null;

export type JsonValue = JsonPrimitive | JsonObject | JsonArray;

export type JsonObject = {
  readonly [key: string]: JsonValue | undefined;
};

export type JsonArray = ReadonlyArray<JsonValue>;

export function isJsonObject(value: JsonValue): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function isJsonArray(value: JsonValue): value is JsonArray {
  return Array.isArray(value);
}

export function parseJsonValue(text: string): JsonValue {
  const parsed: JsonValue = JSON.parse(text) as JsonValue;
  return parsed;
}

export function readString(obj: JsonObject, key: string): string | undefined {
  const value = obj[key];
  return typeof value === "string" ? value : undefined;
}

export function readBoolean(obj: JsonObject, key: string): boolean | undefined {
  const value = obj[key];
  return typeof value === "boolean" ? value : undefined;
}

export function readObject(obj: JsonObject, key: string): JsonObject | undefined {
  const value = obj[key];
  return value !== undefined && isJsonObject(value) ? value : undefined;
}

export function readArray(obj: JsonObject, key: string): JsonArray | undefined {
  const value = obj[key];
  return value !== undefined && isJsonArray(value) ? value : undefined;
}
