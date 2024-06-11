import React from 'react';
import ReactDOM from 'react-dom/client';
import { ChakraProvider, ColorModeScript, ThemeConfig } from '@chakra-ui/react';
import App from './App.tsx';
import theme from './theme';

import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ColorModeScript
      initialColorMode={(theme.config as ThemeConfig).initialColorMode}
    />
    <ChakraProvider theme={theme}>
      <App />
    </ChakraProvider>
  </React.StrictMode>
);
