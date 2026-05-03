import ReactDOM from 'react-dom/client';
import { CacheProvider } from '@emotion/react';
import createCache, { EmotionCache } from '@emotion/cache';
import { Box, ChakraProvider, HStack, Spinner, Text } from '@chakra-ui/react';
import theme from '../popup/theme';

const HOST_ID = 'barra-ai-status-host';
const PILL_OFFSET_PX = 8;
const VIEWPORT_MARGIN_PX = 4;
// Worst-case dimensions used only to clamp the pill inside the viewport on
// tiny fields. The pill itself is sized by its content; these are upper bounds.
const PILL_ESTIMATED_WIDTH_PX = 110;
const PILL_ESTIMATED_HEIGHT_PX = 28;

export interface StatusIndicator {
  show(anchor: HTMLElement): void;
  hide(): void;
}

interface PillCoords {
  top: number;
  left: number;
}

function computePosition(anchor: HTMLElement): PillCoords {
  const rect = anchor.getBoundingClientRect();
  const top = Math.max(
    VIEWPORT_MARGIN_PX,
    rect.top - PILL_ESTIMATED_HEIGHT_PX - PILL_OFFSET_PX
  );
  const right = Math.min(window.innerWidth - VIEWPORT_MARGIN_PX, rect.right);
  const left = Math.max(VIEWPORT_MARGIN_PX, right - PILL_ESTIMATED_WIDTH_PX);
  return { top, left };
}

export function createStatusIndicator(): StatusIndicator {
  let host: HTMLDivElement | null = null;
  let root: ReactDOM.Root | null = null;
  let cache: EmotionCache | null = null;
  let currentAnchor: HTMLElement | null = null;

  const renderPill = (anchor: HTMLElement) => {
    if (!root || !cache) return;
    const { top, left } = computePosition(anchor);
    // Position via inline style so reposition (scroll/resize) doesn't churn a
    // new emotion class on every render.
    root.render(
      <CacheProvider value={cache}>
        <ChakraProvider theme={theme} resetCSS={false} disableGlobalStyle>
          <Box
            data-testid="barra-ai-pill"
            position="fixed"
            style={{ top: `${top}px`, left: `${left}px` }}
            zIndex={2147483647}
            pointerEvents="none"
            bg="blackAlpha.800"
            color="white"
            px={2.5}
            py={1}
            borderRadius="full"
            boxShadow="md"
            fontFamily="system-ui, sans-serif"
          >
            <HStack spacing={2}>
              <Spinner size="xs" thickness="2px" speed="0.7s" />
              <Text fontSize="xs" fontWeight="medium">
                Thinking…
              </Text>
            </HStack>
          </Box>
        </ChakraProvider>
      </CacheProvider>
    );
  };

  const handleViewportChange = () => {
    if (currentAnchor) renderPill(currentAnchor);
  };

  return {
    show(anchor: HTMLElement): void {
      currentAnchor = anchor;

      if (!host) {
        host = document.createElement('div');
        host.id = HOST_ID;
        document.body.appendChild(host);
        // Open mode so the shadow tree remains inspectable in DevTools and in
        // tests. Style isolation comes from the shadow boundary itself, not
        // from the mode.
        const shadow = host.attachShadow({ mode: 'open' });
        cache = createCache({ key: 'barra-ai', container: shadow });
        root = ReactDOM.createRoot(shadow);
        // Capture-phase scroll catches scrollable ancestors, not just window.
        window.addEventListener('scroll', handleViewportChange, {
          passive: true,
          capture: true,
        });
        window.addEventListener('resize', handleViewportChange, {
          passive: true,
        });
      }

      renderPill(anchor);
    },

    hide(): void {
      currentAnchor = null;
      if (!host) return;
      window.removeEventListener('scroll', handleViewportChange, true);
      window.removeEventListener('resize', handleViewportChange);
      root?.unmount();
      root = null;
      cache = null;
      host.remove();
      host = null;
    },
  };
}
