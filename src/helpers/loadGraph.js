import { convertSparqlResultsToD3Graph, filterLooseLinks } from "./rdf-utils";
import { nodeColours, edgeColours } from "../config.json";
import { quadtree } from "d3-quadtree";

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
}) {
  const svgElement = document.querySelector(".hsa-rdf-graph");

  //! This causes bugs sometimes in the settings view
  if (svgElement == null) return;

  // #SETTINGS
  //* The graph's configuration. Will be outsourced in a later stage.
  const svg = d3.select(".hsa-rdf-graph"),
    width = svgElement.clientWidth,
    height = svgElement.clientHeight,
    padding = 0,
    margin = 0,
    maxTextLength = 32, // 32 is perfect if nodeRadiusFactor is 5
    nodeRadiusFactor = 9, // should not go below 11 as of right now
    minNodeRadius = 20;

  let hidden = {};

  let zoomOffset = {
    x: 0,
    y: 0,
    z: 1,
  };

  const { nodes, links, allNodes, allLinks } = convertSparqlResultsToD3Graph({
    sparqlResults: graphData,
    prefixes,
    margin,
    maxTextLength,
    nodeCapacity,
    nodeRadiusFactor,
    padding,
    whitelist,
    blacklist,
  });

  let linkData = links,
    nodeData = nodes;

  // TODO: Generate dummy graph of 5 nodes with all nodes being connected

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
    .attr("stroke", "#fff")
    .attr("stroke-width", "0.1px")
    .selectAll("g")
    .data(nodeData)
    .enter()
    .append("g")
    .on("click", (d) => {
      if (isDragging) return;
      showInfo({ type: d._rdfType, value: d._rdfValue, label: d._rdfsLabel });
      toggleNode(d);
      d._isHighlightedFixed = !d._isHighlightedFixed;
    })
    .on("mouseover", (d) => {
      d._isHighlighted = true;
      if (!isDragging) updateOnce();
    })
    .on("mouseout", (d) => {
      d._isHighlighted = false;
      if (!isDragging) updateOnce();
    });

  let rectangle = node.append("rect").attr("fill", getColour);

  let nodeText = showingNodeText
    ? node.append("text").text(getNodeText)
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

  let linkLine = link.append("line").attr("color", edgeColours.line);

  let linkTextRect = showingLinkText
    ? linkTextG
        .append("rect")
        .attr("x", (d) => d._width - getNodeText(d).length)
        .attr("width", getLinkTextBoxWidth)
        .attr(
          "height",
          (d) =>
            Math.max(
              nodeRadiusFactor * zoomOffset.z + margin + padding,
              minNodeRadius
            ) - margin
        )
        .attr("fill", edgeColours.textBox)
    : undefined;

  let linkText = showingLinkText
    ? linkTextG
        .append("text")
        .text(getNodeText)
        .attr("y", minNodeRadius / 1.5)
        .attr("x", (d) => d._width - getNodeText(d).length)
    : undefined;

  //* The arrow heads indicating the direction of the edges
  svg
    .append("defs")
    .append("marker")
    .attr("id", "arrowhead")
    .attr("viewBox", "-0 -5 10 10")
    .attr("refX", 35)
    .attr("refY", 0)
    .attr("orient", "auto")
    .attr("markerWidth", 13)
    .attr("markerHeight", 13)
    .attr("xoverflow", "visible")
    .append("svg:path")
    .attr("d", "M 0,-5 L 10 ,0 L 0,5")
    .attr("fill", edgeColours.arrowHead)
    .style("stroke", "#F00");

  // #FORCES
  const linkForce = d3
    .forceLink()
    .id((d) => d.id)
    .strength(0);

  const spacing = d3
    .forceManyBody()
    .distanceMin((d) => (d._width + margin) / 2)
    .distanceMax((d) => (d._width + margin) * 1.5)
    .strength(-100);
  /* Commented out for now. Might be added back in later if deemed necessary.
     If the distribution seems good enough without it, remove this entire comment block.
    const attraction = d3
    .forceManyBody()
    .distanceMin((d) => (d._width + margin) * 2)
    .strength(50); */
  // #SIMULATION
  const simulation = d3
    .forceSimulation()
    .alphaTarget(0.1)
    .alphaMin(0.15)
    .force("link", linkForce)
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("spacing", spacing)
    //.force("attraction", attraction)
    .force("bounds", boxingForce);

  let isDragging = false;

  const zoom = d3.zoom().on("zoom", zoomed);

  svg.call(zoom);

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
    rectangle
      .attr(
        "width",
        (d) =>
          (d._width = Math.max(
            (getNodeText(d).length * zoomOffset.z + padding) * nodeRadiusFactor,
            (minNodeRadius + padding) * nodeRadiusFactor
          ))
      )
      .attr(
        "height",
        (d) =>
          (d._height = Math.max(
            nodeRadiusFactor * zoomOffset.z + padding,
            minNodeRadius
          ))
      );

    if (showingLinkText) {
      linkTextRect
        .attr(
          "width",
          (d) =>
            (d._rectWidth = Math.max(
              (getNodeText(d).length * zoomOffset.z + padding) *
                nodeRadiusFactor,
              (minNodeRadius + padding) * nodeRadiusFactor
            ))
        )
        .attr(
          "height",
          (d) =>
            (d._rectHeight =
              Math.max(nodeRadiusFactor * zoomOffset.z, minNodeRadius) +
              padding)
        );

      linkTextG
        .attr(
          "transform",
          (d) =>
            `translate(${
              ((d.target.x + d.source.x) * zoomOffset.z) / 2 + zoomOffset.x
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

      linkText
        .text((d) => getNodeText(d))
        .attr("x", (nodeRadiusFactor * padding) / 2)
        .attr("y", (d) => d._rectHeight / 1.5 + padding / 10);
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
      .attr("marker-end", (d) =>
        d.target._isHighlighted ||
        d.source._isHighlighted ||
        d.target._isHighlightedFixed ||
        d.source._isHighlightedFixed
          ? "url(#arrowhead)"
          : ""
      )
      .attr(
        "x1",
        (d) => d.source.x * zoomOffset.z + zoomOffset.x + d.source._width / 2
      )
      .attr(
        "x2",
        (d) => d.target.x * zoomOffset.z + zoomOffset.x + d.target._width / 2
      )
      .attr("y1", (d) => d.source.y * zoomOffset.z + zoomOffset.y)
      .attr("y2", (d) => d.target.y * zoomOffset.z + zoomOffset.y);

    node.attr(
      "transform",
      (d) =>
        `translate(${d.x * zoomOffset.z + zoomOffset.x},${
          d.y * zoomOffset.z + zoomOffset.y
        })`
    );

    const q = quadtree()
      .x((d) => d.x)
      .y((d) => d.y)
      .extent([
        [-1, -1],
        [width + 1, height + 1],
      ])
      .addAll(nodeData);

    nodeData.forEach((d) => q.visit(collideRect(d)));

    if (showingNodeText) {
      nodeText
        .text((d) => getNodeText(d))
        .attr("x", (nodeRadiusFactor * padding) / 2)
        .attr("y", (d) => d._height / 1.5 + (padding * zoomOffset.z) / 10);
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
    return d._rdfValue.length <= (maxTextLength * zoomOffset.z) / 1.4
      ? d._rdfValue
      : `${d._rdfValue.slice(
          0,
          Math.floor((maxTextLength * zoomOffset.z) / 1.4 / 2)
        )}...${d._rdfValue.slice(
          -Math.ceil((maxTextLength * zoomOffset.z) / 1.4 / 2)
        )}`;
  }

  function getLinkTextBoxWidth(d) {
    d._boxWidth =
      Math.max(d._rdfValue.length, minNodeRadius) * nodeRadiusFactor + padding;
    return d._boxWidth;
  }

  function getColour(d) {
    return nodeColours[d._rdfType];
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

  function collideRect(d) {
    d._x2 = (d.fx ?? d.x) + d._width;
    d._y2 = (d.fy ?? d.y) + d._height;

    const nx1 = (d.fx ?? d.x) - (padding + margin) / 2,
      nx2 = d._x2 + (padding + margin) / 2,
      ny1 = (d.fy ?? d.y) - (padding + margin) / 2,
      ny2 = d._y2 + (padding + margin) / 2;

    return function (d2, x1, y1, x2, y2) {
      if (!!d2.length) return;
      if (d2.data && d2.data !== d) {
        d2.data._x2 = (d2.data.fx ?? d2.data.x) + d2.data.width;
        d2.data._y2 = (d2.data.fy ?? d2.data.y) + d2.data.height;
        if (overlap(d2.data, d)) {
          if (Math.random() > 0.73) {
            d.y +=
              Math.min(height / 2 - d._height, height / 2 - d2.data._height) /
              8;
            d2.data.y -=
              Math.min(height / 2 - d._height, height / 2 - d2.data._height) /
              8;
          } else {
            d.x +=
              Math.min(width / 2 - d._width, width / 2 - d2.data._width) / 4;
            d2.data.x -=
              Math.min(width / 2 - d._width, width / 2 - d2.data._width) / 4;
          }
        }
      }
      return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
    };
  }

  function overlap(a, b) {
    const perSideMargin = margin / 2;
    const nax1 = a.x - perSideMargin,
      nay1 = a.y - perSideMargin,
      nax2 = a.x2 + perSideMargin,
      nay2 = a.y2 + perSideMargin,
      nbx1 = b.x - perSideMargin,
      nby1 = b.y - perSideMargin,
      nbx2 = b.x2 + perSideMargin,
      nby2 = b.y2 + perSideMargin;

    // taken from https://developer.mozilla.org/en-US/docs/Games/Techniques/2D_collision_detection @see Axis-Aligned Bounding Box
    return nax1 < nbx2 && nax2 > nbx1 && nay1 < nby2 && nay2 > nby1;
  }

  function boxingForce() {
    for (let n of nodeData) {
      n.x = Math.max(
        -width,
        Math.min((width - (n.width ?? 0)) * 2 * Math.max(1, zoomOffset.z), n.x)
      );
      n.y = Math.max(
        -height,
        Math.min(
          (height - (n.height ?? 0)) * 2 * Math.max(1, zoomOffset.z),
          n.y
        )
      );
    }
  }

  function getAllLinkedNodes(originalNode) {
    if (originalNode && !!d3.select(originalNode)) {
      return (
        linkData
          // filter link list, so that only the edges remain that connect the original node with another node
          .filter(
            (edge) =>
              edge.source === originalNode || edge.target === originalNode
          )
          // create a new list which will directly be returned containing only the nodes the original node is connected to
          .map((edge) =>
            edge.source !== originalNode ? edge.source : edge.target
          )
      );
    }
  }

  function getPartialGraphs(splitNode) {
    let visited = [];
    let neighbourNodes = getAllLinkedNodes(splitNode);
    let partialGraphs = [];

    function traverse(d) {
      function addToCurrentPartialGraph(n) {
        partialGraphs[partialGraphs.length - 1].push(n);
      }
      // already been handled; redundancy would be error-prone
      if (visited.includes(d)) return;
      visited.push(d);
      if (d === splitNode) return;
      const nextNodes = getAllLinkedNodes(d);
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
    const { partialGraphs, looseNodes } = getPartialGraphs(splitNode);
    let biggestPartialGraphIndex = 0;
    for (let gIndex = 1; gIndex < partialGraphs.length; gIndex++) {
      if (
        partialGraphs[gIndex].length >
        partialGraphs[biggestPartialGraphIndex].length
      )
        biggestPartialGraphIndex = gIndex;
    }

    const [biggestPartialGraph] = partialGraphs.splice(
      biggestPartialGraphIndex,
      1
    );
    nodeData = [...biggestPartialGraph, ...looseNodes, splitNode];
    const filterResults = filterLooseLinks(linkData, nodeData);
    linkData = filterResults[0];
    splitNode._hidden = {
      nodes: partialGraphs,
      links: filterResults[1],
    };
  }

  function toggleNode(d) {
    if (d._isCollapsed) {
      expandNode(d);
      d._isCollapsed = false;
    } else {
      hideSmallerPartialGraphs(d);
      d._isCollapsed = true;
    }
    drawGraph();
  }

  function expandNode(d) {
    nodeData = [...nodeData, ...d._hidden.nodes.flat()];
    linkData = [...d._hidden.links, ...linkData];
    d._hidden = {};
  }

  function drawGraph() {
    while (svgElement.lastChild) {
      svgElement.removeChild(svgElement.lastChild);
    }
    node.exit().remove();
    link.exit().remove();
    linkG = svg.append("g");
    nodeG = svg.append("g");
    linkTextG = svg
      .append("g")
      .selectAll("g")
      .data(linkData)
      .enter()
      .append("g");

    // #NODES
    //* The node elements and their cosmetic attachments
    node = nodeG
      .attr("stroke", "#fff")
      .attr("stroke-width", "0.1px")
      .selectAll("g")
      .data(nodeData)
      .enter()
      .append("g")
      .on("click", (d) => {
        if (isDragging) return;
        showInfo({ type: d._rdfType, value: d._rdfValue, label: d._rdfsLabel });
        toggleNode(d);
        d._isHighlightedFixed = !d._isHighlightedFixed;
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

    rectangle = node.append("rect").attr("fill", getColour);

    nodeText = showingNodeText
      ? node.append("text").text(getNodeText)
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

    linkLine = link.append("line").attr("color", edgeColours.line);

    linkTextRect = showingLinkText
      ? linkTextG
          .append("rect")
          .attr("x", (d) => d._width - getNodeText(d).length)
          .attr("width", getLinkTextBoxWidth)
          .attr(
            "height",
            (d) =>
              Math.max(
                nodeRadiusFactor * zoomOffset.z + margin + padding,
                minNodeRadius
              ) - margin
          )
          .attr("fill", edgeColours.textBox)
      : undefined;

    linkText = showingLinkText
      ? linkTextG
          .append("text")
          .text(getNodeText)
          .attr("y", minNodeRadius / 1.5)
          .attr("x", (d) => d._width - getNodeText(d).length)
      : undefined;

    //* The arrow heads indicating the direction of the edges
    svg
      .append("defs")
      .append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "-0 -5 10 10")
      .attr("refX", 35)
      .attr("refY", 0)
      .attr("orient", "auto")
      .attr("markerWidth", 13)
      .attr("markerHeight", 13)
      .attr("xoverflow", "visible")
      .append("svg:path")
      .attr("d", "M 0,-5 L 10 ,0 L 0,5")
      .attr("fill", edgeColours.arrowHead)
      .style("stroke", "#F00");

    resetSimulationParameters();
  }
}
