import { useState } from "react";
import { Footer, Header, Main } from "..";
import {
  applyPrefixesToStatement,
  parseTtlPrefixes,
  validateRDFPrefixes,
} from "../../helpers/rdf-utils";
import { fetchAllTriples } from "../../services/sparqlEndpoint.service";
import "./App.css";

function App() {
  const [view, setView] = useState("main");
  const [sparqlEndpoint, setSparqlEndpoint] = useState(
    JSON.parse(localStorage.getItem("sparqlEndpoint")) ?? ""
  );
  const [username, setUsername] = useState(
    JSON.parse(localStorage.getItem("username")) ?? ""
  );
  const [password, setPassword] = useState(
    JSON.parse(sessionStorage.getItem("password")) ?? ""
  );
  const [graphURI, setGraphURI] = useState(
    JSON.parse(localStorage.getItem("graphURI")) ?? ""
  );
  const [prefixes, setPrefixes] = useState(
    JSON.parse(localStorage.getItem("prefixes")) ?? ""
  );
  const [graphData, setGraphData] = useState();

  async function saveSettings() {
    if (
      JSON.parse(localStorage.getItem("sparqlEndpoint")) !== sparqlEndpoint ||
      JSON.parse(localStorage.getItem("username")) !== username ||
      JSON.parse(sessionStorage.getItem("password")) !== password ||
      graphData == null
    ) {
      setGraphData(await fetchAllTriples(sparqlEndpoint, graphURI));
    }

    localStorage.setItem("sparqlEndpoint", JSON.stringify(sparqlEndpoint));
    localStorage.setItem("username", JSON.stringify(username));
    localStorage.setItem("graphURI", JSON.stringify(graphURI));
    localStorage.setItem("prefixes", JSON.stringify(prefixes));

    sessionStorage.setItem("password", JSON.stringify(password));
  }

  const validSettingsExist =
    sparqlEndpoint.length > 0 &&
    username.length > 0 &&
    password.length > 0 &&
    graphURI.length > 0 &&
    validateRDFPrefixes(prefixes);

  if (!validSettingsExist && view !== "settings") setView("settings");

  const formattedGraphData =
    graphData != null && validateRDFPrefixes(prefixes)
      ? {
          ...graphData,
          links: graphData.links.map((link) => {
            let formattedLink = {};
            Object.keys(link).forEach(
              (linkKey) =>
                (formattedLink[linkKey] = applyPrefixesToStatement(
                  link[linkKey],
                  parseTtlPrefixes(prefixes)
                ))
            );
            return formattedLink;
          }),
          nodes: graphData.nodes.map((node) => {
            let formattedNode = {};
            Object.keys(node).forEach(
              (nodeKey) =>
                (formattedNode[nodeKey] = applyPrefixesToStatement(
                  node[nodeKey],
                  parseTtlPrefixes(prefixes)
                ))
            );
            return formattedNode;
          }),
        }
      : null;

  return (
    <div className="app">
      <Header />
      <Main
        settings={{
          sparqlEndpoint: {
            value: sparqlEndpoint,
            setter: setSparqlEndpoint,
          },
          username: {
            value: username,
            setter: setUsername,
          },
          password: {
            value: password,
            setter: setPassword,
          },
          graphURI: {
            value: graphURI,
            setter: setGraphURI,
          },
          prefixes: {
            value: prefixes,
            setter: setPrefixes,
          },
        }}
        view={view}
        graphData={formattedGraphData}
      />
      <Footer
        setView={setView}
        view={view}
        validSettingsExist={validSettingsExist}
        saveSettings={saveSettings}
      />
    </div>
  );
}

export default App;
