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

interface Props {
  hasApiKey?: boolean;
}

const Home = ({ hasApiKey = true }: Props) => {
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
      {!hasApiKey && (
        <Alert
          status="warning"
          borderRadius="md"
          position="absolute"
          bottom={2}
          left="50%"
          transform="translateX(-50%)"
          zIndex={10}
        >
          <AlertIcon />
          <AlertDescription>
            No API key set.{' '}
            <Link as={RouterLink} to="/settings" color="orange.500">
              Go to Settings
            </Link>{' '}
            to get started.
          </AlertDescription>
        </Alert>
      )}
    </Box>
  );
};

export default Home;
