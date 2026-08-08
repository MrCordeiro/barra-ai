import { defineContentScript } from 'wxt/utils/define-content-script';

import { initializeContentScript } from '../content/content';

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    initializeContentScript();
  },
});
