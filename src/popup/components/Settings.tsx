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
  Tooltip,
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
  normalizeModelDisplay,
  DEFAULT_OLLAMA_ENDPOINT,
  OllamaConnectionStatus,
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

/** Ask the background worker to check Ollama connectivity. */
async function checkViaBackground(
  endpoint: string
): Promise<OllamaConnectionStatus> {
  const status: OllamaConnectionStatus = await chrome.runtime.sendMessage({
    type: 'ollama:check',
    endpoint,
  });
  return status;
}

const Settings = ({ storage, showOnboarding = false }: Props) => {
  const [settings, setSettings] = useState<CloudSettings>(defaultCloudSettings);
  const [showKeys, setShowKeys] = useState(false);
  const [isFormDirty, setIsFormDirty] = useState(false);

  // Local model state
  const [localModelEnabled, setLocalModelEnabled] = useState(false);
  const [localModelConfigured, setLocalModelConfigured] = useState(false);
  const [localModelName, setLocalModelName] = useState('');
  const [localModelEndpoint, setLocalModelEndpoint] = useState(
    DEFAULT_OLLAMA_ENDPOINT
  );
  const [localConnectionStatus, setLocalConnectionStatus] =
    useState<OllamaConnectionStatus | null>(null);

  const toast = useToast();
  const navigate = useNavigate();

  // Determine layout: both providers configured → show segmented control
  const cloudConfigured = PROVIDERS.some(p => settings.apiKeys[p]);
  const showSwitcher = cloudConfigured && localModelConfigured;

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
              modelName: result.modelName || defaultCloudSettings.modelName,
            });
          }

          const enabled = result.localModelEnabled === 'true';
          const endpoint = result.localModelEndpoint || DEFAULT_OLLAMA_ENDPOINT;
          const configured = !!result.localModelEndpoint;

          setLocalModelEnabled(enabled);
          setLocalModelConfigured(configured);
          setLocalModelEndpoint(endpoint);
          setLocalModelName(result.localModelName || '');
          setIsFormDirty(false);

          // Fire async probe if local has ever been configured.
          if (configured) {
            checkViaBackground(endpoint)
              .then(status => {
                setLocalConnectionStatus(status);
                // If the stored model is no longer available, clear it (§4.5).
                if (
                  status.type === 'connected' &&
                  result.localModelName &&
                  !status.models.includes(result.localModelName)
                ) {
                  setLocalModelName('');
                  void storage.set({ localModelName: '' });
                }
              })
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

  /** Segmented-control tab switch — saves localModelEnabled immediately. */
  const handleTabSwitch = (enableLocal: boolean) => {
    setLocalModelEnabled(enableLocal);
    storage
      .set({ localModelEnabled: enableLocal ? 'true' : 'false' })
      .catch((error: Error) => {
        console.error(`Error switching provider tab: ${error.message}`);
      });
  };

  /** Toggle (shown only when local is NOT yet configured). */
  const handleLocalModelToggle = () => {
    const newEnabled = !localModelEnabled;
    setLocalModelEnabled(newEnabled);

    storage
      .set({ localModelEnabled: newEnabled ? 'true' : 'false' })
      .then(() => {
        if (newEnabled) {
          if (!localModelConfigured) {
            navigate('/local-model-config');
            return;
          }
          checkViaBackground(localModelEndpoint)
            .then(status => setLocalConnectionStatus(status))
            .catch(() => setLocalConnectionStatus({ type: 'not-running' }));
        } else {
          setLocalConnectionStatus(null);
        }
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

  const localDisplayName = localModelName
    ? normalizeModelDisplay(localModelName)
    : 'No model selected';

  const localTabWarning =
    localConnectionStatus?.type === 'not-running' ||
    localConnectionStatus?.type === 'no-models';

  const localStatusText = (() => {
    if (!localConnectionStatus) return 'Checking…';
    switch (localConnectionStatus.type) {
      case 'connected':
      case 'custom-server':
        return localModelName
          ? `${normalizeModelDisplay(localModelName)} · Connected`
          : 'Connected · No model selected';
      case 'no-models':
        return 'Connected · No models found';
      case 'not-running':
        return 'Not connected';
    }
  })();

  const cloudModelDisplay = normalizeModelDisplay(settings.modelName);

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

      {/* ── Segmented control (both providers configured) ── */}
      {showSwitcher && (
        <HStack
          spacing={0}
          mb={4}
          borderRadius="md"
          overflow="hidden"
          border="1px solid"
          borderColor="gray.200"
        >
          <Tooltip label={settings.modelName} hasArrow placement="top">
            <Button
              flex={1}
              variant={!localModelEnabled ? 'solid' : 'ghost'}
              colorScheme={!localModelEnabled ? 'blue' : undefined}
              borderRadius={0}
              onClick={() => handleTabSwitch(false)}
              aria-pressed={!localModelEnabled}
              aria-label={`Cloud provider: ${settings.modelName}`}
              size="sm"
              py={6}
            >
              <Box textAlign="center">
                <Text fontSize="sm" fontWeight="bold" isTruncated maxW="100px">
                  {cloudModelDisplay}
                </Text>
                <Text
                  fontSize="xs"
                  color={!localModelEnabled ? 'blue.100' : 'gray.500'}
                >
                  ☁ Cloud
                </Text>
              </Box>
            </Button>
          </Tooltip>

          <Tooltip
            label={localModelName || 'No model selected'}
            hasArrow
            placement="top"
          >
            <Button
              flex={1}
              variant={localModelEnabled ? 'solid' : 'ghost'}
              colorScheme={localModelEnabled ? 'blue' : undefined}
              borderRadius={0}
              onClick={() => handleTabSwitch(true)}
              aria-pressed={localModelEnabled}
              aria-label={`Local provider: ${localDisplayName}`}
              size="sm"
              py={6}
            >
              <Box textAlign="center">
                <Text fontSize="sm" fontWeight="bold" isTruncated maxW="100px">
                  {localDisplayName}
                  {localTabWarning ? ' ⚠' : ''}
                </Text>
                <Text
                  fontSize="xs"
                  color={localModelEnabled ? 'blue.100' : 'gray.500'}
                >
                  ⊙ Local
                </Text>
              </Box>
            </Button>
          </Tooltip>
        </HStack>
      )}

      <form aria-label="Settings form" onSubmit={saveSettings}>
        {/* ── Cloud fields (visible when cloud tab active or no switcher + local off) ── */}
        {!localModelEnabled && (
          <>
            <FormControl isRequired mt={showSwitcher ? 0 : 6}>
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

            {!showSwitcher && (
              <Button
                type="submit"
                colorScheme="green"
                isDisabled={!isFormDirty}
                mt={6}
                w="100%"
              >
                Save
              </Button>
            )}
          </>
        )}

        {/* Save button when switcher is shown and cloud tab is active */}
        {showSwitcher && !localModelEnabled && (
          <Button
            type="submit"
            colorScheme="green"
            isDisabled={!isFormDirty}
            mt={6}
            w="100%"
          >
            Save
          </Button>
        )}

        {/* ── Local model status (visible when local tab active or toggle ON) ── */}
        {localModelEnabled && (
          <Box mt={showSwitcher ? 0 : 6}>
            {localConnectionStatus?.type === 'not-running' && (
              <Text fontSize="sm" color="red.500" mb={2}>
                ⚠ Can&apos;t reach Ollama. Requests will fail until Ollama is
                running.
              </Text>
            )}
            <HStack justify="space-between" align="center">
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
          </Box>
        )}

        {/* ── Toggle (only when local has NOT been configured yet) ── */}
        {!showSwitcher && (
          <>
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
          </>
        )}
      </form>
    </>
  );
};

export default Settings;
