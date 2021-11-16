import React from "react";
import "./InputField.css";

export default function InputField({
  prompt,
  placeholder,
  type = "text",
  onChange,
  value = "",
  defaultValue,
  checked,
}) {
  return (
    <div className="input-field">
      <label className="prompt">{prompt}</label>
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
