import { applyPrefixesToStatement } from "./rdf-utils";

const d3 = window.d3;

export function loadGraph(graphData, prefixes, nodeCapacity, showInfo) {
  const svg = d3.select(".hsa-rdf-graph"),
    width = document.querySelector(".hsa-rdf-graph").clientWidth,
    height = document.querySelector(".hsa-rdf-graph").clientHeight,
    padding = 0,
    margin = 0,
    maxTextLength = 32, // 32 is perfect if nodeRadiusFactor is 5
    nodeRadiusFactor = 5, // 5 is perfect for regular text
    minNodeRadius = 20,
    linkDistanceFactor = 200,
    maxOffset = 1000;

  let nodes = [];
  let links = [];

  let zoomOffset = {
    x: 0,
    y: 0,
    z: 1,
  };

  let uniqueId = 0;
  for (const { subject, predicate, object } of graphData) {
    nodes.push(
      {
        id: subject.value,
        rdfValue: applyPrefixesToStatement(subject.value, prefixes),
        rdfType: subject.type,
        radius:
          Math.min(
            applyPrefixesToStatement(subject.value, prefixes).length,
            maxTextLength
          ) *
            nodeRadiusFactor +
          padding +
          margin,
      },
      {
        id: predicate.value,
        rdfValue: applyPrefixesToStatement(predicate.value, prefixes),
        rdfType: predicate.type,
        radius:
          Math.min(
            applyPrefixesToStatement(predicate.value, prefixes).length,
            maxTextLength
          ) *
            nodeRadiusFactor +
          padding +
          margin,
      },
      {
        id:
          object.type === "literal" ? object.value + ++uniqueId : object.value,
        rdfValue: applyPrefixesToStatement(object.value, prefixes),
        rdfType: object.type,
        radius:
          Math.min(
            applyPrefixesToStatement(object.value, prefixes).length,
            maxTextLength
          ) *
            nodeRadiusFactor +
          padding +
          margin,
      }
    );
    links.push(
      {
        source: subject.value,
        target: predicate.value,
      },
      {
        source: predicate.value,
        target:
          object.type === "literal" ? object.value + uniqueId : object.value,
      }
    );
  }

  // only leave unique nodes
  nodes = [...new Map(nodes.map((o) => [o.id, o])).values()];

  // limit number of nodes
  console.log(nodes.length);
  nodes = nodes.slice(0, nodeCapacity);

  // filter out links that are now no longer connected
  links = links.filter(
    (link) =>
      nodes.find((node) => link.source === node.id) != null &&
      nodes.find((node) => link.target === node.id) != null
  );

  // add counter to nodes for all links
  nodes = nodes.map((node) => ({
    ...node,
    linkCount: links.reduce(
      (prev, cur) =>
        cur.source === node.id || cur.target === node.id ? prev + 1 : prev,
      0
    ),
  }));

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

  svg.call(
    d3.zoom().on("zoom", function () {
      zoomOffset.x = d3.event.transform.x;
      /* Math.abs(d3.event.transform.x) < maxOffset * d3.event.transform.k
          ? d3.event.transform.x
          : (maxOffset *
              d3.event.transform.k *
              Math.abs(d3.event.transform.x)) /
            d3.event.transform.x; */
      zoomOffset.y = d3.event.transform.y;
      /* Math.abs(d3.event.transform.y) < maxOffset * d3.event.transform.k
          ? d3.event.transform.y
          : (maxOffset *
              d3.event.transform.k *
              Math.abs(d3.event.transform.y)) /
            d3.event.transform.y; */
      zoomOffset.z = Math.max(d3.event.transform.k, 0.01);

      simulation.restart();
    })
  );

  const link = svg
    .append("g")
    .attr("stroke", "#999")
    .attr("stroke-width", "0.5px")
    .attr("stroke-opacity", "0.6")
    .selectAll("line")
    .data(links)
    .enter()
    .append("line")
    .attr("color", "rgb(0, 0, 0)");

  const node = svg
    .append("g")
    .attr("stroke", "#fff")
    .attr("stroke-width", "0.1px")
    .selectAll("g")
    .data(nodes)
    .enter()
    .append("g")
    .on("click", (d) => {
      showInfo({ type: d.rdfType, value: d.rdfValue });
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

  const rectangle = node
    .append("rect")
    .attr("width", (d) => d.radius - margin)
    .attr("height", (d) => d.radius - margin)
    .attr("fill", getColour);

  const drag_handler = d3
    .drag()
    .on("start", dragstarted)
    .on("drag", dragged)
    .on("end", dragended);

  drag_handler(node);

  const text = node
    .append("text")
    .text(getNodeText)
    .attr("x", (d) => (-Math.min(d.rdfValue.length, maxTextLength) * 9) / 4)
    .attr("y", (d) => d.radius / 2);

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

    link
      .attr("stroke", (d) =>
        d.target.isHighlighted ||
        d.source.isHighlighted ||
        d.target.isHighlightedFixed ||
        d.source.isHighlightedFixed
          ? "#F00"
          : "#000"
      )
      .attr("stroke-width", (d) =>
        d.target.isHighlighted ||
        d.source.isHighlighted ||
        d.target.isHighlightedFixed ||
        d.source.isHighlightedFixed
          ? "5px"
          : "0.5px"
      )
      .attr(
        "x1",
        (d) => d.source.x + (d.source.radius / 2) * zoomOffset.z + zoomOffset.x
      )
      .attr(
        "y1",
        (d) => d.source.y + (d.source.radius / 2) * zoomOffset.z + zoomOffset.y
      )
      .attr(
        "x2",
        (d) => d.target.x + (d.target.radius / 2) * zoomOffset.z + zoomOffset.x
      )
      .attr(
        "y2",
        (d) => d.target.y + (d.target.radius / 2) * zoomOffset.z + zoomOffset.y
      );

    node.attr(
      "transform",
      (d) => `translate(${d.x + zoomOffset.x},${d.y + zoomOffset.y})`
    );

    rectangle
      .attr(
        "width",
        (d) => Math.max(d.radius * zoomOffset.z, minNodeRadius) - margin
      )
      .attr(
        "height",
        (d) => Math.max(d.radius * zoomOffset.z, minNodeRadius) - margin
      );
    linkForce.distance((d) => linkDistanceFactor * zoomOffset.z);
    collisionForce.radius((d) =>
      Math.max(d.radius * zoomOffset.z, minNodeRadius)
    );
    text.text((d) => (zoomOffset.z < 0.5 ? "" : getNodeText(d)));
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
    setTimeout(() => {
      d.fx = null;
      d.fy = null;
    });
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
    if (d.rdfType === "uri") {
      return "rgb(200, 100, 100)";
    } else if (d.rdfType === "literal") {
      return "rgb(100, 200, 100)";
    } else if (d.rdfType === "bnode") {
      return "rgb(100, 100, 200)";
    }
  }
}
