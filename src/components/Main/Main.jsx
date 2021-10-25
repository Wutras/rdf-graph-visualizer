import React from "react";
import "./Main.css";
import { InfoBox, RdfGraph, SettingsView } from "..";
import { parseTtlPrefixes } from "../../helpers/rdf-utils";

export default function Main({ view, settings, graphData, infoMessage }) {
  return (
    <div className="main">
      {view === "settings" ? (
        <SettingsView settings={settings} />
      ) : (
        <RdfGraph graphData={graphData} prefixes={parseTtlPrefixes(settings.prefixes.value)} nodeCapacity={settings.nodeCapacity.value} />
      )}
    </div>
  );
}
