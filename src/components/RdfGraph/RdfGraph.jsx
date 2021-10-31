import React, { useEffect, useState } from "react";
import { InfoBox } from "..";
import { loadGraph } from "../../helpers/loadGraph";
import "./RdfGraph.css";

function useForceUpdate() {
  const [value, setValue] = useState(0);
  return () => setValue(value + 1);
}

export default function RdfGraph({ graphData, prefixes, nodeCapacity }) {
  const forceUpdate = useForceUpdate();
  const [infoMessage, setInfoMessage] = useState("");
  const [infoBoxVisible, setInfoBoxVisible] = useState(false);

  function showInfo(info) {
    setInfoMessage(info);
    setInfoBoxVisible(true);
  }

  function redrawGraph() {
    document.querySelector(`.hsa-rdf-graph`).innerHTML = "";
    loadGraph(graphData, prefixes, nodeCapacity, showInfo);
  }

  useEffect(() => {
    window.addEventListener("resize", () => {
      if (graphData != null) {
        forceUpdate();
        redrawGraph();
      }
    });
    if (graphData != null) redrawGraph();
  }, [graphData]);

  return (
    <>
      <svg className={"hsa-rdf-graph"} />
      <InfoBox
        type={infoMessage?.type}
        value={infoMessage?.value}
        label={infoMessage?.label}
        prefixes={prefixes}
        visible={infoBoxVisible}
        setVisible={setInfoBoxVisible}
      />
    </>
  );
}
