import './App.css';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Home from './components/Home';
import Settings from './components/Settings';

const chromeStorage = {
  get: (
    keys: string | string[] | Record<string, string> | null,
    callback: (items: Record<string, string>) => void
  ) => chrome.storage.local.get(keys, callback),

  set: (items: Record<string, string>, callback: () => void) =>
    chrome.storage.local.set(items, callback),
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
