import React from "react";
import "./CircularIconButton.css";

export default function CircularIconButton({ icon, alt, style, onClick, active=true }) {
  return (
    <div style={style} className="half-circle">
      <div className={`circular-button ${!active ? "inactive" : "active"}`} onClick={active ? onClick : null}>
        <img className="button-icon" src={icon} alt={alt} />
      </div>
    </div>
  );
}
