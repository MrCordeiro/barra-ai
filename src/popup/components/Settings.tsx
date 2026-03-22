import { useState, useEffect, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Divider,
  FormControl,
  FormLabel,
  FormHelperText,
  Heading,
  HStack,
  Input,
  InputGroup,
  InputRightElement,
  Link,
  Select,
  Switch,
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
  checkOllamaConnection,
  normalizeModelDisplay,
  DEFAULT_OLLAMA_ENDPOINT,
  OllamaConnectionStatus,
} from '../../content/ollama';

interface Settings {
  apiKeys: Record<Provider, string>;
  modelName: string;
}

const defaultSettings: Settings = {
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

const Settings = ({ storage, showOnboarding = false }: Props) => {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [showKeys, setShowKeys] = useState(false);
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [localModelEnabled, setLocalModelEnabled] = useState(false);
  const [localModelName, setLocalModelName] = useState('');
  const [localConnectionStatus, setLocalConnectionStatus] =
    useState<OllamaConnectionStatus | null>(null);
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(
    function loadSettings() {
      const storageKeys = PROVIDERS.map(p => PROVIDER_CONFIG[p].storageKey);
      storage
        .get([
          ...storageKeys,
          'modelName',
          'localModelEnabled',
          'localModelEndpoint',
          'localModelName',
        ])
        .then(result => {
          if (storageKeys.some(k => result[k]) || result.modelName) {
            const apiKeys = Object.fromEntries(
              PROVIDERS.map(p => [
                p,
                result[PROVIDER_CONFIG[p].storageKey] || '',
              ])
            ) as Record<Provider, string>;
            setSettings({
              apiKeys,
              modelName: result.modelName || defaultSettings.modelName,
            });
          }
          const enabled = result.localModelEnabled === 'true';
          setLocalModelEnabled(enabled);
          setLocalModelName(result.localModelName || '');
          setIsFormDirty(false);

          if (enabled) {
            const endpoint =
              result.localModelEndpoint || DEFAULT_OLLAMA_ENDPOINT;
            checkOllamaConnection(endpoint)
              .then(status => setLocalConnectionStatus(status))
              .catch(() => setLocalConnectionStatus({ type: 'not-running' }));
          }
        })
        .catch((error: Error) => {
          console.error(`Error loading settings: ${error.message}`);
        });
    },
    [storage]
  );

  const handleModelChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSettings(prev => ({ ...prev, modelName: e.target.value }));
    setIsFormDirty(true);
  };

  const handleApiKeyChange =
    (provider: Provider) => (e: ChangeEvent<HTMLInputElement>) => {
      setSettings(prev => ({
        ...prev,
        apiKeys: { ...prev.apiKeys, [provider]: e.target.value },
      }));
      setIsFormDirty(true);
    };

  const saveSettings = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const storageData: Record<string, string> = {
      modelName: settings.modelName,
    };
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

  const handleLocalModelToggle = () => {
    const newEnabled = !localModelEnabled;
    setLocalModelEnabled(newEnabled);

    storage
      .get(['localModelEndpoint', 'localModelName'])
      .then(result => {
        const endpoint = result.localModelEndpoint || DEFAULT_OLLAMA_ENDPOINT;
        const storedModel = result.localModelName || '';

        return storage
          .set({ localModelEnabled: newEnabled ? 'true' : 'false' })
          .then(() => {
            if (newEnabled) {
              // First time: no endpoint configured → auto-navigate to sub-page
              if (!result.localModelEndpoint && !result.localModelName) {
                navigate('/local-model-config');
                return;
              }
              // Already configured: run background connection check
              setLocalModelName(storedModel);
              checkOllamaConnection(endpoint)
                .then(status => setLocalConnectionStatus(status))
                .catch(() => setLocalConnectionStatus({ type: 'not-running' }));
            } else {
              setLocalConnectionStatus(null);
            }
          });
      })
      .catch((error: Error) => {
        console.error(`Error toggling local model: ${error.message}`);
      });
  };

  const handleShowKeysClick = () => setShowKeys(!showKeys);
  const inputType = showKeys ? 'text' : 'password';
  const selectedProvider = getProviderForModel(settings.modelName);
  const showHideButton = (
    <InputRightElement width="4.5rem">
      <Button h="1.75rem" size="xs" onClick={handleShowKeysClick}>
        {showKeys ? 'Hide' : 'Show'}
      </Button>
    </InputRightElement>
  );

  const localStatusText = (() => {
    if (!localConnectionStatus) return 'Checking…';
    const modelDisplay = localModelName
      ? normalizeModelDisplay(localModelName)
      : null;
    switch (localConnectionStatus.type) {
      case 'connected':
        return modelDisplay
          ? `${modelDisplay} · Connected`
          : 'Connected · No model selected';
      case 'custom-server':
        return modelDisplay
          ? `${modelDisplay} · Connected (custom server)`
          : 'Connected (custom server) · No model selected';
      case 'no-models':
        return 'Connected · No models found';
      case 'not-running':
        return 'Not connected';
    }
  })();

  const isFirstTimeSetup = !localModelEnabled && !localModelName;

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
        {!localModelEnabled && (
          <>
            <FormControl isRequired mt={6}>
              <FormLabel>Model Name</FormLabel>
              <Select
                id="model-name"
                name="modelName"
                value={settings.modelName}
                onChange={handleModelChange}
                aria-label="Model Name"
              >
                {PROVIDERS.map(provider => (
                  <optgroup
                    key={provider}
                    label={PROVIDER_CONFIG[provider].label}
                  >
                    {LLM_MODEL_OPTIONS.filter(m => m.provider === provider).map(
                      model => (
                        <option key={model.value} value={model.value}>
                          {model.name}
                        </option>
                      )
                    )}
                  </optgroup>
                ))}
              </Select>
            </FormControl>

            {PROVIDERS.map(
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
          </>
        )}

        {localModelEnabled && (
          <Box mt={6}>
            <HStack justify="space-between" align="center">
              <Text fontSize="sm">
                {isFirstTimeSetup ? 'Set up your local model' : localStatusText}
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
          </Box>
        )}

        <Divider mt={6} mb={4} />

        <FormControl>
          <HStack justify="space-between" align="center">
            <FormLabel mb={0} htmlFor="local-model-toggle">
              Use local model (Ollama)
            </FormLabel>
            <Switch
              id="local-model-toggle"
              isChecked={localModelEnabled}
              onChange={handleLocalModelToggle}
              aria-label="Use local model (Ollama)"
            />
          </HStack>
        </FormControl>
      </form>
    </>
  );
};

export default Settings;
