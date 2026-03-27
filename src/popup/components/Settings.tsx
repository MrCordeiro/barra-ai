import { useState, useEffect, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  FormControl,
  FormHelperText,
  FormLabel,
  Heading,
  HStack,
  Input,
  InputGroup,
  InputRightElement,
  Link,
  Select,
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
  normalizeModelDisplay,
  OllamaConnectionStatus,
  OllamaStatus,
} from '../../content/ollama';

interface CloudSettings {
  apiKeys: Record<Provider, string>;
  modelName: string;
}

const defaultCloudSettings: CloudSettings = {
  apiKeys: Object.fromEntries(PROVIDERS.map(p => [p, ''])) as Record<
    Provider,
    string
  >,
  modelName: DEFAULT_LLM_MODEL.value,
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
  const [settings, setSettings] = useState<CloudSettings>(defaultCloudSettings);
  const [showKeys, setShowKeys] = useState(false);
  const [isFormDirty, setIsFormDirty] = useState(false);

  const [localModelEndpoint, setLocalModelEndpoint] = useState(
    DEFAULT_OLLAMA_ENDPOINT
  );
  const [localModelName, setLocalModelName] = useState('');
  const [localModelConfigured, setLocalModelConfigured] = useState(false);
  const [localConnStatus, setLocalConnStatus] =
    useState<OllamaConnectionStatus | null>(null);
  const [ollamaNoticeShown, setOllamaNoticeShown] = useState(false);

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

          setSettings({
            apiKeys: normalizedApiKeys,
            modelName: result.modelName || defaultCloudSettings.modelName,
          });

          const endpoint = result.localModelEndpoint || DEFAULT_OLLAMA_ENDPOINT;
          const configured = !!result.localModelEndpoint;

          setLocalModelConfigured(configured);
          setLocalModelEndpoint(endpoint);
          setLocalModelName(result.localModelName || '');
          setOllamaNoticeShown(result.ollamaNoticeShown === 'true');
          setIsFormDirty(false);

          refreshOllamaStatus(endpoint);
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
      if (!isLocalModelStale(localConnStatus, localModelName)) return;

      // If we reached this point, it means the previously selected local model
      // is no longer available. We need to clear it from both state and storage.
      const updates: Record<string, string> = { localModelName: '' };
      const activeModelIsMissing = settings.modelName === localModelName;

      if (activeModelIsMissing) {
        updates.modelName = DEFAULT_LLM_MODEL.value;
        setSettings(prev => ({ ...prev, modelName: DEFAULT_LLM_MODEL.value }));
      }

      setLocalModelName('');
      storage.set(updates).catch((error: Error) => {
        console.error(`Error updating stale local model: ${error.message}`);
      });
    },
    [localConnStatus, localModelName, settings.modelName, storage]
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
      localModelEndpoint,
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
    if (!localModelConfigured) {
      navigate('/local-model-config');
      return;
    }

    setLocalModelName(nextModel);
    setSettings(prev => ({ ...prev, modelName: nextModel }));
    persistSelectedModel(nextModel, nextModel);

    if (!ollamaNoticeShown) {
      toast({
        status: 'info',
        title:
          'Runs on your machine via Ollama. May be slower or less accurate.',
        variant: 'top-accent',
      });
      setOllamaNoticeShown(true);
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

  const isLocalModelSelected =
    !activeModelIsCloud &&
    !!localModelName &&
    settings.modelName === localModelName;

  const localStatusText = (() => {
    if (!isLocalModelSelected) return '';

    if (
      localConnStatus?.type === OllamaStatus.Connected ||
      localConnStatus?.type === OllamaStatus.CustomServer
    ) {
      return `${normalizeModelDisplay(localModelName)} · Connected`;
    }

    return '⚠ Ollama not reachable';
  })();

  const localModels =
    localConnStatus?.type === OllamaStatus.Connected
      ? localConnStatus.models
      : [];

  const selectedLocalModelStillAvailable =
    !!localModelName && localModels.includes(localModelName);

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
        <FormControl isRequired mt={6}>
          <FormLabel>Model Name</FormLabel>
          <Select
            id="model-name"
            name="modelName"
            value={settings.modelName}
            onChange={handleModelChange}
            aria-label="Model Name"
          >
            {LLM_MODEL_OPTIONS.map(model => (
              <option key={model.value} value={model.value}>
                {model.name}
                {model.value === DEFAULT_LLM_MODEL.value
                  ? ' (Recommended)'
                  : ''}
              </option>
            ))}

            <option value="__divider" disabled>
              ------------
            </option>

            {localConnStatus === null && (
              <option value="__ollama-loading" disabled>
                Checking Ollama…
              </option>
            )}

            {localConnStatus?.type === OllamaStatus.NotRunning && (
              <>
                <option value="__ollama-down" disabled>
                  Ollama not running
                </option>
                <option value="__ollama-run" disabled>
                  Run: ollama serve
                </option>
              </>
            )}

            {localConnStatus?.type === OllamaStatus.NoModels && (
              <>
                <option value="__ollama-empty" disabled>
                  No models installed
                </option>
                <option value="__ollama-pull" disabled>
                  Run: ollama pull llama3.2
                </option>
              </>
            )}

            {localConnStatus?.type === OllamaStatus.Connected && (
              <>
                <option value="__ollama-label" disabled>
                  Ollama
                </option>
                {localConnStatus.models.map(model => (
                  <option key={model} value={model}>
                    {normalizeModelDisplay(model)}
                  </option>
                ))}
              </>
            )}

            {isLocalModelSelected && !selectedLocalModelStillAvailable && (
              <option value={settings.modelName}>
                {normalizeModelDisplay(settings.modelName)} (Unavailable)
              </option>
            )}
          </Select>
        </FormControl>

        {(localConnStatus?.type === OllamaStatus.NotRunning ||
          localConnStatus?.type === OllamaStatus.NoModels) && (
          <HStack justify="space-between" align="center" mt={2}>
            <Text fontSize="sm" color="gray.600">
              {localConnStatus.type === OllamaStatus.NotRunning
                ? 'Ollama is unavailable.'
                : 'Install at least one Ollama model to select it.'}
            </Text>
            <Link
              fontSize="sm"
              color="blue.500"
              cursor="pointer"
              onClick={() => navigate('/local-model-config')}
              aria-label="Configure local model"
            >
              Configure
            </Link>
          </HStack>
        )}

        {isLocalModelSelected && (
          <HStack justify="space-between" align="center" mt={4}>
            <Text fontSize="sm">{localStatusText}</Text>
            <Link
              fontSize="sm"
              color="blue.500"
              cursor="pointer"
              onClick={() => navigate('/local-model-config')}
              aria-label="Configure local model"
            >
              Configure
            </Link>
          </HStack>
        )}

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

// FIXME: Component doing too much
