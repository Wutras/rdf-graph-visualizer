import React from "react";
import "./InputField.css";

export default function InputField({ prompt, placeholder, type = "text", onChange, value="" }) {
  return (
    <div className="input-field">
      <label className="prompt">{prompt}</label>
      {type === "textarea" ? (
        <textarea onChange={onChange} value={value} className="text-input" placeholder={placeholder} />
      ) : (
        <input onChange={onChange} value={value} type={type} className="text-input" placeholder={placeholder} />
      )}
    </div>
  );
}
