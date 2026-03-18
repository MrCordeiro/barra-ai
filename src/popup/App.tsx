import './App.css';
import { useEffect, useState } from 'react';
import { HashRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './components/Home';
import NavBar from './components/NavBar';
import Settings from './components/Settings';
import { chromeStorage } from '../storages';
import { PROVIDER_CONFIG, Provider } from '../models';

function App() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Show onboarding if no API key is configured
  useEffect(() => {
    const apiKeyStorageKeys = (Object.keys(PROVIDER_CONFIG) as Provider[]).map(
      p => PROVIDER_CONFIG[p].storageKey
    );
    chromeStorage
      .get(apiKeyStorageKeys)
      .then(result => {
        if (apiKeyStorageKeys.every(key => !result[key]))
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
