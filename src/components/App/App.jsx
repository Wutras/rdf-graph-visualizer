import { useCallback, useEffect, useState } from "react";
import { Footer, Header, Main } from "..";
import { validateRDFPrefixes } from "../../helpers/rdf-utils";
import { fetchAllTriples } from "../../services/sparqlEndpoint.service";
import "./App.css";
import { defaultPrefixURL } from "../../config.json";

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
  const [nodeCapacity, setNodeCapacity] = useState(
    JSON.parse(localStorage.getItem("nodeCapacity")) ?? 10
  );
  const [usingDefaultPrefixes, setUsingDefaultPrefixes] = useState(
    JSON.parse(localStorage.getItem("usingDefaultPrefixes")) ?? true
  );
  const [simulationData, setSimulationData] = useState(undefined);
  const [showingNodeText, setShowingNodeText] = useState(JSON.parse(sessionStorage.getItem("showingNodeText")) ?? true);
  const [showingLinkText, setShowingLinkText] = useState(JSON.parse(sessionStorage.getItem("showingLinkText")) ?? true);
  const [blacklist, setBlacklist] = useState(JSON.parse(localStorage.getItem("blacklist")) ?? []);
  const [whitelist, setWhitelist] = useState(JSON.parse(localStorage.getItem("whitelist")) ?? []);

  const loadGraphData = useCallback(async () => {
    if (
      JSON.parse(localStorage.getItem("sparqlEndpoint")) !== sparqlEndpoint ||
      JSON.parse(localStorage.getItem("username")) !== username ||
      JSON.parse(localStorage.getItem("graphURI")) !== graphURI ||
      JSON.parse(sessionStorage.getItem("password")) !== password ||
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
  }, [sparqlEndpoint, password, username, graphURI, graphData]);

  async function saveSettings() {
    loadGraphData();

    localStorage.setItem("sparqlEndpoint", JSON.stringify(sparqlEndpoint));
    localStorage.setItem("username", JSON.stringify(username));
    localStorage.setItem("graphURI", JSON.stringify(graphURI));
    localStorage.setItem("prefixes", JSON.stringify(prefixes));
    localStorage.setItem(
      "usingDefaultPrefixes",
      JSON.stringify(usingDefaultPrefixes)
    );
    localStorage.setItem("blacklist", JSON.stringify(blacklist));
    localStorage.setItem("whiteList", JSON.stringify(whitelist));

    sessionStorage.setItem("password", JSON.stringify(password));
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

    simulationData.simulation.alpha(1).alphaTarget(0.1).alphaMin(0.15).velocityDecay(0.4).restart();
  }

  const validSettingsExist =
    /\/[^/]+$/.test(sparqlEndpoint) &&
    username.length > 0 &&
    password.length > 0 &&
    !Number.isNaN(nodeCapacity) &&
    validateRDFPrefixes(prefixes);

  if (!validSettingsExist && view !== "settings") setView("settings");

  useEffect(() => {
    console.log("Mounted!");
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
