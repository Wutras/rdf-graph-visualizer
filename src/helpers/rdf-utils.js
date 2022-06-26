/*
Helper/internal functions
*/

function isValidTtlPrefix(prefix) {
  if (prefix.length === 0) return true;
  return /^(PREFIX\s+\w*:\s*<[^>]*>|@prefix\s+\w*:\s*<[^>]*>\s*\.)$/i.test(
    prefix.trim()
  );
}

function parseTtlPrefix(prefix) {
  if (prefix.length === 0) return;

  const matches = prefix
    .trim()
    .match(
      /^(PREFIX\s+(\w*:)\s*<([^>]*)>|@prefix\s+(\w*:)\s*<([^>]*)>\s*\.)$/i
    );

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
  return prefixArr.every((prefix) => isValidTtlPrefix(prefix));
}

export function parseTtlPrefixes(prefixes) {
  if (prefixes.length === 0) return [];

  const prefixArr = prefixes.split("\n");
  return prefixArr
    .map((prefix) => parseTtlPrefix(prefix))
    .filter((prefix) => !!prefix);
}

export function stringifyTtlPrefixes(prefixes) {
  let prefixString = "";
  for (const prefix of prefixes) {
    prefixString += `PREFIX ${prefix.prefix} <${prefix.uri}>\n`;
  }

  return prefixString;
}

export function getD3GraphLeafs(links) {
  return links.filter((link) =>
    links.every(
      (otherLink) =>
        otherLink === link ||
        (otherLink.source !== link.source &&
          otherLink.target !== link.source) ||
        (otherLink.source !== link.target && otherLink.target !== link.target)
    )
  );
}

export function getNumberOfLinks(node, links) {
  return {
    ...node,
    _linkCount: links.reduce(
      (prev, cur) =>
        cur.source === node.id || cur.target === node.id ? prev + 1 : prev,
      0
    ),
  };
}

export function hideNodeInNeighbour(
  neighbour,
  nodeToHide,
  originalLinks,
  originalNodes,
  rootNode
) {
  // go through nodes and find those which depend on `nodeToHide`
  let connectedNodes = [],
    newlyIsolatedNodes = [];

  for (const node of originalNodes) {
    if (
      !(
        node === neighbour ||
        node._distanceFromRoot < nodeToHide._distanceFromRoot
      ) &&
      isDependentOnNode(
        node,
        nodeToHide,
        rootNode,
        originalLinks,
        originalNodes
      )
    ) {
      newlyIsolatedNodes.push(node);
    } else {
      connectedNodes.push(node);
    }
  }

  // Collect all links of newly isolated nodes for hiding
  let connectedLinks = [],
    looseLinks = [];
  for (const link of originalLinks) {
    if (
      newlyIsolatedNodes.some(
        (node) =>
          node.id === link.source ||
          (link.source.id != null && node.id === link.source.id) ||
          node.id === link.target ||
          (link.target.id != null && node.id === link.target.id)
      )
    ) {
      looseLinks.push(link);
    } else {
      connectedLinks.push(link);
    }
  }

  neighbour._hidden = {
    nodes: [...(neighbour._hidden?.nodes ?? []), ...newlyIsolatedNodes],
    links: [...(neighbour._hidden?.links ?? []), ...looseLinks],
  };
  if (neighbour._hidden.nodes.length > 0) neighbour._isCollapsed = true;

  return { nodes: connectedNodes, links: connectedLinks };
}

function isSparqlResultOnList(result, list) {
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
  // check if any of the triple's values are on the list
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

    const isWhitelisted = isSparqlResultOnList(result, whitelist),
      isBlacklisted = isSparqlResultOnList(result, blacklist),
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

export function determineSourceNode({ nodes, preferredSourceNode }) {
  if (preferredSourceNode)
    return nodes.find((node) => node._rdfValue === preferredSourceNode);

  nodes = nodes.sort((d1, d2) => d2._linkCount - d1._linkCount);
  return nodes[0];
}

export function convertUnstructuredGraphToLayered({
  d3Graph,
  nodeCapacity,
  preferredSourceNode,
}) {
  let { nodes, links } = d3Graph;

  if (nodes.length === 0)
    return {
      nodes: [],
      links: [],
      nodeWithMostLinks: null,
      status: {
        ok: false,
        reason: "emptyGraph",
      },
    };

  const sourceNode = determineSourceNode({ nodes, preferredSourceNode });

  if (sourceNode == null)
    return {
      nodes: [],
      links: [],
      sourceNode: null,
      status: {
        ok: false,
        reason: "preferredSourceNodeNotFound",
      },
    };

  links = filterDuplicateLinks(links);

  const [originallyIsolatedNodes, rest] = filterIsolatedNodes(links, nodes);
  console.assert(nodes.length === originallyIsolatedNodes.length + rest.length);
  nodes = rest;

  // 1. Determine distance from node with most links
  let maxDistance = calculateDistance(sourceNode, nodes, links);

  // 2. Collapse nodes in groups from farthest to closest until number is smaller than cap or collapsed into root node
  while (nodes.length > nodeCapacity) {
    const linksCopy = [...links];
    // Select all nodes with a distance from root greater than the current `maxDistance`
    // and attempt to hide them
    // This works as intended because maxDistance will shrink
    // and we want want to filter out the next `maxDistance` nodes
    const nodesToHide = nodes.filter(
      (node) => node._distanceFromRoot >= maxDistance // eslint-disable-line no-loop-func
    );
    // Remove them from list of nodes
    //nodes = nodes.filter((node) => node._distanceFromRoot < maxDistance); // eslint-disable-line no-loop-func

    for (const nodeToHide of nodesToHide) {
      // find neighbour nodes the `nodeToHide` may depend on and attempt to hide it in one
      const neighbours = nodes.filter(
        (d) =>
          d._distanceFromRoot < nodeToHide._distanceFromRoot &&
          linksCopy.some(
            (link) =>
              (link.source === d.id && link.target === nodeToHide.id) ||
              (link.source === nodeToHide.id && link.target === d.id)
          )
      );

      // if node cannot be hidden due to multiple inwards connections, continue
      // Exception if `maxDistance` is 1 because then it will just be hidden in root node
      if (neighbours.length !== 1 && maxDistance > 1) {
        continue;
      }

      // hide node inside only neighbour and update graph data
      const newGraph = hideNodeInNeighbour(
        neighbours[0],
        nodeToHide,
        links,
        nodes,
        sourceNode
      );
      nodes = newGraph.nodes;
      links = newGraph.links;
    }

    maxDistance--;
  }

  // add originally isolated nodes back in
  nodes = [...nodes, ...originallyIsolatedNodes];

  return {
    nodes,
    links,
    sourceNode,
    status: { ok: true },
  };
}

// hide nodes based on distance to the node with the most links
// The nodes farthest away are hidden first and they're hidden in groups
function calculateDistance(rootNode, nodes, links) {
  let visited = [];
  let greatestDistance = 0;

  function traverse(nodeToTraverse, distance) {
    if (distance > greatestDistance) greatestDistance = distance;
    visited.push(nodeToTraverse);
    nodeToTraverse._distanceFromRoot = distance;

    // add direct unvisited neighbours
    const directNeighbours = nodes.filter(
      (node) =>
        !visited.includes(node) &&
        links.some(
          (link) =>
            (link.source === node.id && link.target === nodeToTraverse.id) ||
            (link.source === nodeToTraverse.id && link.target === node.id)
        )
    );

    // visit direct neighbours with increased distance
    for (const directNeighbour of directNeighbours) {
      traverse(directNeighbour, distance + 1);
    }
  }

  traverse(rootNode, 0);

  return greatestDistance;
}

function filterDuplicateLinks(links) {
  return links.filter(
    (link, i) =>
      links
        .slice(i + 1)
        .find(
          (otherLink) =>
            link.source === otherLink.source && link.target === otherLink.target
        ) == null
  );
}

export function filterLooseLinks(links, nodes) {
  let filtered = [],
    rest = [];
  for (const link of links) {
    if (
      nodes.find((node) => link.source === node.id || link.source === node) !=
        null &&
      nodes.find((node) => link.target === node.id || link.target === node) !=
        null
    ) {
      filtered.push(link);
    } else {
      rest.push(link);
    }
  }

  return [filtered, rest];
}

function filterIsolatedNodes(links, nodes) {
  return [
    nodes.filter((node) =>
      links.every((link) => link.source !== node.id && link.target !== node.id)
    ),
    nodes.filter((node) =>
      links.some((link) => link.source === node.id || link.target === node.id)
    ),
  ];
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

export function isDependentOnNode(
  nodeToCheck,
  nodeForComparison,
  rootNode,
  linkData,
  nodeData
) {
  // If the node to check for depedency is also the node that it may depend on,
  // return false because a node cannot depend on itself
  if (nodeToCheck === nodeForComparison) return true;
  // If the node to check for dependency is the root node, return true
  // because any node that isn't the root node (which isn't possible due to the
  // preceding condition) is dependent on the root node
  if (nodeForComparison.id === rootNode.id) return true;

  const linkedNodes = getLinkedNodes(nodeToCheck, linkData, nodeData);

  let visited = [];

  // helper function to traverse through neighbour nodes,
  // adding visited nodes to an array and checking, if there's *not* a path
  // to the root node.
  function traverse(linkedNode) {
    if (linkedNode.id === rootNode.id) return false;
    if (
      linkedNode !== nodeForComparison &&
      visited.indexOf(linkedNode) === -1
    ) {
      visited.push(linkedNode);
      return getLinkedNodes(linkedNode, linkData, nodeData).every(traverse);
    }
    return true;
  }

  // If no node is in any way connected to the root node without passing
  // through the node for comparison, it will return false, otherwise true
  return linkedNodes.every(traverse);
}

export function getLinkedNodes(originalNode, linkData, nodeData) {
  if (originalNode) {
    return (
      linkData
        // filter link list, so that only the edges remain that connect the original node with another node
        .filter(
          (edge) => edge.source === originalNode || edge.target === originalNode
        )
        // create a new list which will directly be returned containing only the nodes the original node is connected to
        .map((edge) =>
          edge.source !== originalNode ? edge.source : edge.target
        )
        .map((nodeId) =>
          nodeData.find((node) => node === nodeId || node.id === nodeId)
        )
    );
  }
}
