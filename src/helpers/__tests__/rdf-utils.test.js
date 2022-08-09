import {
  applyPrefixesToStatement,
  isValidTtlPrefix,
  parseTtlPrefix,
  resolvePrefixesInStatement,
  validateRDFPrefixes,
} from "../rdf-utils";
import { prefixes } from "./data.json";

test("isValidTtlPrefix returns true for valid 1.0 prefix", () => {
  expect(
    isValidTtlPrefix(
      "@prefix somePrefix: <http://www.perceive.net/schemas/relationship/> ."
    )
  ).toBeTruthy();
});

test("isValidTtlPrefix returns true for valid 1.1 prefix", () => {
  expect(isValidTtlPrefix("PREFIX p: <http://two.example/>")).toBeTruthy();
});

test("isValidTtlPrefix returns true for empty string", () => {
  expect(isValidTtlPrefix("")).toBeTruthy();
});

test("isValidTtlPrefix returns false for invalid prefix", () => {
  expect(isValidTtlPrefix("PREFIX p <http://two.example/")).toBeFalsy();
});

test("parseTtlPrefix correctly parses valid 1.0 prefix", () => {
  expect(
    parseTtlPrefix(
      "@prefix somePrefix: <http://www.perceive.net/schemas/relationship/> ."
    )
  ).toEqual({
    prefix: "somePrefix:",
    uri: "http://www.perceive.net/schemas/relationship/",
  });
});

test("parseTtlPrefix correctly parses valid 1.1 prefix", () => {
  expect(parseTtlPrefix("PREFIX p: <http://two.example/>")).toEqual({
    prefix: "p:",
    uri: "http://two.example/",
  });
});

test("parseTtlPrefix returns null for empty string", () => {
  expect(parseTtlPrefix("")).toBeNull();
});

test("parseTtlPrefix returns null for invalid prefix", () => {
  expect(parseTtlPrefix("PREFIX p <http://two.example/")).toBeNull();
});

test("applyPrefixesToStatement correctly applies prefixes", () => {
  expect(
    applyPrefixesToStatement("https://dbpedia.org/page/Donald_Trump", [
      {
        uri: "https://dbpedia.org/page/",
        prefix: "dbpedia:",
      },
    ])
  ).toEqual("dbpedia:Donald_Trump");
});

test("applyPrefixesToStatement applies no prefixes if no prefixes are provided", () => {
  expect(
    applyPrefixesToStatement("https://dbpedia.org/page/Donald_Trump", [])
  ).toEqual("https://dbpedia.org/page/Donald_Trump");
});

test("applyPrefixesToStatement applies no prefixes to an empty string", () => {
  expect(
    applyPrefixesToStatement("", [
      {
        uri: "https://dbpedia.org/page/",
        prefix: "dbpedia:",
      },
    ])
  ).toEqual("");
});

test("applyPrefixesToStatement applies only the first prefix in the list of prefixes", () => {
  expect(
    applyPrefixesToStatement("https://dbpedia.org/page/Donald_Trump", [
      {
        uri: "https://dbpedia.org/page/",
        prefix: "dbpedia:",
      },
      {
        uri: "https://dbpedia.org/page/",
        prefix: "wrong:",
      },
    ])
  ).toEqual("dbpedia:Donald_Trump");
});

test("resolvePrefixesInStatement correctly resolves prefixes", () => {
  expect(
    resolvePrefixesInStatement("dbpedia:Donald_Trump", [
      {
        uri: "https://dbpedia.org/page/",
        prefix: "dbpedia:",
      },
    ])
  ).toEqual("https://dbpedia.org/page/Donald_Trump");
});

test("resolvePrefixesInStatement does not resolve non-fitting prefixes", () => {
  expect(
    resolvePrefixesInStatement("dbpedia:Donald_Trump", [
      {
        uri: "https://www.wikidata.org/wiki/",
        prefix: "wd:",
      },
    ])
  ).toEqual("dbpedia:Donald_Trump");
});

test("resolvePrefixesInStatement does not resolve prefixes in empty string", () => {
  expect(
    resolvePrefixesInStatement("", [
      {
        uri: "https://www.wikidata.org/wiki/",
        prefix: "wd:",
      },
    ])
  ).toEqual("");
});

test("validateRDFPrefixes returns true for all.file.tts from prefix.cc", () => {
  expect(validateRDFPrefixes(prefixes)).toBeTruthy();
});
