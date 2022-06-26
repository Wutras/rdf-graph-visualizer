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
  if (originalNodes.length === 1)
    return { nodes: originalNodes, links: originalLinks };
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
