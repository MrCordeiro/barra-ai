import { useState, useEffect, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  FormControl,
  FormHelperText,
  FormLabel,
  Heading,
  Input,
  InputGroup,
  InputRightElement,
  Link,
  Text,
  useToast,
} from '@chakra-ui/react';
import { ExternalLinkIcon } from '@chakra-ui/icons';
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
  OllamaConnectionStatus,
  OllamaStatus,
} from '../../content/ollama';
import { ModelSelectField } from './ModelSelectField';

interface OllamaSettings {
  endpoint: string; // '' = not configured
  modelName: string;
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
  ollama: { endpoint: '', modelName: '', noticeShown: false },
};

interface Props {
  storage: Storage;
  showOnboarding?: boolean;
}

async function checkOllamaConn(
  endpoint: string
): Promise<OllamaConnectionStatus> {
  const status: OllamaConnectionStatus = await chrome.runtime.sendMessage({
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
  const [showKeys, setShowKeys] = useState(false);
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [localConnStatus, setLocalConnStatus] =
    useState<OllamaConnectionStatus | null>(null);

  const toast = useToast();
  const navigate = useNavigate();

  const refreshOllamaStatus = (endpoint: string) => {
    setLocalConnStatus(null);
    checkOllamaConn(endpoint)
      .then(status => setLocalConnStatus(status))
      .catch(() => setLocalConnStatus({ type: OllamaStatus.NotRunning }));
  };

  useEffect(
    function loadSettings() {
      const storageKeys = PROVIDERS.map(p => PROVIDER_CONFIG[p].storageKey);
      storage
        .get([
          ...storageKeys,
          'modelName',
          'localModelEndpoint',
          'localModelName',
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
              modelName: result.localModelName || '',
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
    connStatus: OllamaConnectionStatus | null,
    modelName: string
  ) => {
    if (connStatus?.type !== OllamaStatus.Connected) return false;
    if (!modelName) return false;
    return !connStatus.models.includes(modelName);
  };

  useEffect(
    function ensureLocalModelIsValid() {
      if (!isLocalModelStale(localConnStatus, settings.ollama.modelName))
        return;

      // If we reached this point, it means the previously selected local model
      // is no longer available. We need to clear it from both state and storage.
      const updates: Record<string, string> = { localModelName: '' };
      const activeModelIsMissing =
        settings.modelName === settings.ollama.modelName;

      if (activeModelIsMissing) {
        updates.modelName = DEFAULT_LLM_MODEL.value;
      }

      setSettings(prev => ({
        ...prev,
        ...(activeModelIsMissing && { modelName: DEFAULT_LLM_MODEL.value }),
        ollama: { ...prev.ollama, modelName: '' },
      }));
      storage.set(updates).catch((error: Error) => {
        console.error(`Error updating stale local model: ${error.message}`);
      });
    },
    [localConnStatus, settings.ollama.modelName, settings.modelName, storage]
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

    if (!nextModel || nextModel.startsWith('__')) {
      return;
    }

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

    setSettings(prev => ({
      ...prev,
      modelName: nextModel,
      ollama: { ...prev.ollama, modelName: nextModel },
    }));
    persistSelectedModel(nextModel, nextModel);

    if (!settings.ollama.noticeShown) {
      toast({
        status: 'info',
        title:
          'Runs on your machine via Ollama. May be slower or less accurate.',
        variant: 'top-accent',
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

  const handleShowKeysClick = () => setShowKeys(!showKeys);
  const inputType = showKeys ? 'text' : 'password';

  const activeModelIsCloud = cloudModelValues.has(settings.modelName);
  const selectedProvider = activeModelIsCloud
    ? getProviderForModel(settings.modelName)
    : null;

  const showHideButton = (
    <InputRightElement width="4.5rem">
      <Button h="1.75rem" size="xs" onClick={handleShowKeysClick}>
        {showKeys ? 'Hide' : 'Show'}
      </Button>
    </InputRightElement>
  );

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
          localModelName={settings.ollama.modelName}
          localConnStatus={localConnStatus}
          onModelChange={handleModelChange}
          onConfigureLocalModel={() => navigate('/local-model-config')}
        />

        {activeModelIsCloud &&
          PROVIDERS.map(
            provider =>
              selectedProvider === provider && (
                <FormControl key={provider} mt={6}>
                  <FormLabel>
                    {PROVIDER_CONFIG[provider].label} API Key
                  </FormLabel>
                  <InputGroup size="md">
                    <Input
                      id={`${provider}-api-key`}
                      pr="4.5rem"
                      type={inputType}
                      value={settings.apiKeys[provider]}
                      onChange={handleApiKeyChange(provider)}
                      aria-label={`${PROVIDER_CONFIG[provider].label} API Key`}
                    />
                    {showHideButton}
                  </InputGroup>
                  <FormHelperText>
                    {showOnboarding ? 'Create' : 'Find'} your API key in{' '}
                    <Link href={PROVIDER_CONFIG[provider].helpUrl} isExternal>
                      {PROVIDER_CONFIG[provider].helpLabel}
                      <ExternalLinkIcon mx="2px" mb="3px" />
                    </Link>
                  </FormHelperText>
                </FormControl>
              )
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
