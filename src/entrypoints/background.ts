import { defineBackground } from 'wxt/utils/define-background';

import { initializeBackground } from '../background/background';

export default defineBackground(() => {
  initializeBackground();
});
