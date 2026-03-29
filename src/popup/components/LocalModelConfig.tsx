import {
  useState,
  useEffect,
  useRef,
  type ChangeEvent,
  type FocusEvent,
  useCallback,
} from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  FormHelperText,
  Heading,
  Input,
  Link,
  Select,
  Spinner,
  Text,
} from '@chakra-ui/react';
import {
  normalizeModelDisplay,
  DEFAULT_OLLAMA_ENDPOINT,
  OllamaModelAvailability,
  OllamaStatus,
} from '../../content/ollama';
import { Storage } from '../../storages';
import { ExternalLinkIcon } from '@chakra-ui/icons';

interface Props {
  storage: Storage;
}

const ALLOWED_LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0']);

function normalizeLocalEndpoint(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'http:') return null;
    if (!ALLOWED_LOCAL_HOSTS.has(url.hostname)) return null;
    return url.origin;
  } catch {
    return null;
  }
}

const LocalModelConfig = ({ storage }: Props) => {
  const [endpoint, setEndpoint] = useState(DEFAULT_OLLAMA_ENDPOINT);
  const [selectedModel, setSelectedModel] = useState('');
  const [endpointError, setEndpointError] = useState('');
  const [connectionStatus, setConnectionStatus] =
    useState<OllamaModelAvailability | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runConnectionCheck = useCallback(
    async (url: string, currentSelectedModel = selectedModel) => {
      setIsChecking(true);
      try {
        const modelAvailability: OllamaModelAvailability =
          await chrome.runtime.sendMessage({
            type: 'ollama:check',
            endpoint: url,
          });
        setConnectionStatus(modelAvailability);
        let resolvedSelectedModel = currentSelectedModel;

        // If only one model available, auto-select it
        if (
          modelAvailability.status === OllamaStatus.Connected &&
          modelAvailability.models.length === 1 &&
          !resolvedSelectedModel
        ) {
          const model = modelAvailability.models[0];
          resolvedSelectedModel = model;
          setSelectedModel(model);
          await storage.set({ localModelName: model });
        }
        // If previously selected model is no longer in the list, clear it
        if (
          modelAvailability.status === OllamaStatus.Connected &&
          resolvedSelectedModel &&
          !modelAvailability.models.includes(resolvedSelectedModel)
        ) {
          setSelectedModel('');
          await storage.set({ localModelName: '' });
        }
      } catch {
        setConnectionStatus({ status: OllamaStatus.NotRunning });
      } finally {
        setIsChecking(false);
      }
    },
    [selectedModel, storage]
  );

  useEffect(
    function loadAndCheckConfig() {
      storage
        .get(['localModelEndpoint', 'localModelName'])
        .then(result => {
          const savedEndpoint =
            normalizeLocalEndpoint(result.localModelEndpoint ?? '') ??
            DEFAULT_OLLAMA_ENDPOINT;
          const savedModel = result.localModelName || '';
          setEndpoint(savedEndpoint);
          setSelectedModel(savedModel);
          void runConnectionCheck(savedEndpoint, savedModel);
        })
        .catch((error: Error) => {
          console.error(`Error loading local model config: ${error.message}`);
          void runConnectionCheck(DEFAULT_OLLAMA_ENDPOINT);
        });
    },
    [runConnectionCheck, storage]
  );

  function handleEndpointChange(e: ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setEndpoint(value);
    setEndpointError('');

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const normalized = normalizeLocalEndpoint(value);
      if (normalized) {
        setEndpoint(normalized);
        void saveAndCheck(normalized, selectedModel);
      }
    }, 800);
  }

  function handleEndpointBlur(e: FocusEvent<HTMLInputElement>) {
    const value = e.target.value;
    const normalized = normalizeLocalEndpoint(value);
    if (!normalized) {
      setEndpointError(
        'Must be a valid local URL (http://localhost, 127.0.0.1, or 0.0.0.0)'
      );
      return;
    }
    setEndpoint(normalized);
    setEndpointError('');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    void saveAndCheck(normalized, selectedModel);
  }

  async function saveAndCheck(url: string, model: string) {
    await storage.set({ localModelEndpoint: url, localModelName: model });
    await runConnectionCheck(url, model);
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

  function handleCheckAgain() {
    const normalized = normalizeLocalEndpoint(endpoint);
    if (normalized) {
      setEndpoint(normalized);
      void saveAndCheck(normalized, selectedModel);
    }
  }

  const models =
    connectionStatus?.status === OllamaStatus.Connected
      ? connectionStatus.models
      : [];
  const isCustomServer = connectionStatus?.status === OllamaStatus.CustomServer;
  const dropdownDisabled =
    connectionStatus === null ||
    connectionStatus.status === OllamaStatus.NotRunning ||
    connectionStatus.status === OllamaStatus.NoModels;

  return (
    <Box>
      <Heading as="h1" textAlign="center" mb={4}>
        Local Model Setup
      </Heading>

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
        modelAvailability={connectionStatus}
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
    </Box>
  );
};

interface StatusProps {
  modelAvailability: OllamaModelAvailability | null;
  isChecking: boolean;
  onCheckAgain: () => void;
}

function ConnectionStatusDisplay({
  modelAvailability,
  isChecking,
  onCheckAgain,
}: StatusProps) {
  if (isChecking || modelAvailability === null) {
    return (
      <Box display="flex" alignItems="center" gap={2}>
        <Spinner size="xs" color="gray.500" />
        <Text fontSize="sm" color="gray.500">
          Checking connection…
        </Text>
      </Box>
    );
  }

  switch (modelAvailability.status) {
    case OllamaStatus.Connected:
      return (
        <Text fontSize="sm" color="green.600" aria-live="polite">
          Connected — {modelAvailability.models.length} model
          {modelAvailability.models.length !== 1 ? 's' : ''} available
        </Text>
      );
    case OllamaStatus.CustomServer:
      return (
        <Text fontSize="sm" color="green.600" aria-live="polite">
          Connected (custom server)
        </Text>
      );
    case OllamaStatus.NoModels:
      return (
        <Box>
          <Text fontSize="sm" color="orange.600" aria-live="polite">
            Connected, but no models found. Pull a model first:{' '}
            <Text as="span" fontFamily="mono">
              ollama pull llama3.2
            </Text>
          </Text>
          <Button size="xs" mt={2} onClick={onCheckAgain}>
            Check again
          </Button>
        </Box>
      );
    default:
      return (
        <Box>
          <Text fontSize="sm" color="red.600" aria-live="polite">
            Can&apos;t reach Ollama at this address. Make sure Ollama is
            running:{' '}
            <Text as="span" fontFamily="mono">
              ollama serve
            </Text>
          </Text>
          {/* Button and link must be vertically centered */}
          <Box mt={2} display="flex" alignItems="center">
            <Button size="xs" onClick={onCheckAgain}>
              Check again
            </Button>
            <Link
              href="https://ollama.ai"
              ml={4}
              isExternal
              fontSize="xs"
              color="blue.500"
            >
              Get Ollama <ExternalLinkIcon mx="2px" />
            </Link>
          </Box>
        </Box>
      );
  }
}

export default LocalModelConfig;
