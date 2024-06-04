import './App.css';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Home from './components/Home';
import Settings from './components/Settings';

const chromeStorage = {
  get: (keys: string | string[] | Record<string, string> | null) =>
    chrome.storage.local.get(keys),
  set: (items: Record<string, string>) => chrome.storage.local.set(items),
};

function App() {
  return (
    <Router>
      <div>
        <nav>
          <ul>
            <li>
              <Link to="/">Home</Link>
            </li>
            <li>
              <Link to="/settings">Settings</Link>
            </li>
          </ul>
        </nav>
        <Toaster />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route
            path="/settings"
            element={<Settings storage={chromeStorage} />}
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
