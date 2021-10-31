import React, { useEffect } from "react";
import "./InfoBox.css";
import close_black from "../shared/images/close_black.svg";
import { resolvePrefixesInStatement } from "../../helpers/rdf-utils";

export default function InfoBox({
  type,
  value,
  label,
  visible,
  setVisible,
  prefixes,
}) {
  useEffect(() => {
    document.getElementById("info-box")?.focus();
  });

  const valueText =
    type === "uri" ? (
      <a
        href={resolvePrefixesInStatement(value, prefixes)}
        target="_blank"
        rel="noreferrer"
      >
        {value}
      </a>
    ) : (
      <span>{value}</span>
    );

  return visible ? (
    <div
      tabIndex={1}
      id="info-box"
      /*onBlur={(blurEvent) => blurEvent.target.id !== "info-box" && setVisible(false)
      }*/
    >
      <span
        className="circular-button active"
        onClick={() => setVisible(false)}
      >
        <img className="button-icon" src={close_black} alt={"Close"} />
      </span>
      <div>Type: {type}</div>
      <div>Value: {valueText}</div>
      {label != null && <div>Label: {label}</div>}
    </div>
  ) : null;
}
