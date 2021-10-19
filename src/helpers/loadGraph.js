const d3 = window.d3;

export function loadGraph(graphData) {
  const svg = d3.select(".hsa-rdf-graph"),
    width = document.querySelector(".hsa-rdf-graph").clientWidth,
    height = document.querySelector(".hsa-rdf-graph").clientHeight;

  console.log(width, height);

  const simulation = d3
    .forceSimulation()
    .force(
      "link",
      d3.forceLink().id((d) => d.id).distance(200).strength(1)
    )
    .force("charge", d3.forceManyBody())
    .force("center", d3.forceCenter(width / 2, height / 2));

  const link = svg
    .append("g")
    .attr("class", "links")
    .selectAll("line")
    .data(graphData.links)
    .enter()
    .append("line")
    .attr("stroke-wdith", 3)
    .attr("color", "rgb(0, 0, 0)");

  const node = svg
    .append("g")
    .attr("class", "nodes")
    .selectAll("g")
    .data(graphData.nodes)
    .enter()
    .append("g");

  node
    .append("circle")
    .attr("r", (d) => d.radius)
    .attr("fill", "rgb(200, 100, 200)");

  const drag_handler = d3
    .drag()
    .on("start", dragstarted)
    .on("drag", dragged)
    .on("end", dragended);

  drag_handler(node);

  node
    .append("text")
    .text((d) => d.name)
    .attr("x", 0)
    .attr("y", 0);

  node.append("title").text((d) => d.id);

  simulation.nodes(graphData.nodes).on("tick", ticked);

  simulation.force("link").links(graphData.links);

  function ticked() {
    link
      .attr("x1", (d) => d.source.x)
      .attr("y1", (d) => d.source.y)
      .attr("x2", (d) => d.target.x)
      .attr("y2", (d) => d.target.y);

    node.attr("transform", (d) => `translate(${d.x},${d.y})`);
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
    d.fx = null;
    d.fy = null;
  }
}
