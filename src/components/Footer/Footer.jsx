import React from "react";
import { CircularIconButton } from "..";
import "./Footer.css";
import settings_black from "../shared/images/settings_black.svg";
import save_black from "../shared/images/save_black.svg";

export default function Footer({ setView, view, validSettingsExist, saveSettings }) {
  return (
    <div className="footer">
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
