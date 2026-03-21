import { useState, useEffect, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  FormHelperText,
  Heading,
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
  const toast = useToast();
  const navigate = useNavigate();

  /* Load settings from storage */
  useEffect(() => {
    const storageKeys = PROVIDERS.map(p => PROVIDER_CONFIG[p].storageKey);
    storage
      .get([...storageKeys, 'modelName'])
      .then(result => {
        if (storageKeys.some(k => result[k]) || result.modelName) {
          const apiKeys = Object.fromEntries(
            PROVIDERS.map(p => [p, result[PROVIDER_CONFIG[p].storageKey] || ''])
          ) as Record<Provider, string>;
          setSettings({
            apiKeys,
            modelName: result.modelName || defaultSettings.modelName,
          });
        }
        setIsFormDirty(false);
      })
      .catch((error: Error) => {
        console.error(`Error loading settings: ${error.message}`);
      });
  }, [storage]);

  /* Update model name on change */
  const handleModelChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSettings(prev => ({ ...prev, modelName: e.target.value }));
    setIsFormDirty(true);
  };

  /* Update a specific provider's API key */
  const handleApiKeyChange =
    (provider: Provider) => (e: ChangeEvent<HTMLInputElement>) => {
      setSettings(prev => ({
        ...prev,
        apiKeys: { ...prev.apiKeys, [provider]: e.target.value },
      }));
      setIsFormDirty(true);
    };

  /* Save settings to storage */
  const handleSubmit = (e: ChangeEvent<HTMLFormElement>) => {
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
      <form aria-label="Settings form" onSubmit={handleSubmit}>
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
              <optgroup key={provider} label={PROVIDER_CONFIG[provider].label}>
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
                <FormLabel>{PROVIDER_CONFIG[provider].label} API Key</FormLabel>
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
