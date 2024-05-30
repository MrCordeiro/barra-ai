import './App.css';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
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

const Home = () => {
  return (
    <>
      <h1>Raawr!! 🦖 Barrasaur is live!</h1>
      <div className="card">
        <p>
          To generate a post, type <code>/ai</code> followed by your prompt and
          press {'"'}Tab{'"'}.
        </p>
      </div>
    </>
  );
};

export default App;
