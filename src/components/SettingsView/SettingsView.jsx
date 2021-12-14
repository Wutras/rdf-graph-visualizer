import React from "react";
import { InputField } from "..";
import "./SettingsView.css";

export default function SettingsView({ settings }) {
  return (
    <div className="settings-view">
      <InputField
        prompt="SPARQL Endpoint:"
        placeholder="e.g. https://example.com/sparqlEndpoint/graph"
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
          const defaultPrefixes =
            sessionStorage.getItem("defaultPrefixes") ??
            "Default prefixes could not be loaded.";
          if (cE.target.checked === true && defaultPrefixes != null) {
            settings.prefixes.setter(defaultPrefixes);
          }
        }}
        checked={settings.usingDefaultPrefixes.value}
      />
      <InputField
        prompt="Show node text:"
        type="checkbox"
        onChange={(cE) => {
          settings.showingNodeText.setter(cE.target.checked);
        }}
        checked={settings.showingNodeText.value}
      />
      <InputField
        prompt="Show link text:"
        type="checkbox"
        onChange={(cE) => {
          settings.showingLinkText.setter(cE.target.checked);
        }}
        checked={settings.showingLinkText.value}
      />
      <InputField
        prompt="RDF Prefixes (In case of conflicts, the first prefix is used):"
        placeholder={`e.g.
PREFIX ex: <http://example.com/>
PREFIX oa: <http://www.w3.org/ns/openannotation/core/>`}
        type="textarea"
        onChange={(cE) => {
          settings.prefixes.setter(cE.target.value);
          settings.usingDefaultPrefixes.setter(false);
        }}
        value={settings.prefixes.value}
      />
      <InputField
        prompt="Blacklist (If one node in a triple matches, it's removed):"
        placeholder={`e.g.
URI: http://example.com/Example
URI with previously defined prefixes: ex:Example
Atomic value: ExampleValue`}
        type="textarea"
        onChange={(cE) => {
          settings.blacklist.setter(
            cE.target.value.split("\n").filter((el) => !/^\s*$/.test(el))
          );
        }}
        value={settings.blacklist.value.join("\n")}
      />
      <InputField
        prompt="Whitelist (If one node in a triple matches, it's included):"
        placeholder={`e.g.
URI: http://example.com/Example
URI with previously defined prefixes: ex:Example
Atomic value: ExampleValue`}
        type="textarea"
        onChange={(cE) => {
          settings.whitelist.setter(
            cE.target.value.split("\n").filter((el) => !/^\s*$/.test(el))
          );
        }}
        value={settings.whitelist.value.join("\n")}
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
