import React from "react";
import { CircularIconButton, InfoBox } from "..";
import "./Footer.css";
import settings_black from "../shared/images/settings_black.svg";
import save_black from "../shared/images/save_black.svg";
import {
  parseTtlPrefixes,
  resolvePrefixesInStatement,
} from "../../helpers/rdf-utils";

export default function Footer({
  setView,
  view,
  validSettingsExist,
  saveSettings,
  simulationData,
}) {
  return (
    <div className="footer">
      {view === "main" && simulationData && (
        <span>
          <span>
            Number of fetched triples: {simulationData.graphData.length}
          </span>
          <span>Number of nodes: {simulationData.d3Graph.nodes.length}</span>
          <span>Number of links: {simulationData.d3Graph.links.length}</span>
        </span>
      )}
      {view === "settings" ? (
        <CircularIconButton
          style={{
            right: "0%",
          }}
          active={validSettingsExist}
          onClick={() => {
            setView("main");
            saveSettings();
          }}
          icon={save_black}
          alt={"Save"}
        />
      ) : (
        <CircularIconButton
          style={{
            right: "0%",
          }}
          onClick={() => setView("settings")}
          icon={settings_black}
          alt={"Settings"}
        />
      )}
    </div>
  );
}
