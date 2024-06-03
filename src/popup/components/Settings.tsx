import { useState, useEffect, ChangeEvent } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

interface Storage {
  get: (
    keys: string[],
    callback: (result: Record<string, string>) => void
  ) => void;
  set: (items: Record<string, string>, callback: () => void) => void;
}

interface Props {
  storage: Storage;
}

const Settings = ({ storage }: Props) => {
  const [apiKey, setApiKey] = useState('');
  const [modelName, setModelName] = useState('gpt-3.5-turbo-0125');
  const [isFormDirty, setIsFormDirty] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    storage.get(['apiKey', 'modelName'], result => {
      if (result.apiKey) setApiKey(result.apiKey);
      if (result.modelName) setModelName(result.modelName);
      setIsFormDirty(false);
    });
  }, [storage]);

  const handleChangeApiKey = (e: ChangeEvent<HTMLInputElement>) => {
    setApiKey(e.target.value);
    setIsFormDirty(true);
  };

  const handleChangeModelName = (e: ChangeEvent<HTMLSelectElement>) => {
    setModelName(e.target.value);
    setIsFormDirty(true);
  };

  const handleSave = () => {
    try {
      storage.set({ apiKey, modelName }, () => {
        toast.success('Settings saved');
        navigate('/');
      });
    } catch (error) {
      toast.error('Failed to save settings');
      console.error('Error saving settings:', error);
    }
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
          onChange={handleChangeApiKey}
          required
        />

        <label htmlFor="model-name">Model Name:</label>
        <select
          id="model-name"
          name="model-name"
          value={modelName}
          onChange={handleChangeModelName}
          required
        >
          <option value="gpt-4o">GPT-4o</option>
          <option value="gpt-4-turbo">GPT-4 Turbo</option>
          <option value="gpt-4">GPT-4</option>
          <option value="gpt-3.5-turbo">GPT 3.5 Turbo</option>
        </select>
        <button type="button" onClick={handleSave} disabled={!isFormDirty}>
          Save
        </button>
      </form>
    </>
  );
};

export default Settings;
export type { Storage };
