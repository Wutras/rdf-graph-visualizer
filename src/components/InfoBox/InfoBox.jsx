import React, { useEffect } from "react";
import "./InfoBox.css";
import close_black from "../shared/images/close_black.svg";

export default function InfoBox({ infoMessages, visible, setVisible }) {

  useEffect(() => {
      document.getElementById("info-box")?.focus();
  })

  return visible ? (
    <div tabIndex={1} id="info-box" onBlur={() => setVisible(false)}>
      <span className="circular-button active" onClick={() => setVisible(false)}>
        <img className="button-icon" src={close_black} alt={"Close"} />
      </span>
      {infoMessages.map(message => <div>{message}</div>)}
    </div>
  ) : null;
}
