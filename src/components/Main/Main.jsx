import React, { useEffect, useState } from "react";
import "./Main.css";
import { RdfGraph, SettingsView } from "..";
import { parseTtlPrefixes } from "../../helpers/rdf-utils";

export default function Main({ view, settings, graphData, setSimulationData }) {
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    if (view === "settings") setIsLoading(false);
  }, [view])

  return (
    <div className={"main" + (isLoading ? " loading" : "")}>
      {view === "settings" ? (
        <SettingsView settings={settings} />
      ) : (
        <RdfGraph
          graphData={graphData}
          prefixes={parseTtlPrefixes(settings.prefixes.value)}
          whitelist={settings.whitelist.value}
          blacklist={settings.blacklist.value}
          nodeCapacity={settings.nodeCapacity.value}
          showingNodeText={settings.showingNodeText.value}
          showingLinkText={settings.showingLinkText.value}
          setSimulationData={setSimulationData}
          setIsLoading={setIsLoading}
        />
      )}
    </div>
  );
}
