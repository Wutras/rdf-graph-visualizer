import React, { useCallback, useEffect, useState } from "react";
import { InfoBox } from "..";
import { loadGraph } from "../../helpers/loadGraph";
import "./RdfGraph.css";

export default function RdfGraph({
  graphData,
  prefixes,
  nodeCapacity,
  setSimulationData,
  setIsLoading,
  showingNodeText,
  showingLinkText,
  whitelist,
  blacklist,
  usingAgnosticCollapsing,
}) {
  const [infoMessage, setInfoMessage] = useState("");
  const [infoBoxVisible, setInfoBoxVisible] = useState(false);

  function showInfo(info) {
    setInfoMessage(info);
    setInfoBoxVisible(true);
  }

  const redrawGraph = useCallback(() => {
    const svg = document.querySelector(`.hsa-rdf-graph`);

    while (!!svg?.lastChild) {
      svg.removeChild(svg.lastChild);
    }

    requestAnimationFrame(() => {
      setIsLoading(true);
      requestAnimationFrame(() => {
        while (!!svg?.lastChild) {
          svg.removeChild(svg.lastChild);
        }
        loadGraph({
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
        });
        setIsLoading(false);
      });
    });
  }, [blacklist, whitelist, graphData, nodeCapacity, prefixes, showingLinkText, showingNodeText]);

  useEffect(() => {
    window.addEventListener("resize", () => {
      if (graphData != null) {
        redrawGraph();
      }
    });
  }, []);

  useEffect(() => {
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
