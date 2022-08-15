import { useCallback, useEffect, useState } from "react";
import { Footer, Header, Main } from "..";
import { validateRDFPrefixes } from "../../helpers/rdf-utils";
import { fetchAllTriples } from "../../services/sparqlEndpoint.service";
import "./App.css";
import CONFIG from "../../config.json";

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
    JSON.parse(sessionStorage.getItem("nodeCapacity")) ?? 10
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
  const [usingAgnosticCollapsing, setUsingAgnosticCollapsing] = useState(
    JSON.parse(localStorage.getItem("usingAgnosticCollapsing")) ?? false
  );
  const [preferredSourceNode, setpreferredSourceNode] = useState(undefined);
  const [infoMessage, setInfoMessage] = useState("");
  const [infoBoxVisible, setInfoBoxVisible] = useState(false);

  function showInfo(info) {
    setInfoMessage(info);
    setInfoBoxVisible(true);
  }

  const loadGraphData = useCallback(async () => {
    if (
      localStorage.getItem("sparqlEndpoint") !== sparqlEndpoint ||
      localStorage.getItem("username") !== username ||
      localStorage.getItem("graphURI") !== graphURI ||
      sessionStorage.getItem("password") !== password ||
      graphData == null
    ) {
      try {
        const tripleStore = await fetchAllTriples(
          sparqlEndpoint,
          graphURI,
          username,
          password
        ).catch((error) => {
          console.debug(error);
          if (error.statusCode === 401 || error.statusCode === 403) {
            showInfo({
              info: (
                <>
                  <div>
                    Access was denied for the provided credentials. The status
                    code is {error.statusCode}.
                  </div>
                  <br />
                  <div>
                    Here are some suggestions for resolving this issue:
                    <ul>
                      <li>Verify the provided credentials are correct</li>
                      <li>Verify the address is correct: {sparqlEndpoint}</li>
                      <li>
                        Verify the database is correct:{" "}
                        {sparqlEndpoint.match(/\/([^/.]*)$/)?.[1] ?? "N. A."}
                      </li>
                      <li>
                        Verify you have permissions to access the database
                      </li>
                    </ul>
                  </div>
                </>
              ),
            });
            setView("settings");
          } else if (error.statusCode === 415 || error.statusCode === 404) {
            showInfo({
              info: (
                <>
                  <div>
                    The request could not be completed because the endpoint
                    could not be found or is not supported. If you believe the
                    endpoint should be supported, verify that the endpoint is
                    correct. The status code is {error.statusCode}.
                  </div>
                  <br />
                  <div>
                    Here are some suggestions for resolving this issue:
                    <ul>
                      <li>Verify the address is correct: {sparqlEndpoint}</li>
                      <li>
                        Verify the database is correct:{" "}
                        {sparqlEndpoint.match(/\/([^/.]*)$/)?.[1] ?? "N. A."}
                      </li>
                    </ul>
                  </div>
                </>
              ),
            });
            setView("settings");
          }
        });
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
    localStorage.setItem(
      "usingAgnosticCollapsing",
      JSON.stringify(usingAgnosticCollapsing)
    );

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
    nodeCapacity > 0 &&
    !Number.isNaN(nodeCapacity) &&
    validateRDFPrefixes(prefixes);

  if (!validSettingsExist && view !== "settings") setView("settings");

  useEffect(() => {
    loadGraphData();

    const fetchDefaultPrefixes = async () => {
      const response = await fetch(CONFIG.defaultPrefixURL);

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
          usingAgnosticCollapsing: {
            value: usingAgnosticCollapsing,
            setter: setUsingAgnosticCollapsing,
          },
          preferredSourceNode: {
            value: preferredSourceNode,
            setter: setpreferredSourceNode,
          },
        }}
        view={view}
        graphData={graphData}
        setSimulationData={setSimulationData}
        setView={setView}
        showInfo={showInfo}
        infoMessage={infoMessage}
        infoBoxVisible={infoBoxVisible}
        setInfoBoxVisible={setInfoBoxVisible}
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
