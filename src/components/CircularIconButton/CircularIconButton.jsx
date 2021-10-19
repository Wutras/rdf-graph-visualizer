import React from "react";
import settings_black from "../shared/images/settings_black.svg";
import "./CircularIconButton.css";

export default function CircularIconButton({style, onClick}) {
  return (
    <div style={style} className="half-circle">
      <div className="circular-button" onClick={onClick}>
        <img className="button-icon" src={settings_black} alt="Settings" />
      </div>
    </div>
  );
}
