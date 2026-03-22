import './App.css';
import { useEffect, useState } from 'react';
import { HashRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './components/Home';
import NavBar from './components/NavBar';
import Settings from './components/Settings';
import LocalModelConfig from './components/LocalModelConfig';
import { chromeStorage } from '../storages';
import { PROVIDER_CONFIG, PROVIDERS } from '../models';

function App() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Show onboarding if no API key is configured and local model is not enabled
  useEffect(() => {
    const apiKeyStorageKeys = PROVIDERS.map(p => PROVIDER_CONFIG[p].storageKey);
    chromeStorage
      .get([...apiKeyStorageKeys, 'localModelEnabled'])
      .then(result => {
        const localEnabled = result.localModelEnabled === 'true';
        if (!localEnabled && apiKeyStorageKeys.every(key => !result[key]))
          setShowOnboarding(true);
      })
      .catch((error: Error) => {
        console.error(`Error loading settings: ${error.message}`);
      });
  }, []);

  return (
    <Router>
      <NavBar />
      <Routes>
        <Route path="/" element={<Home hasApiKey={!showOnboarding} />} />
        <Route
          path="/settings"
          element={<Settings storage={chromeStorage} />}
        />
        <Route
          path="/local-model-config"
          element={<LocalModelConfig storage={chromeStorage} />}
        />
        {/* Default route */}
        <Route
          path="*"
          element={
            showOnboarding ? (
              <Settings storage={chromeStorage} showOnboarding />
            ) : (
              <Home hasApiKey />
            )
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
