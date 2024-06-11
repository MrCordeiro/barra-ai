import { Box, Heading, Text, Code } from '@chakra-ui/react';

const Home = () => {
  return (
    <Box display="flex" flexDirection="column" alignItems={'center'}>
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
