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
        infoText={"Uses the top prefixes from prefix.cc"}
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
        infoText={"The node text is its value and it's shown inside the node box. Only subjects and objects are nodes."}
        type="checkbox"
        onChange={(cE) => {
          settings.showingNodeText.setter(cE.target.checked);
        }}
        checked={settings.showingNodeText.value}
      />
      <InputField
        prompt="Show link text:"
        infoText={"The link text is its value and it's shown in a box on top of the link. Only predicates are links."}
        type="checkbox"
        onChange={(cE) => {
          settings.showingLinkText.setter(cE.target.checked);
        }}
        checked={settings.showingLinkText.value}
      />
      <InputField
        prompt="RDF Prefixes (In case of conflicts, the first prefix is used):"
        infoText={"Note that these prefixes apply to the blacklist and whitelist on top of the nodes and links in the graph. If you use the default prefixes from prefix.cc, you should ensure that the prefixes mean what you expect. In case of multiple identical prefixes, only the first is used."}
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
        prompt="Blacklist:"
        infoText={"If one element in a triple matches, it's removed. Entries are separated with linebreaks. All entries are interpreted as JavaScript regular expressions. You may restrict an entry to the subject (+s), predicate (+p) and/or object (+o). Example: +s+oex:Example to blacklist 'ex:Example' in subjects and predicates. Order does not matter and you can escape these specifiers using a backslash like so: +s\\+oex:Example to blacklist +oex:Example in subjects. Previously defined prefixes can be used, however you should verify they have the intended meaning, if you're using the default prefixes."}
        placeholder={`e.g.
URI: http://example.com/Example
URI with previously defined prefixes: ex:Example
Atomic value: ExampleValue
Only subject: +sExampleValue
Escaped and only considers subjects and objects: +o+s\\+pExampleValue`}
        type="textarea"
        onChange={(cE) => {
          settings.blacklist.setter(cE.target.value);
        }}
        value={settings.blacklist.value}
      />
      <InputField
        infoText={"If no element in a triple matches, it's removed. Entries are separated with linebreaks. All entries are interpreted as JavaScript regular expressions. You may restrict an entry to the subject (+s), predicate (+p) and/or object (+o). Example: +s+oex:Example to whitelist 'ex:Example' in subjects and predicates. Order does not matter and you can escape these specifiers using a backslash like so: +s\\+oex:Example to whitelist +oex:Example in subjects. Previously defined prefixes can be used, however you should verify they have the intended meaning, if you're using the default prefixes."}
        prompt="Whitelist:"
        placeholder={`e.g.
URI: http://example.com/Example
URI with previously defined prefixes: ex:Example
Atomic value: ExampleValue
Only subject: +sExampleValue
Escaped and only considers subjects and objects: +o+s\\+pExampleValue`}
        type="textarea"
        onChange={(cE) => {
          settings.whitelist.setter(cE.target.value);
        }}
        value={settings.whitelist.value}
      />
      <InputField
        infoText={"This will collapse the graph from the node with the least to the node with the most connections, until the amount of nodes is smaller or equal than the node capacity. Therefore, the node capacity may not be the amount of nodes."}
        prompt="Node Capacity"
        placeholder="10"
        onChange={(cE) => settings.nodeCapacity.setter(cE.target.value)}
        value={settings.nodeCapacity.value}
      />
    </div>
  );
}
