/*
Helper/internal functions
*/

import { getNumberOfLinks } from "./graph-utils";

export function isValidTtlPrefix(prefix) {
  if (prefix.length === 0) return true;
  return /^(PREFIX\s+\w*:\s*<[^>]*>|@prefix\s+\w*:\s*<[^>]*>\s*\.)$/i.test(
    prefix.trim()
  );
}

export function parseTtlPrefix(prefix) {
  if (prefix.length === 0) return null;

  const matches = prefix
    .trim()
    .match(
      /^(PREFIX\s+(\w*:)\s*<([^>]*)>|@prefix\s+(\w*:)\s*<([^>]*)>\s*\.)$/i
    );

  if (!matches || matches?.length < 4) return null;

  return matches[2] && matches[3]
    ? {
        prefix: matches[2],
        uri: matches[3],
      }
    : {
        prefix: matches[4],
        uri: matches[5],
      };
}

/*
Exported functions
*/

export function applyPrefixesToStatement(statement, prefixes) {
  if (typeof statement !== "string") return statement;
  let shortenedStatement = statement;
  let appliedPrefixes = new Set();
  for (const prefix of prefixes) {
    if (
      shortenedStatement === prefix.uri ||
      appliedPrefixes.has(prefix.prefix) ||
      appliedPrefixes.has(prefix.uri)
    )
      continue;

    shortenedStatement = shortenedStatement.replaceAll(
      prefix.uri,
      prefix.prefix
    );

    appliedPrefixes.add(prefix.prefix);
    appliedPrefixes.add(prefix.uri);
  }

  return shortenedStatement;
}

export function resolvePrefixesInStatement(statement, prefixes) {
  if (typeof statement !== "string" || statement.length === 0) return statement;
  let resolvedStatement = statement;
  for (const prefix of prefixes) {
    resolvedStatement = resolvedStatement.replaceAll(prefix.prefix, prefix.uri);
  }

  return resolvedStatement;
}

export function validateRDFPrefixes(prefixes) {
  if (prefixes.length === 0) return true;

  const prefixArr = prefixes.split("\n");
  return prefixArr.every(isValidTtlPrefix);
}

export function parseTtlPrefixes(prefixes) {
  if (prefixes.length === 0) return [];

  const prefixArr = prefixes.split("\n");
  return prefixArr.map(parseTtlPrefix).filter(Boolean);
}

export function stringifyTtlPrefixes(prefixes) {
  let prefixString = "";
  for (const prefix of prefixes) {
    prefixString += `PREFIX ${prefix.prefix} <${prefix.uri}>\n`;
  }

  return prefixString;
}

function isSparqlResultInList(result, list) {
  const {
    subject,
    predicate,
    object,
    prefixedSubjectValue,
    prefixedPredicateValue,
    prefixedObjectValue,
  } = result;

  // List is split into subject, predicate and object
  // Same goes for the result
  // the list goes for both prefixed and raw strings
  // check if any of the triple's values are in the list
  return (
    list.subject.some((listedString) => {
      const listedPattern = RegExp(listedString, "mi");
      return (
        listedPattern.test(subject.value) ||
        listedPattern.test(prefixedSubjectValue)
      );
    }) ||
    list.predicate.some((listedString) => {
      const listedPattern = RegExp(listedString, "mi");
      return (
        listedPattern.test(predicate.value) ||
        listedPattern.test(prefixedPredicateValue)
      );
    }) ||
    list.object.some((listedString) => {
      const listedPattern = RegExp(listedString, "mi");
      return (
        listedPattern.test(object.value) ||
        listedPattern.test(prefixedObjectValue)
      );
    })
  );
}

export function convertSparqlResultsToD3Graph({
  sparqlResults,
  whitelist,
  blacklist,
  prefixes,
  maxTextLength,
  margin,
  padding,
  nodeRadiusFactor,
}) {
  let nodes = [];
  let links = [];
  if (sparqlResults.length === 0) return { nodes, links };

  let uniqueId = 0;
  for (const { subject, predicate, object } of sparqlResults) {
    const prefixedSubjectValue = applyPrefixesToStatement(
        subject.value,
        prefixes
      ),
      prefixedPredicateValue = applyPrefixesToStatement(
        predicate.value,
        prefixes
      ),
      prefixedObjectValue = applyPrefixesToStatement(object.value, prefixes);

    const result = {
      subject,
      predicate,
      object,
      prefixedSubjectValue,
      prefixedPredicateValue,
      prefixedObjectValue,
    };

    const isWhitelisted = isSparqlResultInList(result, whitelist),
      isBlacklisted = isSparqlResultInList(result, blacklist),
      isBlacklistEmpty =
        blacklist.subject.length === 0 &&
        blacklist.predicate.length === 0 &&
        blacklist.object.length === 0,
      isWhitelistEmpty =
        whitelist.subject.length === 0 &&
        whitelist.predicate.length === 0 &&
        whitelist.object.length === 0;

    if (
      // Scenario 1: Whitelist exists, blacklist doesn't. Allow if result is whitelisted.
      (isWhitelisted && isBlacklistEmpty) ||
      // Scenario 2: Blacklist exists, whitelist doesn't. Allow if result isn't blacklisted.
      (!isBlacklisted && isWhitelistEmpty) ||
      // Scenario 3: Blacklist and whitelist both exist. Allow if result is whitelisted and not blacklisted.
      (isWhitelisted &&
        !isBlacklisted &&
        !isWhitelistEmpty &&
        !isBlacklistEmpty) ||
      // Scenario 4: Neither blacklist nor whitelist exist. Always allow result.
      (isWhitelistEmpty && isBlacklistEmpty)
    ) {
      nodes.push(
        {
          id: subject.value,
          _rdfsLabel:
            predicate.value === "http://www.w3.org/2000/01/rdf-schema#label"
              ? object.value
              : undefined,
          _foafDepiction:
            predicate.value === "http://xmlns.com/foaf/spec/#depiction"
              ? object.value
              : undefined,
          _rdfValue: applyPrefixesToStatement(subject.value, prefixes),
          _rdfType: subject.type,
          _radius:
            Math.min(
              applyPrefixesToStatement(subject.value, prefixes).length,
              maxTextLength
            ) *
              nodeRadiusFactor +
            padding +
            margin,
        },
        {
          id:
            object.type === "literal"
              ? object.value + ++uniqueId
              : object.value,
          _rdfValue: applyPrefixesToStatement(object.value, prefixes),
          _rdfType: object.type,
          _radius:
            Math.min(
              applyPrefixesToStatement(object.value, prefixes).length,
              maxTextLength
            ) *
              nodeRadiusFactor +
            padding +
            margin,
        }
      );
      links.push({
        source: subject.value,
        target:
          object.type === "literal" ? object.value + uniqueId : object.value,

        id: predicate.value,
        _rdfValue: applyPrefixesToStatement(predicate.value, prefixes),
        _rdfType: predicate.type,
      });
    }
  }

  let uniqueNodes = new Map();
  for (const node of nodes) {
    Object.keys(node).forEach((key) => node[key] == null && delete node[key]);
    uniqueNodes.set(
      node.id,
      Object.assign(uniqueNodes.get(node.id) ?? {}, node)
    );
  }
  // only leave unique nodes and save uncapped nodes and links
  nodes = [...uniqueNodes.values()].map((node) =>
    getNumberOfLinks(node, links)
  );

  return { nodes, links };
}

export function createSPOFilterListFromText(listText) {
  const list = listText.split("\n").filter((el) => !/^\s*$/.test(el));
  let spoList = {
    subject: [],
    predicate: [],
    object: [],
  };

  for (const term of list) {
    let hasNoSpecifiers = true;
    // term has shape (+s)(+p)(+o) term with order of +s+p+o being flexible
    if (/^((?<!\\)\+[po]){0,2}(?<!\\)\+s/.test(term)) {
      spoList.subject.push(term.match(/^((?<!\\)\+[spo]){1,3}(.*)$/)[2]);
      hasNoSpecifiers = false;
    }
    if (/^((?<!\\)\+[so]){0,2}(?<!\\)\+p/.test(term)) {
      spoList.predicate.push(term.match(/^((?<!\\)\+[spo]){1,3}(.*)$/)[2]);
      hasNoSpecifiers = false;
    }
    if (/^((?<!\\)\+[sp]){0,2}(?<!\\)\+o/.test(term)) {
      spoList.object.push(term.match(/^((?<!\\)\+[spo]){1,3}(.*)$/)[2]);
      hasNoSpecifiers = false;
    }

    if (hasNoSpecifiers) {
      spoList.subject.push(term);
      spoList.predicate.push(term);
      spoList.object.push(term);
    }
  }

  return {
    subject: spoList.subject.filter((term) => !/^\s*$/.test(term)),
    predicate: spoList.predicate.filter((term) => !/^\s*$/.test(term)),
    object: spoList.object.filter((term) => !/^\s*$/.test(term)),
  };
}
