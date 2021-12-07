import { convertSparqlResultsToD3Graph } from "./rdf-utils";
import { nodeColours, edgeColours } from "../config.json";
import { quadtree } from "d3-quadtree";

const d3 = window.d3;

export function loadGraph(
  graphData,
  prefixes,
  nodeCapacity,
  showInfo,
  setSimulationData
) {
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
    minNodeRadius = 20,
    linkDistanceFactor = 200,
    maxOffset = 1000;

  const whitelist = [];

  let zoomOffset = {
    x: 0,
    y: 0,
    z: 1,
  };

  const { nodes, links } = convertSparqlResultsToD3Graph({
    sparqlResults: graphData,
    prefixes,
    margin,
    maxTextLength,
    nodeCapacity,
    nodeRadiusFactor,
    padding,
    whitelist,
  });

  // TODO: Generate dummy graph of 5 nodes with all nodes being connected

  // #CONTAINERS
  //* container groups ensuring correct rendering order and therefore correct layering
  const linkG = svg.append("g");
  const nodeG = svg.append("g");
  const linkTextG = svg
    .append("g")
    .selectAll("g")
    .data(links)
    .enter()
    .append("g");

  // #NODES
  //* The node elements and their cosmetic attachments
  const node = nodeG
    .attr("stroke", "#fff")
    .attr("stroke-width", "0.1px")
    .selectAll("g")
    .data(nodes)
    .enter()
    .append("g")
    .on("click", (d) => {
      if (isDragging) return;
      showInfo({ type: d.rdfType, value: d.rdfValue, label: d.rdfsLabel });
      d.isHighlightedFixed = !d.isHighlightedFixed;
    })
    .on("mouseover", (d) => {
      d.isHighlighted = true;
      if (!isDragging) updateOnce();
    })
    .on("mouseout", (d) => {
      d.isHighlighted = false;
      if (!isDragging) updateOnce();
    });

  const rectangle = node.append("rect").attr("fill", getColour);

  const nodeText = node.append("text").text(getNodeText);

  node
    .append("title")
    .text(
      (d) =>
        `type: ${d.rdfType}, value: ${d.rdfValue}, linkCount: ${d.linkCount}`
    );

  // #LINKS
  //* Link elements and their cosmetic attachments
  const link = linkG
    .attr("stroke", "#999")
    .attr("stroke-width", "2px")
    .attr("stroke-opacity", "0.6")
    .selectAll("line")
    .data(links)
    .enter()
    .append("g");

  const linkLine = link.append("line").attr("color", edgeColours.line);

  const linkTextRect = linkTextG
    .append("rect")
    .attr("x", (d) => d.width - getNodeText(d).length)
    .attr("width", getLinkTextBoxWidth)
    .attr(
      "height",
      (d) =>
        Math.max(
          nodeRadiusFactor * zoomOffset.z + margin + padding,
          minNodeRadius
        ) - margin
    )
    .attr("fill", edgeColours.textBox);

  const linkText = linkTextG
    .append("text")
    .text(getNodeText)
    .attr("y", minNodeRadius / 1.5)
    .attr("x", (d) => d.width - getNodeText(d).length);

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
    .distanceMin((d) => (d.width + margin) / 2)
    .distanceMax((d) => (d.width + margin) * 1.5)
    .strength(-100);
  const attraction = d3
    .forceManyBody()
    .distanceMin((d) => (d.width + margin) * 2)
    .strength(50);
  // #SIMULATION
  const simulation = d3
    .forceSimulation()
    .alphaTarget(0.1)
    .alphaMin(0.15)
    .force("link", linkForce)
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("spacing", spacing)
    .force("attraction", attraction);

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

  simulation.nodes(nodes).on("tick", ticked);

  simulation.force("link").links(links);

  function ticked() {
    rectangle
      .attr(
        "width",
        (d) =>
          (d.width = Math.max(
            (getNodeText(d).length * zoomOffset.z + padding) * nodeRadiusFactor,
            (minNodeRadius + padding) * nodeRadiusFactor
          ))
      )
      .attr(
        "height",
        (d) =>
          (d.height = Math.max(
            nodeRadiusFactor * zoomOffset.z + padding,
            minNodeRadius
          ))
      );

    linkTextRect
      .attr("width", (d) => d.rectWidth = (getNodeText(d).length + padding) * nodeRadiusFactor)
      .attr(
        "height",
        d => d.rectHeight = Math.max(nodeRadiusFactor * zoomOffset.z, minNodeRadius) + padding
      );

    linkLine
      .attr("stroke", (d) =>
        d.target.isHighlighted ||
        d.source.isHighlighted ||
        d.target.isHighlightedFixed ||
        d.source.isHighlightedFixed
          ? "#F00"
          : "#000"
      )
      .attr("marker-end", (d) =>
        d.target.isHighlighted ||
        d.source.isHighlighted ||
        d.target.isHighlightedFixed ||
        d.source.isHighlightedFixed
          ? "url(#arrowhead)"
          : ""
      )
      .attr(
        "x1",
        (d) => d.source.x * zoomOffset.z + zoomOffset.x + d.source.width / 2
      )
      .attr(
        "x2",
        (d) => d.target.x * zoomOffset.z + zoomOffset.x + d.target.width / 2
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

    linkTextG
      .attr(
        "transform",
        (d) =>
          `translate(${
            ((d.target.x + d.source.x) * zoomOffset.z + zoomOffset.x) / 2
          },${((d.target.y + d.source.y) * zoomOffset.z + zoomOffset.y) / 2})`
      )
      .attr("display", (d) =>
        d.source.isHighlighted ||
        d.source.isHighlightedFixed ||
        d.target.isHighlighted ||
        d.target.isHighlightedFixed
          ? ""
          : "none"
      );

    const q = quadtree()
      .x((d) => d.x)
      .y((d) => d.y)
      .extent([
        [-1, -1],
        [width + 1, height + 1],
      ])
      .addAll(nodes);

    nodes.forEach((d) => q.visit(collideRect(d)));
    nodeText
      .text((d) => (zoomOffset.z < 0.5 ? "" : getNodeText(d)))
      .attr("x", nodeRadiusFactor * padding / 2)
      .attr("y", (d) => d.height / 1.5 + (padding * zoomOffset.z) / 10);
    linkText
      .text((d) => (zoomOffset.z < 0.5 ? "" : getNodeText(d)))
      .attr("x", nodeRadiusFactor * padding / 2)
      .attr("y", d => d.rectHeight / 1.5 + padding / 10);
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
    resetSimulationParemeters();
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
    return d.rdfValue.length <= maxTextLength * zoomOffset.z
      ? d.rdfValue
      : `${d.rdfValue.slice(
          0,
          Math.floor((maxTextLength * zoomOffset.z) / 2)
        )}...${d.rdfValue.slice(
          -Math.ceil((maxTextLength * zoomOffset.z) / 2)
        )}`;
  }

  function getLinkTextBoxWidth(d) {
    d.boxWidth =
      Math.max(d.rdfValue.length, minNodeRadius) * nodeRadiusFactor + padding;
    return d.boxWidth;
  }

  function getColour(d) {
    return nodeColours[d.rdfType];
  }

  function updateOnce() {
    console.debug("once");
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

  function resetSimulationParemeters() {
    simulation
      .alphaTarget(0)
      .alphaMin(0.001)
      .alpha(0.3)
      .velocityDecay(0.4)
      .alphaDecay(1 - 0.001 ** (1 / 300))
      .restart();
  }

  function collideRect(d) {
    d.x2 = (d.fx ?? d.x) + d.width;
    d.y2 = (d.fy ?? d.y) + d.height;

    const nx1 = (d.fx ?? d.x) - (padding + margin) / 2,
      nx2 = d.x2 + (padding + margin) / 2,
      ny1 = (d.fy ?? d.y) - (padding + margin) / 2,
      ny2 = d.y2 + (padding + margin) / 2;

    return function (d2, x1, y1, x2, y2) {
      if (!!d2.length) return;
      let dy;
      if (d2.data && d2.data !== d) {
        d2.data.x2 = (d2.data.fx ?? d2.data.x) + d2.data.width;
        d2.data.y2 = (d2.data.fy ?? d2.data.y) + d2.data.height;
        //console.log({d: {...d}, d2: {...d2.data}});
        if (overlap(d2.data, d)) {
          if (Math.random() > 0.75) {
            d.y +=
              Math.min(height / 2 - d.height, height / 2 - d2.data.height) / 8;
            d2.data.y -=
              Math.min(height / 2 - d.height, height / 2 - d2.data.height) / 8;
          } else {
            d.x += Math.min(width / 2 - d.width, width / 2 - d2.data.width) / 4;
            d2.data.x -=
              Math.min(width / 2 - d.width, width / 2 - d2.data.width) / 4;
          }
        } else {
          d.isHighlighted = d2.data.isHighlighted = false;
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
}
