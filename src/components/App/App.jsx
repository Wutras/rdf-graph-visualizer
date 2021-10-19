import { useState } from "react";
import { Footer, Header, Main, SettingsView } from "..";
import { validateRDFPrefixes } from "../../helpers/rdf-utils";
import "./App.css";

function App() {
  const [view, setView] = useState("main");
  const [sparqlEndpoint, setSparqlEndpoint] = useState(
    JSON.parse(localStorage.getItem("sparqlEndpoint")) ?? ""
  );
  const [username, setUsername] = useState(
    JSON.parse(localStorage.getItem("username")) ?? ""
  );
  const [password, setPassword] = useState("");
  const [graphURI, setGraphURI] = useState(
    JSON.parse(localStorage.getItem("graphURI")) ?? ""
  );
  const [prefixes, setPrefixes] = useState(
    JSON.parse(localStorage.getItem("prefixes")) ?? ""
  );

  function saveSettings() {
    localStorage.setItem("sparqlEndpoint", JSON.stringify(sparqlEndpoint));
    localStorage.setItem("username", JSON.stringify(username));
    localStorage.setItem("graphURI", JSON.stringify(graphURI));
    localStorage.setItem("prefixes", JSON.stringify(prefixes));
    
  }

  const validSettingsExist =
    sparqlEndpoint.length > 0 &&
    username.length > 0 &&
    password.length > 0 &&
    graphURI.length > 0 &&
    validateRDFPrefixes(prefixes);

    if (!validSettingsExist && view !== "settings") setView("settings");

  return (
    <div className="app">
      <Header />
      <Main
        content={
          view === "settings" ? (
            <SettingsView
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
            />
          ) : (
            "Nothing"
          )
        }
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
