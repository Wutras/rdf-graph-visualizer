import React, { useEffect, useState } from "react";
import "./Main.css";
import { RdfGraph, SettingsView, InfoBox } from "..";
import {
  createSPOFilterListFromText,
  parseTtlPrefixes,
} from "../../helpers/rdf-utils";

export default function Main({
  view,
  settings,
  graphData,
  setSimulationData,
  setView,
  showInfo,
  infoBoxVisible,
  infoMessage,
  setInfoBoxVisible,
}) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (view === "settings") setIsLoading(false);
  }, [view]);

  return (
    <div className={"main" + (isLoading ? " loading" : "")}>
      {view === "settings" ? (
        <SettingsView settings={settings} />
      ) : (
        <RdfGraph
          graphData={graphData}
          prefixes={parseTtlPrefixes(settings.prefixes.value)}
          whitelist={createSPOFilterListFromText(settings.whitelist.value)}
          blacklist={createSPOFilterListFromText(settings.blacklist.value)}
          nodeCapacity={settings.nodeCapacity.value}
          showingNodeText={settings.showingNodeText.value}
          showingLinkText={settings.showingLinkText.value}
          usingAgnosticCollapsing={settings.usingAgnosticCollapsing.value}
          setSimulationData={setSimulationData}
          setIsLoading={setIsLoading}
          setView={setView}
          preferredSourceNode={settings.preferredSourceNode.value}
          showInfo={showInfo}
        />
      )}
      <InfoBox
        type={infoMessage?.type}
        value={infoMessage?.value}
        label={infoMessage?.label}
        info={infoMessage.info}
        prefixes={parseTtlPrefixes(settings.prefixes.value)}
        visible={infoBoxVisible}
        setVisible={setInfoBoxVisible}
      />
    </div>
  );
}
