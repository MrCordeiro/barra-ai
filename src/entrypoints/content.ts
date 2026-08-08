import { defineContentScript } from '#imports';

import { initializeContentScript } from '../content/content';

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    initializeContentScript();
  },
});
