import { convertSparqlResultsToD3Graph } from "./rdf-utils";
import { nodeColours } from "../config.json";

const d3 = window.d3;

export function loadGraph(
  graphData,
  prefixes,
  nodeCapacity,
  showInfo,
  setSimulationData
) {
  const svgElement = document.querySelector(".hsa-rdf-graph");

  // This causes bugs sometimes in the settings view
  if (svgElement == null) return;

  const svg = d3.select(".hsa-rdf-graph"),
    width = svgElement.clientWidth,
    height = svgElement.clientHeight,
    padding = 0,
    margin = 0,
    maxTextLength = 32, // 32 is perfect if nodeRadiusFactor is 5
    nodeRadiusFactor = 5, // 5 is perfect for regular text
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

  const arrows = svg
    .append("defs")
    .append("marker")
    .attr("id", "arrowhead")
    .attr("viewBox", "-0 -5 10 10")
    .attr("refX", 13)
    .attr("refY", 0)
    .attr("orient", "auto")
    .attr("markerWidth", 13)
    .attr("markerHeight", 13)
    .attr("xoverflow", "visible")
    .append("svg:path")
    .attr("d", "M 0,-5 L 10 ,0 L 0,5")
    .attr("fill", "#000")
    .style("stroke", "#F00");

  const linkForce = d3
    .forceLink()
    .id((d) => d.id)
    .distance(linkDistanceFactor)
    .strength(1);

  const collisionForce = d3.forceCollide().radius((d) => d.radius);

  const simulation = d3
    .forceSimulation()
    .force("link", linkForce)
    /* .force(
      "charge",
      d3.forceManyBody().distanceMin(linkDistanceFactor).distanceMax(linkDistanceFactor).strength(-1000)
    ) */
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("collision", collisionForce);

  const zoom = d3.zoom().on("zoom", zoomed);

  svg.call(zoom);

  const node = svg
    .append("g")
    .attr("stroke", "#fff")
    .attr("stroke-width", "0.1px")
    .selectAll("g")
    .data(nodes)
    .enter()
    .append("g")
    .on("click", (d) => {
      showInfo({ type: d.rdfType, value: d.rdfValue, label: d.rdfsLabel });
      d.isHighlightedFixed = !d.isHighlightedFixed;
    })
    .on("mouseover", (d) => {
      d.isHighlighted = true;
      simulation.restart();
    })
    .on("mouseout", (d) => {
      simulation.restart();
      d.isHighlighted = false;
    });

  const link = svg
    .append("g")
    .attr("stroke", "#999")
    .attr("stroke-width", "2px")
    .attr("stroke-opacity", "0.6")
    .selectAll("line")
    .data(links)
    .enter()
    .append("g");

  const linkLine = link
    .append("line")
    .attr("color", "rgb(0, 0, 0)");
    

  setSimulationData({
    node,
    simulation,
  });

  const rectangle = node
    .append("rect")
    .attr("width", (d) => d.radius - margin)
    .attr("height", nodeRadiusFactor + margin)
    .attr("fill", getColour);

  const drag_handler = d3
    .drag()
    .on("start", dragstarted)
    .on("drag", dragged)
    .on("end", dragended);

  drag_handler(node);

  const nodeText = node
    .append("text")
    .text(getNodeText)
    .attr("x", (d) => (-Math.min(d.rdfValue.length, maxTextLength) * -2) / 4)
    .attr("y", minNodeRadius / 1.5);

  const textGroup = link.append("g");

  // Background rectangle for better visibility
  textGroup
    .append("rect")
    .attr(
      "width",
      (d) =>
        Math.max(
          2 *
            (d.rdfValue.length * nodeRadiusFactor + padding + margin) *
            zoomOffset.z,
          minNodeRadius
        ) - margin
    )
    .attr(
      "height",
      (d) =>
        Math.max((nodeRadiusFactor + margin) * zoomOffset.z, minNodeRadius) -
        margin
    )
    .attr("fill", "rgb(255, 255, 255)");
  const linkText = textGroup
    .append("text")
    .text(getNodeText)
    .attr("y", minNodeRadius / 1.5)
    .attr("x", (d) => (-Math.min(d.rdfValue.length, maxTextLength) * -2) / 4);

  textGroup
    .attr("x", (d) => (-Math.min(d.rdfValue.length, maxTextLength) * 9) / 4)
    .attr("y", 0);

  node
    .append("title")
    .text(
      (d) =>
        `type: ${d.rdfType}, value: ${d.rdfValue}, linkCount: ${d.linkCount}`
    );

  simulation.nodes(nodes).on("tick", ticked);

  simulation.force("link").links(links);

  function ticked() {
    node
      .attr("x", function (d) {
        return Math.max(d.radius, Math.min(width - d.radius, d.x));
      })
      .attr("y", function (d) {
        return Math.max(d.radius, Math.min(height - d.radius, d.y));
      });

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
        : "")
      .attr(
        "x1",
        (d) => d.source.x + (d.source.radius / 2) * zoomOffset.z + zoomOffset.x
      )
      .attr("y1", (d) => d.source.y * zoomOffset.z + zoomOffset.y)
      .attr(
        "x2",
        (d) => d.target.x + (d.target.radius / 2) * zoomOffset.z + zoomOffset.x
      )
      .attr("y2", (d) => d.target.y * zoomOffset.z + zoomOffset.y);

    node.attr(
      "transform",
      (d) => `translate(${d.x + zoomOffset.x},${d.y + zoomOffset.y})`
    );

    textGroup
      .attr(
        "transform",
        (d) =>
          `translate(${(d.target.x + d.source.x) / 2},${
            (d.target.y + d.source.y) / 2
          })`
      )
      .attr("display", (d) =>
        d.source.isHighlighted ||
        d.source.isHighlightedFixed ||
        d.target.isHighlighted ||
        d.target.isHighlightedFixed
          ? ""
          : "none"
      );

    rectangle
      .attr(
        "width",
        (d) => Math.max(2 * d.radius * zoomOffset.z, minNodeRadius) - margin
      )
      .attr(
        "height",
        (d) =>
          Math.max((nodeRadiusFactor + margin) * zoomOffset.z, minNodeRadius) -
          margin
      );
    linkForce.distance((d) => linkDistanceFactor * zoomOffset.z);
    collisionForce.radius((d) =>
      Math.max(d.radius * zoomOffset.z, minNodeRadius)
    );
    nodeText.text((d) => (zoomOffset.z < 0.5 ? "" : getNodeText(d)));
    linkText.text((d) => (zoomOffset.z < 0.5 ? "" : getNodeText(d)));
  }

  function dragstarted(d) {
    if (!d3.event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  function dragged(d) {
    d.fx = d3.event.x;
    d.fy = d3.event.y;
  }

  function dragended(d) {
    if (!d3.event.active) simulation.alphaTarget(0);
    d.fx = d.x;
    d.fy = d.y;
  }

  function zoomed() {
    zoomOffset.x = d3.event.transform.x;
    zoomOffset.y = d3.event.transform.y;
    zoomOffset.z = Math.max(d3.event.transform.k, 0.01);

    simulation.restart();
  }

  function getNodeText(d) {
    return d.rdfValue.length <= maxTextLength
      ? d.rdfValue
      : `${d.rdfValue.slice(
          0,
          Math.floor(maxTextLength / 2)
        )}...${d.rdfValue.slice(-Math.ceil(maxTextLength / 2))}`;
  }

  function getColour(d) {
    return nodeColours[d.rdfType];
  }
}
