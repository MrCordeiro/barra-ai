import './App.css';
import { useEffect, useState } from 'react';
import { HashRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './components/Home';
import NavBar from './components/NavBar';
import Settings from './components/Settings';
import LocalModelConfig from './components/LocalModelConfig';
import LocalModelGate from './components/LocalModelGate';
import { extensionStorage } from '../storages';
import { PROVIDER_API_KEYS, STORAGE_KEYS } from '../storageKeys';

function App() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Show onboarding if no API key is configured and local model is not enabled
  useEffect(() => {
    extensionStorage
      .get([
        ...PROVIDER_API_KEYS,
        STORAGE_KEYS.MODEL_NAME,
        STORAGE_KEYS.LOCAL_MODEL_CACHED,
      ])
      .then(result => {
        const localSelected =
          !!result[STORAGE_KEYS.LOCAL_MODEL_CACHED] &&
          result[STORAGE_KEYS.MODEL_NAME] ===
            result[STORAGE_KEYS.LOCAL_MODEL_CACHED];
        if (!localSelected && PROVIDER_API_KEYS.every(key => !result[key]))
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
          element={<Settings storage={extensionStorage} />}
        />
        <Route
          path="/local-model-config"
          element={<LocalModelConfig storage={extensionStorage} />}
        />
        <Route
          path="/local-model-gate"
          element={<LocalModelGate storage={extensionStorage} />}
        />
        {/* Default route */}
        <Route
          path="*"
          element={
            showOnboarding ? (
              <Settings storage={extensionStorage} showOnboarding />
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
