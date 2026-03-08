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
import { DEFAULT_LLM_MODEL, LLM_MODEL_OPTIONS } from '../../models';
import { Storage } from '../../storages';

interface Settings {
  openaiApiKey: string;
  anthropicApiKey: string;
  modelName: string;
}

const defaultSettings: Settings = {
  openaiApiKey: '',
  anthropicApiKey: '',
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
    storage
      .get(['openaiApiKey', 'anthropicApiKey', 'modelName'])
      .then(result => {
        if (result.openaiApiKey || result.anthropicApiKey || result.modelName) {
          setSettings({
            openaiApiKey: result.openaiApiKey || defaultSettings.openaiApiKey,
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

  const handleShowKeysClick = () => setShowKeys(!showKeys);
  const inputType = showKeys ? 'text' : 'password';
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

        <FormControl mt={6}>
          <FormLabel>OpenAI API Key</FormLabel>
          <InputGroup size="md">
            <Input
              id="openai-api-key"
              name="openaiApiKey"
              pr="4.5rem"
              type={inputType}
              value={settings.openaiApiKey}
              onChange={handleChange}
              aria-label="OpenAI API Key"
            />
            {showHideButton}
          </InputGroup>
          <FormHelperText>
            {showOnboarding ? 'Create' : 'Find'} your API key in the{' '}
            <Link href="https://platform.openai.com/api-keys" isExternal>
              OpenAI dashboard
              <ExternalLinkIcon mx="2px" mb="3px" />
            </Link>
          </FormHelperText>
        </FormControl>

        <FormControl mt={6}>
          <FormLabel>Anthropic API Key</FormLabel>
          <InputGroup size="md">
            <Input
              id="anthropic-api-key"
              name="anthropicApiKey"
              pr="4.5rem"
              type={inputType}
              value={settings.anthropicApiKey}
              onChange={handleChange}
              aria-label="Anthropic API Key"
            />
            {showHideButton}
          </InputGroup>
          <FormHelperText>
            {showOnboarding ? 'Create' : 'Find'} your API key in the{' '}
            <Link href="https://console.anthropic.com/settings/keys" isExternal>
              Anthropic Console
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
