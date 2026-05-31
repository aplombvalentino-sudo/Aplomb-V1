import { describe, it, expect } from "vitest";
import {
  currentVersion,
  getOutstandingDocs,
  isAcceptanceCurrent,
  LEGAL_DOCS,
  LEGAL_DOC_TYPES,
  CURRENT_TERMS_VERSION,
  CURRENT_PRIVACY_VERSION,
} from "./legalVersions";

describe("legalVersions config", () => {
  it("exposes both required document types", () => {
    expect(LEGAL_DOC_TYPES.sort()).toEqual(["privacy", "terms"]);
  });

  it("currentVersion matches the constants and the catalog", () => {
    expect(currentVersion("terms")).toBe(LEGAL_DOCS.terms.version);
    expect(currentVersion("privacy")).toBe(LEGAL_DOCS.privacy.version);
    expect(CURRENT_TERMS_VERSION).toBe(LEGAL_DOCS.terms.version);
    expect(CURRENT_PRIVACY_VERSION).toBe(LEGAL_DOCS.privacy.version);
  });
});

describe("getOutstandingDocs", () => {
  const v_terms = currentVersion("terms");
  const v_privacy = currentVersion("privacy");

  it("flags both as outstanding when nothing has been accepted", () => {
    expect(getOutstandingDocs([]).sort()).toEqual(["privacy", "terms"]);
  });

  it("returns no outstanding when both current versions are accepted", () => {
    expect(
      getOutstandingDocs([
        { documentType: "terms", documentVersion: v_terms },
        { documentType: "privacy", documentVersion: v_privacy },
      ]),
    ).toEqual([]);
  });

  it("flags a stale-version acceptance as outstanding", () => {
    expect(
      getOutstandingDocs([
        { documentType: "terms", documentVersion: v_terms },
        { documentType: "privacy", documentVersion: "2000-01-01" },
      ]),
    ).toEqual(["privacy"]);
  });

  it("keeps the highest version per type when several rows exist", () => {
    // an old row + a current one for the same doc → up to date
    expect(
      getOutstandingDocs([
        { documentType: "terms", documentVersion: "2000-01-01" },
        { documentType: "terms", documentVersion: v_terms },
        { documentType: "privacy", documentVersion: v_privacy },
      ]),
    ).toEqual([]);
  });
});

describe("isAcceptanceCurrent", () => {
  const v_terms = currentVersion("terms");
  const v_privacy = currentVersion("privacy");

  it("is true when nothing is outstanding", () => {
    expect(
      isAcceptanceCurrent([
        { documentType: "terms", documentVersion: v_terms },
        { documentType: "privacy", documentVersion: v_privacy },
      ]),
    ).toBe(true);
  });

  it("is false as soon as one doc is missing or stale", () => {
    expect(isAcceptanceCurrent([])).toBe(false);
    expect(
      isAcceptanceCurrent([
        { documentType: "terms", documentVersion: v_terms },
      ]),
    ).toBe(false);
  });
});
