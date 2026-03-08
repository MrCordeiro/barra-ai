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
    <Box display="flex" flexDirection="column" alignItems={'center'}>
      {!hasApiKey && (
        <Alert status="warning" mb={4} borderRadius="md">
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
      <Heading mb={4} as="h1" textAlign={'center'}>
        Raawr!! 🦖 <br />
        Barrasaur is live!
      </Heading>
      <Text mt={6} textAlign={'left'}>
        To generate a post, type <Code>/ai</Code> followed by your prompt and
        press {'"'}Tab{'"'}.
      </Text>
    </Box>
  );
};

export default Home;
