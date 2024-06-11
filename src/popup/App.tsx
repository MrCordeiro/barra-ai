import './App.css';
import { useEffect, useState } from 'react';
import { HashRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './components/Home';
import NavBar from './components/NavBar';
import Settings from './components/Settings';
import { chromeStorage } from '../storages';

function App() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Show onboarding if apiKey is not set
  useEffect(() => {
    chromeStorage
      .get('apiKey')
      .then(result => {
        if (!result.apiKey) setShowOnboarding(true);
      })
      .catch((error: Error) => {
        console.error(`Error loading settings: ${error.message}`);
      });
  }, []);

  return (
    <Router>
      <NavBar />
      <Routes>
        <Route path="/" element={<Home />} />
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
              <Home />
            )
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
