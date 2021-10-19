import { useState } from 'react';
import { Footer, Header, Main, SettingsView } from '..';
import './App.css';

function App() {
  const [ view, setView ] = useState("main");

  return (
    <div className="app">
      <Header />
      <Main content={
        view === "settings" ?
        <SettingsView /> :
        "Nothing"
      } />
      <Footer setView={setView} view={view} />
    </div>
  );
}

export default App;
