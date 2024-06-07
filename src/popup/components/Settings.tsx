import { useState, useEffect, ChangeEvent } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Storage } from '../../storages';

interface Props {
  storage: Storage;
}

const LLMModel = Object.freeze({
  GPT_4O: { name: 'GPT-4o', value: 'gpt-4o' },
  GPT_4_TURBO: { name: 'GPT-4 Turbo', value: 'gpt-4-turbo' },
  GPT_4: { name: 'GPT-4', value: 'gpt-4' },
  GPT_3_5_TURBO: { name: 'GPT 3.5 Turbo', value: 'gpt-3.5-turbo' },
  GPT_3_5_TURBO_0125: {
    name: 'GPT 3.5 Turbo 0125',
    value: 'gpt-3.5-turbo-0125',
  },
});

const Settings = ({ storage }: Props) => {
  const [apiKey, setApiKey] = useState('');
  const [modelName, setModelName] = useState(LLMModel.GPT_3_5_TURBO_0125.value);
  const [isFormDirty, setIsFormDirty] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    storage
      .get(['apiKey', 'modelName'])
      .then(result => {
        if (result.apiKey) setApiKey(result.apiKey);
        if (result.modelName) setModelName(result.modelName);
        setIsFormDirty(false);
      })
      .catch((error: Error) => {
        console.error(`Error loading settings: ${error.message}`);
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

  const handleSubmit = (e: ChangeEvent<HTMLFormElement>) => {
    e.preventDefault();
    storage
      .set({ apiKey, modelName })
      .then(() => {
        toast.success('Settings saved');
        navigate('/');
      })
      .catch((error: Error) => {
        toast.error('Failed to save settings');
        console.error(`Error saving settings: ${error.message}`);
      });
  };

  return (
    <>
      <h1>Settings</h1>
      <form aria-label="Settings form" onSubmit={handleSubmit}>
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
          {Object.values(LLMModel).map(model => (
            <option key={model.value} value={model.value}>
              {model.name}
            </option>
          ))}
        </select>
        <button type="submit" disabled={!isFormDirty}>
          Save
        </button>
      </form>
    </>
  );
};

export default Settings;
