import { describe, it, expect } from "vitest";
import { z } from "zod";
import { NextRequest } from "next/server";
import { zCuid, zSlug, parseJsonBody } from "./validate";

describe("zCuid", () => {
  it("accepts a well-formed cuid v1 (c + 19+ [a-z0-9])", () => {
    const ok = "c" + "abcdefghij1234567890";
    expect(zCuid.safeParse(ok).success).toBe(true);
  });

  it("rejects ids that do not start with 'c'", () => {
    expect(zCuid.safeParse("a" + "abcdefghij1234567890").success).toBe(false);
  });

  it("rejects uppercase / out-of-charset characters", () => {
    expect(zCuid.safeParse("c" + "ABCDEFGHIJ1234567890").success).toBe(false);
    expect(zCuid.safeParse("c" + "abcdef_hij1234567890").success).toBe(false);
  });

  it("rejects too-short and empty values", () => {
    expect(zCuid.safeParse("cabc").success).toBe(false);
    expect(zCuid.safeParse("").success).toBe(false);
  });
});

describe("zSlug", () => {
  it.each([
    ["abc", true],
    ["abc-def", true],
    ["abc-def-123", true],
    ["a", true],
    ["123", true],
  ])("accepts %s", (input, expected) => {
    expect(zSlug.safeParse(input).success).toBe(expected);
  });

  it.each([
    ["ABC", "uppercase"],
    ["abc--def", "double hyphen"],
    ["-abc", "leading hyphen"],
    ["abc-", "trailing hyphen"],
    ["abc def", "whitespace"],
    ["abc_def", "underscore"],
    ["", "empty"],
  ])("rejects %s (%s)", (input) => {
    expect(zSlug.safeParse(input).success).toBe(false);
  });
});

describe("parseJsonBody", () => {
  function makeReq(body: BodyInit | null) {
    return new NextRequest("http://localhost:3000/api/x", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: body ?? undefined,
    });
  }

  const schema = z.object({ name: z.string(), age: z.number() }).strict();

  it("returns ok:true with parsed data when the body matches the schema", async () => {
    const r = await parseJsonBody(makeReq(JSON.stringify({ name: "x", age: 1 })), schema);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toEqual({ name: "x", age: 1 });
  });

  it("returns INVALID_JSON 400 when the body is not valid JSON", async () => {
    const r = await parseJsonBody(makeReq("not-json"), schema);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.response.status).toBe(400);
      const json = await r.response.json();
      expect(json.error.code).toBe("INVALID_JSON");
    }
  });

  it("returns INVALID_JSON when the body is a JSON array (not an object)", async () => {
    const r = await parseJsonBody(makeReq("[1,2,3]"), schema);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      const json = await r.response.json();
      expect(json.error.code).toBe("INVALID_JSON");
    }
  });

  it("returns INVALID_JSON when the body is the JSON literal null", async () => {
    const r = await parseJsonBody(makeReq("null"), schema);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      const json = await r.response.json();
      expect(json.error.code).toBe("INVALID_JSON");
    }
  });

  it("returns VALIDATION_ERROR 400 when an extra key sneaks past .strict()", async () => {
    const r = await parseJsonBody(
      makeReq(JSON.stringify({ name: "x", age: 1, hacked: true })),
      schema,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.response.status).toBe(400);
      const json = await r.response.json();
      expect(json.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("returns VALIDATION_ERROR when a field has the wrong type", async () => {
    const r = await parseJsonBody(
      makeReq(JSON.stringify({ name: "x", age: "not-a-number" })),
      schema,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      const json = await r.response.json();
      expect(json.error.code).toBe("VALIDATION_ERROR");
    }
  });
});
