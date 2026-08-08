import { defineContentScript } from 'wxt/utils/define-content-script';

import '../content/content';

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    return undefined;
  },
});
