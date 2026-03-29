import { useEffect, useState } from 'react';
import {
  Box,
  Heading,
  Text,
  Code,
  Alert,
  AlertIcon,
  AlertDescription,
  Link,
} from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { chromeStorage, type StorageChangeListener } from '../../storages';
import { PROVIDER_CONFIG, PROVIDERS } from '../../models';

interface Props {
  hasApiKey?: boolean;
}

const Home = ({ hasApiKey = true }: Props) => {
  const [showWarning, setShowWarning] = useState(!hasApiKey);

  useEffect(
    function checkAndShowWarning() {
      if (hasApiKey) {
        setShowWarning(false);
        return;
      }

      const apiKeyStorageKeys = PROVIDERS.map(
        p => PROVIDER_CONFIG[p].storageKey
      );
      const watchedKeys = [...apiKeyStorageKeys, 'localModelEnabled'];

      const checkStorage = () => {
        chromeStorage
          .get(watchedKeys)
          .then(result => {
            const localEnabled = result.localModelEnabled === 'true';
            setShowWarning(
              !localEnabled && apiKeyStorageKeys.every(key => !result[key])
            );
          })
          .catch((error: Error) => {
            console.error(`Error loading settings: ${error.message}`);
          });
      };

      checkStorage();

      const handleStorageChange: StorageChangeListener = (
        changes,
        areaName
      ) => {
        if (areaName !== 'local') return;
        if (watchedKeys.every(key => !(key in changes))) return;
        checkStorage();
      };

      chromeStorage.addChangeListener(handleStorageChange);
      return () => {
        chromeStorage.removeChangeListener(handleStorageChange);
      };
    },
    [hasApiKey]
  );

  return (
    <Box
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      minHeight="calc(100vh - 4rem)"
      boxSizing="border-box"
      pt={8}
      pb={20}
    >
      <Box display="flex" flexDirection="column" justifyContent="center">
        <Heading mb={4} as="h1" textAlign="center">
          Raawr!! 🦖 <br />
          Barrasaur is live!
        </Heading>
        <Text mt={6} textAlign="center">
          To generate a post, type <Code>/ai</Code> followed by your prompt and
          press {'"'}Tab{'"'}.
        </Text>
      </Box>
      {showWarning && (
        <Alert
          status="warning"
          borderRadius="md"
          position="absolute"
          bottom={4}
          left="50%"
          transform="translateX(-50%)"
          width="calc(100% - 2rem)"
          zIndex={10}
        >
          <AlertIcon />
          <AlertDescription>
            No API key set.{' '}
            <Link as={RouterLink} to="/settings" color="orange.500">
              Go to Settings
            </Link>{' '}
            to add one — or{' '}
            <Link as={RouterLink} to="/local-model-gate" color="orange.500">
              run AI locally, for free
            </Link>
            .
          </AlertDescription>
        </Alert>
      )}
    </Box>
  );
};

export default Home;
