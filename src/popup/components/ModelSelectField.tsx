import { type ChangeEvent } from 'react';
import {
  FormControl,
  FormLabel,
  HStack,
  Link,
  Select,
  Text,
} from '@chakra-ui/react';
import { DEFAULT_LLM_MODEL, LLM_MODEL_OPTIONS } from '../../models';
import {
  normalizeModelDisplay,
  OllamaModelAvailability,
  OllamaStatus,
} from '../../content/ollama';

const cloudModelValues = new Set<string>(
  LLM_MODEL_OPTIONS.map(model => model.value)
);

interface Props {
  modelName: string;
  localConnStatus: OllamaModelAvailability | null;
  onModelChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  onConfigureLocalModel: () => void;
}

function renderLocalModelsOptions(
  localConnStatus: OllamaModelAvailability | null
) {
  if (!localConnStatus) {
    return (
      <option value="__ollama-loading" disabled>
        Checking Ollama…
      </option>
    );
  }

  switch (localConnStatus.status) {
    case OllamaStatus.NotRunning:
      return (
        <>
          <option value="__ollama-down" disabled>
            Ollama not running
          </option>
          <option value="__ollama-run" disabled>
            Run: ollama serve
          </option>
        </>
      );
    case OllamaStatus.NoModels:
      return (
        <>
          <option value="__ollama-empty" disabled>
            No models installed
          </option>
          <option value="__ollama-pull" disabled>
            Run: ollama pull llama3.2
          </option>
        </>
      );
    case OllamaStatus.Connected:
      return (
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
      );
    default:
      return null;
  }
}

export function ModelSelectField({
  modelName,
  localConnStatus,
  onModelChange,
  onConfigureLocalModel,
}: Props) {
  const activeModelIsCloud = cloudModelValues.has(modelName);
  const isLocalModelSelected = !activeModelIsCloud;

  const localStatusText = (() => {
    if (!isLocalModelSelected) return '';

    if (
      localConnStatus?.status === OllamaStatus.Connected ||
      localConnStatus?.status === OllamaStatus.CustomServer
    ) {
      return `${normalizeModelDisplay(modelName)} · Connected`;
    }

    return '⚠ Ollama not reachable';
  })();

  const localModels =
    localConnStatus?.status === OllamaStatus.Connected
      ? localConnStatus.models
      : [];

  const selectedLocalModelStillAvailable =
    isLocalModelSelected && localModels.includes(modelName);

  return (
    <>
      <FormControl isRequired mt={6}>
        <FormLabel>Model Name</FormLabel>
        <Select
          id="model-name"
          name="modelName"
          value={modelName}
          onChange={onModelChange}
          aria-label="Model Name"
        >
          {LLM_MODEL_OPTIONS.map(model => (
            <option key={model.value} value={model.value}>
              {model.name}
              {model.value === DEFAULT_LLM_MODEL.value ? ' (Recommended)' : ''}
            </option>
          ))}

          <option value="__divider" disabled>
            ------------
          </option>

          {renderLocalModelsOptions(localConnStatus)}

          {isLocalModelSelected && !selectedLocalModelStillAvailable && (
            <option value={modelName}>
              {normalizeModelDisplay(modelName)} (Unavailable)
            </option>
          )}
        </Select>
      </FormControl>

      {(localConnStatus?.status === OllamaStatus.NotRunning ||
        localConnStatus?.status === OllamaStatus.NoModels) && (
        <HStack justify="space-between" align="center" mt={2}>
          <Text fontSize="sm" color="gray.600">
            {localConnStatus.status === OllamaStatus.NotRunning
              ? 'Ollama is unavailable.'
              : 'Install at least one Ollama model to select it.'}
          </Text>
          <Link
            fontSize="sm"
            color="blue.500"
            cursor="pointer"
            onClick={onConfigureLocalModel}
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
            onClick={onConfigureLocalModel}
            aria-label="Configure local model"
          >
            Configure
          </Link>
        </HStack>
      )}
    </>
  );
}
