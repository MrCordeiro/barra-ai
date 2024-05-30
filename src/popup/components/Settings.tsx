import { useState, useEffect } from 'react';

interface Storage {
  get: (keys: string[], callback: (result: Record<string, string>) => void) => void;
  set: (items: Record<string, string>, callback: () => void) => void;
}

interface Props {
  storage: Storage;
}

const Settings = ({ storage }: Props) => {
  const [apiKey, setApiKey] = useState('');
  const [modelName, setModelName] = useState('gpt-3.5-turbo-0125');

  useEffect(() => {
    storage.get(['apiKey', 'modelName'], (result) => {
      if (result.apiKey) setApiKey(result.apiKey);
      if (result.modelName) setModelName(result.modelName);
    });
  }, [storage]);

  const handleSave = () => {
    storage.set({ apiKey, modelName }, () => {
      alert('Settings saved');
    });
  };

  return (
    <>
      <h1>Settings</h1>
      <form aria-label="Settings form">
        <label htmlFor="api-key">API Key:</label>
        <input
          id="api-key"
          type="password"
          name="a"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
        />

        <label htmlFor="model-name">Model Name:</label>
        <select
          id="model-name"
          name="model-name"
          value={modelName}
          onChange={e => setModelName(e.target.value)}
        >
          <option value="gpt-4o">GPT-4o</option>
          <option value="gpt-4-turbo">GPT-4 Turbo</option>
          <option value="gpt-4">GPT-4</option>
          <option value="gpt-3.5-turbo">
            GPT 3.5 Turbo
          </option>
        </select>
        <button type="button" onClick={handleSave}>
          Save
        </button>
      </form>
    </>
  );
};

export default Settings;
export type { Storage }
