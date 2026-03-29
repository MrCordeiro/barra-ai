# <img src="public/icons/icon_48.png" width="45" align="left"> Barra AI (/ai)

Welcome to Barra AI, the most straightforward, no-frills, barebones AI browser extension you'll ever need. We've cut the fluff and focused on raw AI power. No subscriptions, no cute robots, just you and the model of your choice — including local, offline models via [Ollama](https://ollama.com) with no API key required.

Type `/ai ` followed by your prompt in **any input or text field**, press Tab, and the extension will fetch a streamed response from your selected model, updating the field as chunks arrive.

("barra" means "slash" in Portuguese, as in `/ai`)

## Features

### 🦖 Dino-powered simplicity

- **No popups, no sidebars**: Type /ai followed by your prompt in any text field and hit Tab. Boom! Instant AI response.
- **Streaming output**: Watch the model response appear in real time.
- **Works with Lexical editors**: Includes Reddit, WhatsApp, Facebook, Instagram, and Threads.
- **Offline / no-key mode**: Run fully local models via [Ollama](https://ollama.com) — no API key, no internet, no data leaving your machine.
- **Cloud models too**: OpenAI GPT, Anthropic Claude, and Google Gemini are all supported with your own API key.
- **Client-side processing**: All data stays in your browser's local storage. API requests go directly from your browser to the provider — no middleman. Doubt us? Just [check the code](https://github.com/MrCordeiro/barra-ai), we are open-source!
- **Free and open-source**: While all browsers will soon offer this feature natively, Barra AI gives you a taste of the punk future now. And for free!

### TLDR

- 🚫 NO Subscriptions
- 🚫 NO Cute Robots
- 🚫 NO Middlemen
- 🚫 NO Bullshit
- ✅ Works offline with local models (Ollama)
- ✅ Dinosaur icon! Because dinosaurs are cool – and so are you.

## Install

[**Chrome** extension](https://chromewebstore.google.com/detail/barraai/ehdmmalhleifjcfemdonbaemcbblfpja)

## Usage

1. Install the Extension:

- Download and install the Barra AI extension from the Chrome Web Store.

2. Configure your model:

**Option A — Local model (no API key needed):**

- Install [Ollama](https://ollama.com) and pull at least one model (e.g. `ollama pull llama3.2`).
- Open the extension settings, enable **Local model**, and follow the setup steps.
- The extension will connect to Ollama at `http://localhost:11434` by default.

**Option B — Cloud model:**

- Open the extension settings page.
- Enter your API key for OpenAI, Anthropic, or Google Gemini.
- Select your preferred model from the dropdown.

3. Usage:

- In any text input or field, type `/ai` followed by your prompt.
- Press the `Tab` key.
- The field's content is replaced progressively as the streamed response arrives.

## Limitations

- Some highly customized editors may still block synthetic paste events or override key handling.
- If a page aggressively remaps `Tab`, click the target field again and retry `/ai` + `Tab`.

## Development

1. Fork the repository
2. Run `npm run build`
3. Open chrome://extensions
4. Check the Developer mode checkbox
5. Click on the Load unpacked extension button
6. Select the folder `barra-ai/dist`
