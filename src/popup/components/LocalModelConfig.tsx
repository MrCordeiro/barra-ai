import {
  useState,
  useEffect,
  useRef,
  type ChangeEvent,
  type FocusEvent,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  FormControl,
  FormLabel,
  FormHelperText,
  Heading,
  HStack,
  Input,
  Select,
  Text,
} from '@chakra-ui/react';
import { ArrowBackIcon } from '@chakra-ui/icons';
import {
  normalizeModelDisplay,
  DEFAULT_OLLAMA_ENDPOINT,
  OllamaConnectionStatus,
} from '../../content/ollama';
import { Storage } from '../../storages';

interface Props {
  storage: Storage;
}

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

const LocalModelConfig = ({ storage }: Props) => {
  const navigate = useNavigate();
  const [endpoint, setEndpoint] = useState(DEFAULT_OLLAMA_ENDPOINT);
  const [selectedModel, setSelectedModel] = useState('');
  const [endpointError, setEndpointError] = useState('');
  const [connectionStatus, setConnectionStatus] =
    useState<OllamaConnectionStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load saved config and run initial connection check on mount
  useEffect(() => {
    storage
      .get(['localModelEndpoint', 'localModelName'])
      .then(result => {
        const savedEndpoint =
          result.localModelEndpoint || DEFAULT_OLLAMA_ENDPOINT;
        const savedModel = result.localModelName || '';
        setEndpoint(savedEndpoint);
        setSelectedModel(savedModel);
        void runConnectionCheck(savedEndpoint);
      })
      .catch((error: Error) => {
        console.error(`Error loading local model config: ${error.message}`);
        void runConnectionCheck(DEFAULT_OLLAMA_ENDPOINT);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runConnectionCheck(url: string) {
    setIsChecking(true);
    try {
      const status: OllamaConnectionStatus = await chrome.runtime.sendMessage({
        type: 'ollama:check',
        endpoint: url,
      });
      setConnectionStatus(status);
      // If only one model available, auto-select it
      if (status.type === 'connected' && status.models.length === 1) {
        const model = status.models[0];
        setSelectedModel(prev => (prev ? prev : model));
      }
      // If previously selected model is no longer in the list, clear it (§6.3)
      if (status.type === 'connected') {
        setSelectedModel(prev => {
          if (prev && !status.models.includes(prev)) return '';
          return prev;
        });
      }
    } catch {
      setConnectionStatus({ type: 'not-running' });
    } finally {
      setIsChecking(false);
    }
  }

  function handleEndpointChange(e: ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setEndpoint(value);
    setEndpointError('');
    // Debounced connection check (§4.3)
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (isValidUrl(value)) {
        void saveAndCheck(value, selectedModel);
      }
    }, 800);
  }

  function handleEndpointBlur(e: FocusEvent<HTMLInputElement>) {
    const value = e.target.value;
    if (!isValidUrl(value)) {
      setEndpointError('Must be a valid URL (e.g. http://localhost:11434)');
      return;
    }
    setEndpointError('');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    void saveAndCheck(value, selectedModel);
  }

  async function saveAndCheck(url: string, model: string) {
    await storage.set({ localModelEndpoint: url, localModelName: model });
    await runConnectionCheck(url);
  }

  function handleModelChange(e: ChangeEvent<HTMLSelectElement>) {
    const model = e.target.value;
    setSelectedModel(model);
    storage
      .set({ localModelEndpoint: endpoint, localModelName: model })
      .catch((error: Error) => {
        console.error(`Error saving model: ${error.message}`);
      });
  }

  function handleBack() {
    navigate('/settings');
  }

  function handleCheckAgain() {
    if (isValidUrl(endpoint)) {
      void saveAndCheck(endpoint, selectedModel);
    }
  }

  const models =
    connectionStatus?.type === 'connected' ? connectionStatus.models : [];
  const isCustomServer = connectionStatus?.type === 'custom-server';
  const dropdownDisabled =
    connectionStatus === null ||
    connectionStatus.type === 'not-running' ||
    connectionStatus.type === 'no-models';

  return (
    <Box>
      <HStack mb={4}>
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<ArrowBackIcon />}
          onClick={handleBack}
          aria-label="Back to settings"
        >
          Back
        </Button>
      </HStack>

      <Heading as="h2" size="md" mb={4}>
        Local Model Setup
      </Heading>

      <Text fontSize="sm" mb={4} color="gray.600">
        Run models on your machine via Ollama. You need Ollama installed and
        running. If that means nothing to you, turn this off in settings.
      </Text>

      <FormControl isInvalid={!!endpointError} mb={4}>
        <FormLabel>Endpoint</FormLabel>
        <Input
          id="local-model-endpoint"
          value={endpoint}
          onChange={handleEndpointChange}
          onBlur={handleEndpointBlur}
          aria-label="Ollama endpoint"
          placeholder={DEFAULT_OLLAMA_ENDPOINT}
        />
        {endpointError && (
          <FormHelperText color="red.500">{endpointError}</FormHelperText>
        )}
      </FormControl>

      <ConnectionStatusDisplay
        status={connectionStatus}
        isChecking={isChecking}
        onCheckAgain={handleCheckAgain}
      />

      <FormControl mt={4} isDisabled={dropdownDisabled && !isCustomServer}>
        <FormLabel>Model</FormLabel>
        {isCustomServer ? (
          <Input
            id="local-model-name"
            value={selectedModel}
            onChange={e => {
              setSelectedModel(e.target.value);
              storage
                .set({
                  localModelEndpoint: endpoint,
                  localModelName: e.target.value,
                })
                .catch((error: Error) => {
                  console.error(`Error saving model: ${error.message}`);
                });
            }}
            aria-label="Model name"
            placeholder="e.g. mistral"
          />
        ) : (
          <Select
            id="local-model-select"
            value={selectedModel}
            onChange={handleModelChange}
            aria-label="Local model"
            isDisabled={dropdownDisabled}
            placeholder="Select a model"
          >
            {models.map(m => (
              <option key={m} value={m}>
                {normalizeModelDisplay(m)}
              </option>
            ))}
          </Select>
        )}
      </FormControl>

      <Alert status="warning" mt={6} borderRadius="md" fontSize="sm">
        <AlertIcon />
        Local models vary in quality. Responses may be slower or less accurate
        than cloud models.
      </Alert>
    </Box>
  );
};

interface StatusProps {
  status: OllamaConnectionStatus | null;
  isChecking: boolean;
  onCheckAgain: () => void;
}

function ConnectionStatusDisplay({
  status,
  isChecking,
  onCheckAgain,
}: StatusProps) {
  if (isChecking || status === null) {
    return (
      <Text fontSize="sm" color="gray.500">
        Checking connection…
      </Text>
    );
  }

  if (status.type === 'connected') {
    return (
      <Text fontSize="sm" color="green.600" aria-live="polite">
        Connected — {status.models.length} model
        {status.models.length !== 1 ? 's' : ''} available
      </Text>
    );
  }

  if (status.type === 'custom-server') {
    return (
      <Text fontSize="sm" color="green.600" aria-live="polite">
        Connected (custom server)
      </Text>
    );
  }

  if (status.type === 'no-models') {
    return (
      <Box>
        <Text fontSize="sm" color="orange.600" aria-live="polite">
          Connected, but no models found. Pull a model first:
        </Text>
        <Text fontSize="sm" fontFamily="mono" mt={1}>
          ollama pull llama3.2
        </Text>
        <Button size="xs" mt={2} onClick={onCheckAgain}>
          Check again
        </Button>
      </Box>
    );
  }

  // not-running
  return (
    <Box>
      <Text fontSize="sm" color="red.600" aria-live="polite">
        Can&apos;t reach Ollama at this address. Make sure Ollama is running:
      </Text>
      <Text fontSize="sm" fontFamily="mono" mt={1}>
        ollama serve
      </Text>
      <Button size="xs" mt={2} onClick={onCheckAgain}>
        Check again
      </Button>
    </Box>
  );
}

export default LocalModelConfig;
