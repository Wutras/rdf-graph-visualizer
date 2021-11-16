import React from "react";
import { InputField } from "..";
import "./SettingsView.css";

export default function SettingsView({ settings }) {
  return (
    <div className="settings-view">
      <InputField
        prompt="SPARQL Endpoint:"
        placeholder="e.g. https://query.wikidata.org/sparql"
        onChange={(cE) => settings.sparqlEndpoint.setter(cE.target.value)}
        value={settings.sparqlEndpoint.value}
      />
      <InputField
        prompt="Username:"
        placeholder="Needed for authentication against the SPARQL endpoint"
        onChange={(cE) => settings.username.setter(cE.target.value)}
        value={settings.username.value}
      />
      <InputField
        prompt="Password:"
        placeholder="Needed for authentication against the SPARQL endpoint"
        type="password"
        onChange={(cE) => settings.password.setter(cE.target.value)}
        value={settings.password.value}
      />
      <InputField
        prompt="Graph URI:"
        placeholder="e.g. http://www.w3.org/People/Berners-Lee/card"
        onChange={(cE) => settings.graphURI.setter(cE.target.value)}
        value={settings.graphURI.value}
      />
      <InputField
        prompt="Use default prefixes:"
        type="checkbox"
        onChange={(cE) => {
          settings.usingDefaultPrefixes.setter(cE.target.checked);
          const defaultPrefixes = sessionStorage.getItem("defaultPrefixes") ?? "Default prefixes could not be loaded.";
          if (cE.target.checked === true && defaultPrefixes != null) {
            settings.prefixes.setter(defaultPrefixes);
          }
        }}
        checked={settings.usingDefaultPrefixes.value}
      />
      <InputField
        prompt="RDF Prefixes (In case of conflicts, the first prefix is used):"
        placeholder={`e.g.
PREFIX example: <http://example.com>
PREFIX oa: <http://www.w3.org/ns/openannotation/core/>`}
        type="textarea"
        onChange={(cE) => {
          settings.prefixes.setter(cE.target.value);
          settings.usingDefaultPrefixes.setter(false);
        }}
        value={settings.prefixes.value}
      />
      <InputField
        prompt="Node Capacity"
        placeholder="10"
        onChange={(cE) => settings.nodeCapacity.setter(cE.target.value)}
        value={settings.nodeCapacity.value}
      />
    </div>
  );
}
