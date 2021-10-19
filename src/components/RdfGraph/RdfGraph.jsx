import React, { useEffect, useRef, useState } from "react";
import { loadGraph } from "../../helpers/loadGraph";
import "./RdfGraph.css";

function useForceUpdate() {
  const [value, setValue] = useState(0);
  return () => setValue(value + 1);
}

export default function RdfGraph({ graphData }) {
  const forceUpdate = useForceUpdate();

  function redrawGraph() {
    document.querySelector(`.hsa-rdf-graph`).innerHTML = "";
    loadGraph(graphData);
  }

  useEffect(() => {
    window.addEventListener("resize", () => {
      if (graphData != null) {
        forceUpdate();
        redrawGraph();
      }
    });
    if (graphData != null) redrawGraph();
  });

  return <svg className={"hsa-rdf-graph"} />;
}
