import {
  convertSparqlResultsToD3Graph,
} from "./rdf-utils";
import {
  filterLooseLinks,
  getLinkedNodes,
  hideNodeInNeighbour,
  convertUnstructuredGraphToLayered,
} from "./graph-utils";
import CONFIG from "../config.json";

const d3 = window.d3;

export function loadGraph({
  graphData,
  prefixes,
  nodeCapacity,
  showInfo,
  setSimulationData,
  showingNodeText,
  showingLinkText,
  blacklist,
  whitelist,
  usingAgnosticCollapsing,
  setView,
  preferredSourceNode,
}) {
  const svgElement = document.querySelector(".hsa-rdf-graph");

  //! This fixes bugs sometimes happening in the settings view
  if (svgElement == null) return;

  // #SETTINGS
  //* The graph's configuration. Will be outsourced in a later stage.
  const svg = d3.select(".hsa-rdf-graph"),
    width = svgElement.clientWidth,
    height = svgElement.clientHeight,
    padding = 0,
    margin = 0,
    maxTextLength = 32, // 32 is perfect if nodeRadiusFactor is 5
    nodeRadiusFactor = 11, // should not go below 11 as of right now
    minNodeRadius = 10;

  let zoomOffset = {
    x: 0,
    y: 0,
    z: 1,
  };

  const d3Graph = convertSparqlResultsToD3Graph({
    blacklist,
    margin,
    maxTextLength,
    nodeRadiusFactor,
    padding,
    prefixes,
    sparqlResults: graphData,
    whitelist,
  });
  let { nodes, links, sourceNode, status } = convertUnstructuredGraphToLayered({
    d3Graph,
    nodeCapacity,
    preferredSourceNode,
  });

  if (!status.ok) {
    if (status.reason === "preferredSourceNodeNotFound") {
      alert("The specified source node could not be found");
      return setView("settings");
    } else if (status.reason === "emptyGraph") {
      alert("The current configuration results in an empty graph");
      return setView("settings");
    }
  }

  let linkData = links,
    nodeData = nodes;

  // #FORCES
  let linkForce = d3
    .forceLink()
    .id((d) => d.id)
    .distance(300)
    .strength(1);
  // #SIMULATION
  let simulation = d3
    .forceSimulation()
    .force("link", linkForce)
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("x", d3.forceX().strength(-0.01))
    .force("y", d3.forceY().strength(-0.01))
    .force(
      "collide",
      d3
        .forceCollide()
        .radius((d) => d._radius)
        .iterations(30)
    )
    .force("bounds", boxingForce);

  // #CONTAINERS
  //* container groups ensuring correct rendering order and therefore correct layering
  let linkG = svg.append("g");
  let nodeG = svg.append("g");
  let linkTextG = svg
    .append("g")
    .selectAll("g")
    .data(linkData)
    .enter()
    .append("g");

  // #NODES
  //* The node elements and their cosmetic attachments
  let node = nodeG
    .append("g")
    .attr("stroke", "#fff")
    .attr("stroke-width", "0.1px")
    .attr("class", "node")
    .selectAll("g")
    .data(nodeData)
    .enter()
    .append("g")
    .on("click", (d) => {
      if (isDragging) return;
      d._isHighlightedFixed = !d._isHighlightedFixed;
    })
    .on("dblclick", toggleNode)
    .on("contextmenu", (d) => {
      d3.event.preventDefault();
      showInfo({ type: d._rdfType, value: d._rdfValue, label: d._rdfsLabel });
    })
    .on("mouseover", (d) => {
      d._isHighlighted = true;
      if (!isDragging) updateOnce();
    })
    .on("mouseout", (d) => {
      d._isHighlighted = false;
      if (!isDragging) updateOnce();
    });

  let icon = node
    .append("image")
    .attr("xlink:href", function (d) {
      if (d._foafDepiction != null) return d._foafDepiction;

      return d._rdfType === "literal"
        ? "https://fonts.gstatic.com/s/i/materialicons/description/v12/24px.svg"
        : "https://fonts.gstatic.com/s/i/materialicons/link/v21/24px.svg";
    })
    .attr("x", -25)
    .attr("y", -25)
    .attr("width", (d) => d._radius)
    .attr("height", (d) => d._radius);

  let nodeText = showingNodeText
    ? node
        .append("text")
        .attr("y", (d) => -d._radius * 1.5)
        .attr("x", (d) => -getNodeText(d).length * 3.5)
        .text(getNodeText)
    : undefined;

  // #LINKS
  //* Link elements and their cosmetic attachments
  let link = linkG
    .attr("stroke", "#999")
    .attr("stroke-width", "2px")
    .attr("stroke-opacity", "0.6")
    .selectAll("line")
    .data(linkData)
    .enter()
    .append("g");

  let linkLine = link.append("line").attr("color", CONFIG.edgeColours.line);

  if (showingLinkText) {
    linkTextG
      .append("rect")
      .attr("fill", CONFIG.edgeColours.textBox)
      .attr("width", getLinkTextBoxWidth)
      .attr("height", (d) => (d._rectHeight = 32));

    linkTextG
      .append("text")
      .text(getNodeText)
      .attr("y", (d) => 0.5 * d._rectHeight)
      .attr("x", (d) => 0.5 * d._rectWidth)
      .attr("dominant-baseline", "middle")
      .attr("text-anchor", "middle");
  }

  //* The arrow heads indicating the direction of the edges
  svg
    .append("defs")
    .append("marker")
    .attr("id", "arrowhead")
    .attr("viewBox", "-0 -5 10 10")
    .attr("refX", 30)
    .attr("refY", 0)
    .attr("orient", "auto")
    .attr("markerWidth", 7)
    .attr("markerHeight", 7)
    .attr("xoverflow", "visible")
    .append("svg:path")
    .attr("d", "M 0,-5 L 10 ,0 L 0,5")
    .attr("fill", CONFIG.edgeColours.arrowHead)
    .style("stroke", "#F00");

  let isDragging = false;

  const zoom = d3.zoom().on("zoom", zoomed);

  svg.call(zoom).on("dblclick.zoom", null);

  //* Makes the simulation available to the React components for easier communication
  setSimulationData({
    node,
    simulation,
  });

  const drag_handler = d3
    .drag()
    .on("start", dragstarted)
    .on("drag", dragged)
    .on("end", dragended);

  drag_handler(node);

  simulation.nodes(nodeData).on("tick", ticked);

  simulation.force("link").links(linkData);

  function ticked() {
    icon
      .attr(
        "width",
        (d) =>
          (d._radius = Math.max(
            50 * zoomOffset.z + padding,
            minNodeRadius + padding
          ))
      )
      .attr("height", (d) => d._radius)
      .attr("class", (d) =>
        d._isHighlighted || d._isHighlightedFixed ? "highlighted" : ""
      );

    if (showingLinkText) {
      linkTextG
        .attr(
          "transform",
          (d) =>
            `translate(${
              ((d.target.x + d.source.x) * zoomOffset.z) / 2 +
              zoomOffset.x -
              d._rectWidth / 2
            },${((d.target.y + d.source.y) * zoomOffset.z) / 2 + zoomOffset.y})`
        )
        .attr("display", (d) =>
          d.source._isHighlighted ||
          d.source._isHighlightedFixed ||
          d.target._isHighlighted ||
          d.target._isHighlightedFixed
            ? ""
            : "none"
        );
    }

    linkLine
      .attr("stroke", (d) =>
        d.target._isHighlighted ||
        d.source._isHighlighted ||
        d.target._isHighlightedFixed ||
        d.source._isHighlightedFixed
          ? "#F00"
          : "#000"
      )
      .attr("marker-end", "url(#arrowhead)")
      .attr("x1", (d) => d.source.x * zoomOffset.z + zoomOffset.x)
      .attr("x2", (d) => d.target.x * zoomOffset.z + zoomOffset.x)
      .attr("y1", (d) => d.source.y * zoomOffset.z + zoomOffset.y)
      .attr("y2", (d) => d.target.y * zoomOffset.z + zoomOffset.y);

    node.attr(
      "transform",
      (d) =>
        `translate(${d.x * zoomOffset.z + zoomOffset.x},${
          d.y * zoomOffset.z + zoomOffset.y
        })`
    );

    node
      .attr("cx", function (d) {
        d.fx = d.x;
        return d.x;
      })
      .attr("cy", function (d) {
        d.fy = d.y;
        return d.y;
      });

    if (showingNodeText) {
      nodeText
        .text((d) => getNodeText(d))
        .attr("x", (d) => -getNodeText(d).length * 3)
        .attr("y", (d) => -d._radius);
    }
  }

  function dragstarted(d) {
    isDragging = true;
    d.fx = d.x;
    d.fy = d.y;
    if (!d3.event.active) updateSmoothly();
  }

  function dragged(d) {
    d.fx = d3.event.x;
    d.fy = d3.event.y;
    if (!d3.event.active && simulation.alpha() <= simulation.alphaMin())
      updateSmoothly();
  }

  function dragended(d) {
    isDragging = false;
    if (!d3.event.active) updateOnce();
    resetSimulationParameters();
  }

  function zoomed() {
    zoomOffset.x = d3.event.transform.x;
    zoomOffset.y = d3.event.transform.y;
    zoomOffset.z = Math.max(d3.event.transform.k, 0.01);

    updateOnce();
  }

  // #HELPERS
  //* Helper functions for determining element attributes

  function getNodeText(d) {
    // TODO: instead change font size
    const labelText = d._rdfsLabel == null ? "" : ` (Label: ${d._rdfsLabel})`;
    const linkCountText =
      d._linkCount == null ? "" : ` (Link count: ${d._linkCount})`;
    return d._rdfValue?.length <= (maxTextLength * zoomOffset.z) / 1.4
      ? `${d._rdfValue}${labelText}${linkCountText}`
      : `${d._rdfValue?.slice?.(
          0,
          Math.floor((maxTextLength * zoomOffset.z) / 1.4 / 2)
        )}...${d._rdfValue?.slice?.(
          -Math.ceil((maxTextLength * zoomOffset.z) / 1.4 / 2)
        )}${labelText}${linkCountText}`;
  }

  function getLinkTextBoxWidth(d) {
    d._rectWidth =
      Math.max((d._rdfValue.length ?? 1) * nodeRadiusFactor, minNodeRadius) +
      padding;

    return d._rectWidth;
  }

  function updateOnce() {
    simulation.velocityDecay(1).restart().tick();
    simulation.velocityDecay(0.4).restart();
  }

  function updateSmoothly() {
    const moreThanMinAlph = simulation.alphaMin() + 0.1;
    simulation
      .alphaTarget(moreThanMinAlph)
      .alpha(moreThanMinAlph)
      .alphaDecay(0)
      .restart();
  }

  function resetSimulationParameters() {
    simulation
      .alphaTarget(0)
      .alphaMin(0.001)
      .alpha(0.3)
      .velocityDecay(0.4)
      .alphaDecay(1 - 0.001 ** (1 / 300))
      .restart();
  }

  function boxingForce() {
    for (let n of nodeData) {
      n.x = Math.max(
        -width,
        Math.min((width - (n._width ?? 0)) * 2 * Math.max(1, zoomOffset.z), n.x)
      );
      n.y = Math.max(
        -height,
        Math.min(
          (height - (n._height ?? 0)) * 2 * Math.max(1, zoomOffset.z),
          n.y
        )
      );
    }
  }

  function getPartialGraphs(splitNode) {
    let visited = [];
    let neighbourNodes = getLinkedNodes(splitNode, linkData, nodeData);
    let partialGraphs = [];

    function traverse(d) {
      function addToCurrentPartialGraph(n) {
        partialGraphs[partialGraphs.length - 1].push(n);
      }
      // already been handled; redundancy would be error-prone
      if (visited.includes(d)) return;
      visited.push(d);
      if (d === splitNode) return;
      const nextNodes = getLinkedNodes(d, linkData, nodeData);
      // leafs need no handling of neighbours
      if (nextNodes.length === 1) {
        addToCurrentPartialGraph(d);
        return;
      }

      if (neighbourNodes.includes(d)) {
        neighbourNodes.splice(neighbourNodes.indexOf(d), 1);
      }

      for (const nextNode of nextNodes) {
        traverse(nextNode);
      }

      addToCurrentPartialGraph(d);
    }

    while (neighbourNodes.length > 0) {
      partialGraphs.push([]);
      const [nextNode] = neighbourNodes.splice(0, 1);
      traverse(nextNode);
    }

    return {
      partialGraphs,
      looseNodes: nodeData.filter(
        (d) => !visited.includes(d) && d !== splitNode
      ),
    };
  }

  function hideSmallerPartialGraphs(splitNode) {
    let { partialGraphs, looseNodes } = getPartialGraphs(splitNode);
    let biggestPartialGraphs = [partialGraphs.splice(0, 1)];
    let smallerPartialGraphs = [];
    while (partialGraphs.length > 0) {
      if (partialGraphs[0].length > biggestPartialGraphs[0].length) {
        smallerPartialGraphs.push(...biggestPartialGraphs);
        biggestPartialGraphs = [partialGraphs.splice(0, 1)];
      } else if (partialGraphs[0].length === biggestPartialGraphs[0].length) {
        biggestPartialGraphs.push(partialGraphs.splice(0, 1));
      } else {
        smallerPartialGraphs.push(partialGraphs.splice(0, 1));
      }
    }

    if (smallerPartialGraphs.length === 0) {
      smallerPartialGraphs = biggestPartialGraphs;
      biggestPartialGraphs = [];
    }

    nodeData = [
      ...(biggestPartialGraphs.flat() ?? []),
      ...looseNodes,
      splitNode,
    ];
    const filterResults = filterLooseLinks(linkData, nodeData);
    linkData = filterResults[0];
    splitNode._hidden = {
      nodes: smallerPartialGraphs.flat(),
      links: filterResults[1],
    };
  }

  function hideDependentNodes(parentNode) {
    const linkedNodes = getLinkedNodes(parentNode, linkData, nodeData).filter(
      (linkedNode) =>
        linkedNode._distanceFromRoot > parentNode._distanceFromRoot
    );

    for (const linkedNode of linkedNodes) {
      const newGraph = hideNodeInNeighbour(
        parentNode,
        linkedNode,
        linkData,
        nodeData,
        sourceNode
      );
      nodeData = newGraph.nodes;
      linkData = newGraph.links;
    }
  }

  function toggleNode(d) {
    if (d._isCollapsed) {
      expandNode(d);
      d._isCollapsed = false;
    } else {
      if (usingAgnosticCollapsing) {
        hideSmallerPartialGraphs(d);
      } else {
        hideDependentNodes(d);
      }
      d._isCollapsed = true;
    }
    drawGraph();
  }

  function expandNode(d) {
    nodeData = [...nodeData, ...(d._hidden?.nodes?.flat() ?? [])];
    linkData = [...linkData, ...(d._hidden?.links ?? [])];
    d._hidden = {};
  }

  function drawGraph() {
    node.exit().remove();
    link.exit().remove();
    while (svgElement.lastChild) {
      svgElement.removeChild(svgElement.lastChild);
    }
    linkG = svg.append("g");
    nodeG = svg.append("g");
    linkTextG = svg
      .append("g")
      .selectAll("g")
      .data(linkData)
      .enter()
      .append("g");

    node = nodeG
      .append("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", "0.1px")
      .attr("class", "node")
      .selectAll("g")
      .data(nodeData)
      .enter()
      .append("g")
      .on("click", (d) => {
        if (isDragging) return;
        d._isHighlightedFixed = !d._isHighlightedFixed;
      })
      .on("dblclick", toggleNode)
      .on("contextmenu", (d) => {
        d3.event.preventDefault();
        showInfo({ type: d._rdfType, value: d._rdfValue, label: d._rdfsLabel });
      })
      .on("mouseover", (d) => {
        d._isHighlighted = true;
        if (!isDragging) updateOnce();
      })
      .on("mouseout", (d) => {
        d._isHighlighted = false;
        if (!isDragging) updateOnce();
      });

    drag_handler(node);

    icon = node
      .append("image")
      .attr("xlink:href", function (d) {
        if (d._foafDepiction != null) return d._foafDepiction;

        return d._rdfType === "literal"
          ? "https://fonts.gstatic.com/s/i/materialicons/description/v12/24px.svg"
          : "https://fonts.gstatic.com/s/i/materialicons/link/v21/24px.svg";
      })
      .attr("x", -25)
      .attr("y", -25)
      .attr("width", (d) => d._radius)
      .attr("height", (d) => d._radius);

    nodeText = showingNodeText
      ? node
          .append("text")
          .attr("y", (d) => -d._radius * 1.5)
          .attr("x", (d) => -getNodeText(d).length * 3.5)
          .text(getNodeText)
      : undefined;

    // #LINKS
    //* Link elements and their cosmetic attachments
    link = linkG
      .attr("stroke", "#999")
      .attr("stroke-width", "2px")
      .attr("stroke-opacity", "0.6")
      .selectAll("line")
      .data(linkData)
      .enter()
      .append("g");

    linkLine = link.append("line").attr("color", CONFIG.edgeColours.line);

    if (showingLinkText) {
      linkTextG
        .append("rect")
        .attr("fill", CONFIG.edgeColours.textBox)
        .attr("width", getLinkTextBoxWidth)
        .attr("height", (d) => (d._rectHeight = 32));

      linkTextG
        .append("text")
        .text(getNodeText)
        .attr("y", (d) => 0.5 * d._rectHeight)
        .attr("x", (d) => 0.5 * d._rectWidth)
        .attr("dominant-baseline", "middle")
        .attr("text-anchor", "middle");
    }

    //* The arrow heads indicating the direction of the edges
    svg
      .append("defs")
      .append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "-0 -5 10 10")
      .attr("refX", 30)
      .attr("refY", 0)
      .attr("orient", "auto")
      .attr("markerWidth", 7)
      .attr("markerHeight", 7)
      .attr("xoverflow", "visible")
      .append("svg:path")
      .attr("d", "M 0,-5 L 10 ,0 L 0,5")
      .attr("fill", CONFIG.edgeColours.arrowHead)
      .style("stroke", "#F00");

    simulation.nodes(nodeData);
    simulation.force("link").links(linkData);
  }
}
