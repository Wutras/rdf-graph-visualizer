import React from "react";
import { InfoButton } from "..";
import "./InputField.css";

export default function InputField({
  prompt,
  placeholder,
  type = "text",
  onChange,
  value = "",
  defaultValue,
  checked,
  infoText,
}) {
  return (
    <div className="input-field">
      <label className="prompt">{prompt}</label>
      {infoText != null ? <InfoButton infoText={infoText}/> : null}
      {type === "textarea" ? (
        <textarea
          onChange={onChange}
          value={value}
          className="text-input"
          placeholder={placeholder}
          defaultValue={defaultValue}
        />
      ) : (
        <input
          onChange={onChange}
          value={value}
          checked={checked}
          type={type}
          className="text-input"
          placeholder={placeholder}
          defaultValue={defaultValue}
        />
      )}
    </div>
  );
}
