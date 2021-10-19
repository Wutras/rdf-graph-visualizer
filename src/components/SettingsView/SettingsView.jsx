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
        prompt="RDF Prefixes:"
        placeholder={`e.g.
PREFIX example: <http://example.com>
PREFIX oa: <http://www.w3.org/ns/openannotation/core/>`}
        type="textarea"
        onChange={(cE) => settings.prefixes.setter(cE.target.value)}
        value={settings.prefixes.value}
      />
    </div>
  );
}
