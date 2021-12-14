import { useCallback, useEffect, useState } from "react";
import { Footer, Header, Main } from "..";
import { validateRDFPrefixes } from "../../helpers/rdf-utils";
import { fetchAllTriples } from "../../services/sparqlEndpoint.service";
import "./App.css";
import { defaultPrefixURL } from "../../config.json";

function App() {
  const [view, setView] = useState("main");
  const [sparqlEndpoint, setSparqlEndpoint] = useState(
    localStorage.getItem("sparqlEndpoint") ?? ""
  );
  const [username, setUsername] = useState(
    localStorage.getItem("username") ?? ""
  );
  const [password, setPassword] = useState(
    sessionStorage.getItem("password") ?? ""
  );
  const [graphURI, setGraphURI] = useState(
    localStorage.getItem("graphURI") ?? ""
  );
  const [prefixes, setPrefixes] = useState(
    localStorage.getItem("prefixes") ?? ""
  );
  const [graphData, setGraphData] = useState();
  const [nodeCapacity, setNodeCapacity] = useState(
    JSON.parse(localStorage.getItem("nodeCapacity")) ?? 10
  );
  const [usingDefaultPrefixes, setUsingDefaultPrefixes] = useState(
    JSON.parse(localStorage.getItem("usingDefaultPrefixes")) ?? true
  );
  const [simulationData, setSimulationData] = useState(undefined);
  const [showingNodeText, setShowingNodeText] = useState(
    JSON.parse(sessionStorage.getItem("showingNodeText")) ?? true
  );
  const [showingLinkText, setShowingLinkText] = useState(
    JSON.parse(sessionStorage.getItem("showingLinkText")) ?? true
  );
  const [blacklist, setBlacklist] = useState(
    localStorage.getItem("blacklist") ?? ""
  );
  const [whitelist, setWhitelist] = useState(
    localStorage.getItem("whitelist") ?? ""
  );

  const loadGraphData = useCallback(async () => {
    if (
      localStorage.getItem("sparqlEndpoint") !== sparqlEndpoint ||
      localStorage.getItem("username") !== username ||
      localStorage.getItem("graphURI") !== graphURI ||
      localStorage.getItem("blacklist") !== blacklist ||
      localStorage.getItem("whitelist") !== whitelist ||
      sessionStorage.getItem("password") !== password ||
      graphData == null
    ) {
      try {
        const tripleStore = await fetchAllTriples(
          sparqlEndpoint,
          graphURI,
          username,
          password
        );
        setGraphData(tripleStore);
      } catch (errorMessage) {
        console.error(errorMessage);
        setView("settings");
        return;
      }
    }
  }, [
    sparqlEndpoint,
    password,
    username,
    graphURI,
    graphData,
    blacklist,
    whitelist,
  ]);

  async function saveSettings() {
    loadGraphData();

    localStorage.setItem("sparqlEndpoint", sparqlEndpoint);
    localStorage.setItem("username", username);
    localStorage.setItem("graphURI", graphURI);
    localStorage.setItem("prefixes", prefixes);
    localStorage.setItem(
      "usingDefaultPrefixes",
      JSON.stringify(usingDefaultPrefixes)
    );
    localStorage.setItem("blacklist", blacklist);
    localStorage.setItem("whitelist", whitelist);

    sessionStorage.setItem("password", password);
    sessionStorage.setItem("nodeCapacity", JSON.stringify(nodeCapacity));
    sessionStorage.setItem("showingNodeText", JSON.stringify(showingNodeText));
    sessionStorage.setItem("showingLinkText", JSON.stringify(showingLinkText));
  }

  function restartSimulation() {
    if (simulationData == null) return;

    simulationData.node.each((d) => {
      d.fx = null;
      d.fy = null;
    });

    simulationData.simulation
      .alpha(1)
      .alphaTarget(0.1)
      .alphaMin(0.15)
      .velocityDecay(0.4)
      .restart();
  }

  const validSettingsExist =
    /\/[^/]+$/.test(sparqlEndpoint) &&
    username.length > 0 &&
    password.length > 0 &&
    !Number.isNaN(nodeCapacity) &&
    validateRDFPrefixes(prefixes);

  if (!validSettingsExist && view !== "settings") setView("settings");

  useEffect(() => {
    loadGraphData();

    const fetchDefaultPrefixes = async () => {
      const response = await fetch(defaultPrefixURL);

      if (!!response?.ok && typeof response?.text === "function") {
        const defaultPrefixes = await response.text();

        if (usingDefaultPrefixes) setPrefixes(defaultPrefixes);

        sessionStorage.setItem("defaultPrefixes", defaultPrefixes);
      }
    };

    fetchDefaultPrefixes();
  }, []);

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
          nodeCapacity: {
            value: nodeCapacity,
            setter: setNodeCapacity,
          },
          usingDefaultPrefixes: {
            value: usingDefaultPrefixes,
            setter: setUsingDefaultPrefixes,
          },
          showingNodeText: {
            value: showingNodeText,
            setter: setShowingNodeText,
          },
          showingLinkText: {
            value: showingLinkText,
            setter: setShowingLinkText,
          },
          whitelist: {
            value: whitelist,
            setter: setWhitelist,
          },
          blacklist: {
            value: blacklist,
            setter: setBlacklist,
          },
        }}
        view={view}
        graphData={graphData}
        setSimulationData={setSimulationData}
      />
      <Footer
        setView={setView}
        view={view}
        validSettingsExist={validSettingsExist}
        saveSettings={saveSettings}
        restartSimulation={restartSimulation}
      />
    </div>
  );
}

export default App;
