import React from "react";
import "./Main.css";
import { RdfGraph, SettingsView } from "..";

export default function Main({ view, settings, graphData }) {
  return (
    <div className="main">
      {view === "settings" ? (
        <SettingsView settings={settings} />
      ) : (
        <RdfGraph graphData={graphData} />
      )}
    </div>
  );
}
