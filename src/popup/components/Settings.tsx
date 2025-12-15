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
import { Storage } from '../../storages';

const LLMModel = Object.freeze({
  GPT_5_2: { name: 'GPT-5.2', value: 'gpt-5.2' },
  GPT_5_1: { name: 'GPT-5.1', value: 'gpt-5.1' },
  GPT_5: { name: 'GPT-5', value: 'gpt-5' },
  GPT_5_MINI: { name: 'GPT-5 Mini', value: 'gpt-5-mini' },
  GPT_5_NANO: { name: 'GPT-5 Nano', value: 'gpt-5-nano' },
  GPT_4O: { name: 'GPT-4o', value: 'gpt-4o' },
  GPT_4O_MINI: { name: 'GPT-4o Mini', value: 'gpt-4o-mini' },
  GPT_4_1: { name: 'GPT-4.1', value: 'gpt-4.1' },
  GPT_4_1_MINI: { name: 'GPT-4.1 Mini', value: 'gpt-4.1-mini' },
  GPT_4_1_NANO: { name: 'GPT-4.1 Nano', value: 'gpt-4.1-nano' },
  GPT_3_5_TURBO: { name: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' },
});

interface Settings {
  apiKey: string;
  modelName: string;
}

const defaultSettings: Settings = {
  apiKey: '',
  modelName: LLMModel.GPT_4O_MINI.value,
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
      .get(['apiKey', 'modelName'])
      .then(result => {
        if (result.apiKey || result.modelName) {
          setSettings({
            apiKey: result.apiKey || defaultSettings.apiKey,
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
    console.log('changing: ', name, value);
    console.log(settings);

    setSettings(prevSettings => ({
      ...prevSettings,
      [name]: value,
    }));
    console.log(settings);
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

  return (
    <>
      {showOnboarding ? (
        <Box>
          <Heading mb={4} as="h1" textAlign={'center'}>
            Welcome!
          </Heading>
          <Text fontSize="md">
            You will need an OpenAI API key to get started.
          </Text>
        </Box>
      ) : (
        <Heading mb={4} as="h1" textAlign={'center'}>
          Settings
        </Heading>
      )}
      <form aria-label="Settings form" onSubmit={handleSubmit}>
        <FormControl isRequired mt={6}>
          <FormLabel>API Key</FormLabel>
          <InputGroup size="md">
            <Input
              id="api-key"
              name="apiKey"
              pr="4.5rem"
              type={showKey ? 'text' : 'password'}
              value={settings.apiKey}
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
            <Link href="https://platform.openai.com/api-keys" isExternal>
              OpenAI dashboard
              <ExternalLinkIcon mx="2px" mb="3px" />
            </Link>
          </FormHelperText>
        </FormControl>

        <FormControl isRequired mt={6}>
          <FormLabel>Model Name</FormLabel>
          <Select
            id="model-name"
            name="modelName"
            value={settings.modelName}
            onChange={handleChange}
            aria-label="Model Name"
          >
            {Object.values(LLMModel).map(model => (
              <option key={model.value} value={model.value}>
                {model.name}
              </option>
            ))}
          </Select>
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
