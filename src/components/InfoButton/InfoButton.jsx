import React from "react";
import { CircularIconButton } from "..";
import info_black from "../shared/images/info_black.svg";
import "./InfoButton.css";

export default function InfoButton({ infoText }) {
  return (
    <div className="info-button" title={infoText}>
      <CircularIconButton
        alt="Information"
        icon={info_black}
        onClick={() => console.log("Hi")}
      />
    </div>
  );
}
