import { useNavigate } from 'react-router-dom';
import { Box, Button, Heading, HStack, Text, VStack } from '@chakra-ui/react';
import { Storage } from '../../storages';
import { STORAGE_KEYS } from '../../storageKeys';

interface Props {
  storage: Storage;
}

const LocalModelGate = ({ storage }: Props) => {
  const navigate = useNavigate();

  const handleSetItUp = () => {
    storage
      .set({
        [STORAGE_KEYS.LOCAL_MODEL_GATE_ACKNOWLEDGED]: 'true',
        [STORAGE_KEYS.LOCAL_MODEL_ENABLED]: 'true',
      })
      .then(() => {
        navigate('/local-model-config');
      })
      .catch((error: Error) => {
        console.error(`Error acknowledging local model gate: ${error.message}`);
      });
  };

  const handleNotForMe = () => {
    navigate('/settings');
  };

  return (
    <Box>
      <Heading as="h2" size="md" mb={4}>
        Local models require extra setup
      </Heading>

      <VStack align="start" spacing={3} mb={6}>
        <Text fontSize="sm">
          Running a model locally means installing Ollama (a separate
          application) and downloading at least one model file — typically 2–8
          GB of disk space per model.
        </Text>
        <Text fontSize="sm">
          If that sounds like more than you want to deal with right now, cloud
          models work with just an API key.
        </Text>
      </VStack>

      <HStack spacing={3}>
        <Button colorScheme="green" onClick={handleSetItUp}>
          Set it up
        </Button>
        <Button variant="ghost" onClick={handleNotForMe}>
          Not for me
        </Button>
      </HStack>
    </Box>
  );
};

export default LocalModelGate;
