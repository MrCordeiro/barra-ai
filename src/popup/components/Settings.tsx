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
  getProviderForModel,
} from '../../models';
import { Storage } from '../../storages';

interface Settings {
  apiKey: string;
  anthropicApiKey: string;
  modelName: string;
}

const defaultSettings: Settings = {
  apiKey: '',
  anthropicApiKey: '',
  modelName: DEFAULT_LLM_MODEL.value,
};

interface Props {
  storage: Storage;
  showOnboarding?: boolean;
}

const Settings = ({ storage, showOnboarding = false }: Props) => {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [showKey, setShowKey] = useState(false);
  const [isFormDirty, setIsFormDirty] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  /* Load settings from storage */
  useEffect(() => {
    storage
      .get(['apiKey', 'anthropicApiKey', 'modelName'])
      .then(result => {
        if (result.apiKey || result.anthropicApiKey || result.modelName) {
          setSettings({
            apiKey: result.apiKey || defaultSettings.apiKey,
            anthropicApiKey:
              result.anthropicApiKey || defaultSettings.anthropicApiKey,
            modelName: result.modelName || defaultSettings.modelName,
          });
        }
        setIsFormDirty(false);
      })
      .catch((error: Error) => {
        console.error(`Error loading settings: ${error.message}`);
      });
  }, [storage]);

  /* Update settings on change */
  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setSettings(prevSettings => ({
      ...prevSettings,
      [name]: value,
    }));
    setIsFormDirty(true);
  };

  /* Save settings to storage */
  const handleSubmit = (e: ChangeEvent<HTMLFormElement>) => {
    e.preventDefault();
    storage
      .set({ ...settings })
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

  const handleShowKeyClick = () => setShowKey(!showKey);

  const currentProvider = getProviderForModel(settings.modelName);
  const isAnthropic = currentProvider === 'anthropic';
  const apiKeyField = isAnthropic ? 'anthropicApiKey' : 'apiKey';
  const apiKeyValue = isAnthropic ? settings.anthropicApiKey : settings.apiKey;
  const apiKeyLabel = isAnthropic ? 'Anthropic API Key' : 'OpenAI API Key';
  const apiKeyHref = isAnthropic
    ? 'https://console.anthropic.com/settings/keys'
    : 'https://platform.openai.com/api-keys';
  const apiKeyLinkText = isAnthropic ? 'Anthropic Console' : 'OpenAI dashboard';

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
            onChange={handleChange}
            aria-label="Model Name"
          >
            {LLM_MODEL_OPTIONS.map(model => (
              <option key={model.value} value={model.value}>
                {model.name}
              </option>
            ))}
          </Select>
        </FormControl>

        <FormControl isRequired mt={6}>
          <FormLabel>{apiKeyLabel}</FormLabel>
          <InputGroup size="md">
            <Input
              id="api-key"
              name={apiKeyField}
              pr="4.5rem"
              type={showKey ? 'text' : 'password'}
              value={apiKeyValue}
              onChange={handleChange}
              aria-label="API Key"
            />
            <InputRightElement width="4.5rem">
              <Button h="1.75rem" size="xs" onClick={handleShowKeyClick}>
                {showKey ? 'Hide' : 'Show'}
              </Button>
            </InputRightElement>
          </InputGroup>
          <FormHelperText>
            {showOnboarding ? 'Create' : 'Find'} your API key in the{' '}
            <Link href={apiKeyHref} isExternal>
              {apiKeyLinkText}
              <ExternalLinkIcon mx="2px" mb="3px" />
            </Link>
          </FormHelperText>
        </FormControl>

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
