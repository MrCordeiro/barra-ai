import { useState, useEffect, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Heading, Text, useToast } from '@chakra-ui/react';
import {
  DEFAULT_LLM_MODEL,
  LLM_MODEL_OPTIONS,
  PROVIDER_CONFIG,
  PROVIDERS,
  Provider,
  getProviderForModel,
} from '../../models';
import { Storage } from '../../storages';
import {
  DEFAULT_OLLAMA_ENDPOINT,
  OllamaModelAvailability,
  OllamaStatus,
} from '../../content/ollama';
import { ModelSelectField } from './ModelSelectField';
import { ApiKeyField } from './ApiKeyField';

interface OllamaSettings {
  endpoint: string; // '' = not configured
  noticeShown: boolean;
}

interface SettingsState {
  apiKeys: Record<Provider, string>;
  modelName: string;
  ollama: OllamaSettings;
}

const defaultSettings: SettingsState = {
  apiKeys: Object.fromEntries(PROVIDERS.map(p => [p, ''])) as Record<
    Provider,
    string
  >,
  modelName: DEFAULT_LLM_MODEL.value,
  ollama: { endpoint: '', noticeShown: false },
};

interface Props {
  storage: Storage;
  showOnboarding?: boolean;
}

async function checkOllamaConn(
  endpoint: string
): Promise<OllamaModelAvailability> {
  const status: OllamaModelAvailability = await chrome.runtime.sendMessage({
    type: 'ollama:check',
    endpoint,
  });
  return status;
}

const cloudModelValues = new Set<string>(
  LLM_MODEL_OPTIONS.map(model => model.value)
);

const Settings = ({ storage, showOnboarding = false }: Props) => {
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [localConnStatus, setLocalConnStatus] =
    useState<OllamaModelAvailability | null>(null);

  const toast = useToast();
  const navigate = useNavigate();

  const activeModelIsCloud = cloudModelValues.has(settings.modelName);

  const refreshOllamaStatus = (endpoint: string) => {
    setLocalConnStatus(null);
    checkOllamaConn(endpoint)
      .then(status => setLocalConnStatus(status))
      .catch(() => setLocalConnStatus({ status: OllamaStatus.NotRunning }));
  };

  useEffect(
    function loadSettings() {
      const storageKeys = PROVIDERS.map(p => PROVIDER_CONFIG[p].storageKey);
      storage
        .get([
          ...storageKeys,
          'modelName',
          'localModelEndpoint',
          'ollamaNoticeShown',
        ])
        .then(result => {
          const normalizedApiKeys = Object.fromEntries(
            PROVIDERS.map(p => [p, result[PROVIDER_CONFIG[p].storageKey] ?? ''])
          ) as Record<Provider, string>;

          const ollamaEndpoint = result.localModelEndpoint || '';

          setSettings({
            apiKeys: normalizedApiKeys,
            modelName: result.modelName || defaultSettings.modelName,
            ollama: {
              endpoint: ollamaEndpoint,
              noticeShown: result.ollamaNoticeShown === 'true',
            },
          });
          setIsFormDirty(false);

          refreshOllamaStatus(ollamaEndpoint || DEFAULT_OLLAMA_ENDPOINT);
        })
        .catch((error: Error) => {
          console.error(`Error loading settings: ${error.message}`);
        });
    },
    [storage]
  );

  const isLocalModelStale = (
    connStatus: OllamaModelAvailability | null,
    modelName: string
  ) => {
    if (connStatus?.status !== OllamaStatus.Connected) return false;
    if (!modelName) return false;
    return !connStatus.models.includes(modelName);
  };

  useEffect(
    function ensureLocalModelIsValid() {
      if (activeModelIsCloud) return;
      if (!isLocalModelStale(localConnStatus, settings.modelName)) return;

      // The active local model is no longer available in Ollama.
      setSettings(prev => ({ ...prev, modelName: DEFAULT_LLM_MODEL.value }));
      storage
        .set({ modelName: DEFAULT_LLM_MODEL.value, localModelName: '' })
        .catch((error: Error) => {
          console.error(`Error updating stale local model: ${error.message}`);
        });
    },
    [localConnStatus, settings.modelName, storage, activeModelIsCloud]
  );

  const handleApiKeyChange =
    (provider: Provider) => (e: ChangeEvent<HTMLInputElement>) => {
      setSettings(prev => ({
        ...prev,
        apiKeys: { ...prev.apiKeys, [provider]: e.target.value },
      }));
      setIsFormDirty(true);
    };

  const persistSelectedModel = (
    modelName: string,
    selectedLocalModel?: string
  ) => {
    const payload: Record<string, string> = {
      modelName,
      localModelEndpoint: settings.ollama.endpoint || DEFAULT_OLLAMA_ENDPOINT,
    };

    if (selectedLocalModel) {
      payload.localModelName = selectedLocalModel;
    }

    storage.set(payload).catch((error: Error) => {
      console.error(`Error saving selected model: ${error.message}`);
    });
  };

  const handleModelChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const nextModel = e.target.value;

    if (!nextModel || nextModel.startsWith('__')) return;

    const isCloudModel = cloudModelValues.has(nextModel);

    if (isCloudModel) {
      setSettings(prev => ({ ...prev, modelName: nextModel }));
      persistSelectedModel(nextModel);
      return;
    }

    // Selecting a local model requires local setup first.
    if (!settings.ollama.endpoint) {
      navigate('/local-model-config');
      return;
    }

    setSettings(prev => ({ ...prev, modelName: nextModel }));
    persistSelectedModel(nextModel, nextModel);

    if (!settings.ollama.noticeShown) {
      toast({
        status: 'info',
        title:
          'Runs on your machine via Ollama. May be slower or less accurate.',
        variant: 'top-accent',
        isClosable: true,
        duration: 5000,
      });
      setSettings(prev => ({
        ...prev,
        ollama: { ...prev.ollama, noticeShown: true },
      }));
      storage.set({ ollamaNoticeShown: 'true' }).catch((error: Error) => {
        console.error(`Error saving Ollama notice state: ${error.message}`);
      });
    }
  };

  const saveSettings = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const storageData: Record<string, string> = {};
    PROVIDERS.forEach(p => {
      storageData[PROVIDER_CONFIG[p].storageKey] = settings.apiKeys[p];
    });

    storage
      .set(storageData)
      .then(() => {
        toast({
          status: 'success',
          title: 'Settings saved! 🎉',
          variant: 'top-accent',
        });
        navigate('/');
      })
      .catch((error: Error) => {
        toast({
          status: 'error',
          title: 'Failed to save settings 😢',
          variant: 'top-accent',
        });
        console.error(`Error saving settings: ${error.message}`);
      });
  };

  const selectedProvider = activeModelIsCloud
    ? getProviderForModel(settings.modelName)
    : null;

  return (
    <>
      {showOnboarding ? (
        <Box>
          <Heading mb={4} as="h1" textAlign={'center'}>
            Welcome!
          </Heading>
          <Text fontSize="md">
            You will need an API key for your chosen AI provider to get started.
          </Text>
        </Box>
      ) : (
        <Heading mb={4} as="h1" textAlign={'center'}>
          Settings
        </Heading>
      )}

      <form aria-label="Settings form" onSubmit={saveSettings}>
        <ModelSelectField
          modelName={settings.modelName}
          localConnStatus={localConnStatus}
          onModelChange={handleModelChange}
          onConfigureLocalModel={() => navigate('/local-model-config')}
        />

        {selectedProvider && (
          <ApiKeyField
            provider={selectedProvider}
            value={settings.apiKeys[selectedProvider]}
            showOnboarding={showOnboarding}
            onChange={handleApiKeyChange(selectedProvider)}
          />
        )}

        <Button
          type="submit"
          colorScheme="green"
          isDisabled={!isFormDirty}
          mt={6}
          w="100%"
        >
          Save
        </Button>
      </form>
    </>
  );
};

export default Settings;
