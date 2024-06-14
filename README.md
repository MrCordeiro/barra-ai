# <img src="public/icons/icon_48.png" width="45" align="left"> Barra AI (/ai)

Welcome to Barra AI, the most straightforward, no-frills, barebones AI browser extension you'll ever need. We've cut the fluff and focused on raw AI power. No subscriptions, no cute robots, just you and the ramblings of you OpenAI model of choice.

Type `/ai ` followed by your prompt in **any input or text field**, press Tab, and the extension will fetch a response from the GPT model, replacing the field's content with the AI-generated answer.

("barra" means "slash" in Portuguese, as in `/ai`)

## Features

### 🦖 Dino-powered simplicity

- **No popups, no sidebars**: Type /ai followed by your prompt in any text field and hit Tab. Boom! Instant AI response.
- **Works everywhere (almost)**: Integrated seamlessly with most input fields on the web. Sorry, Meta users (Facebook, Instagram, Threads), we're working on it!
- **Bring your own key**: No hidden fees. No subscriptions. No limit usage.
- **Client-side processing**: All the data is stored in your browser's local storage. Requests to Open AI's API is sent directly from your current browser. We don't touch your data – everything happens right in your browser. Doubt us? Just [check the code](https://github.com/MrCordeiro/barra-ai), we are open-source!
- **Free and open-source**: While all browsers will soon offer this feature natively, Barra AI gives you a taste of the punk future now. And for free!

### TLDR

- 🚫 NO Subscriptions
- 🚫 NO Cute Robots
- 🚫 NO Middlemen
- 🚫 NO Bullshit
- ✅ Dinosaur icon! Because dinosaurs are cool – and so are you.

## Install

[**Chrome** extension]() <!-- TODO: Add chrome extension link inside parenthesis -->

## Usage

1. Install the Extension:

- Download and install the Barra AI extension from the Chrome Web Store.

2. Configure Your API Key:

- Open the extension options/settings page.
- Enter your OpenAI API key in the provided input field.
- Select your preferred GPT model from the dropdown (e.g., GPT-3).

3. Usage:

- In any text input or field, type `/ai`followed by your prompt.
- Press the `Tab` key.
- The field's content will be replaced with the AI-generated response.

## Limitations

Barra AI currently does not work with sites that use the Lexical editor framework, including Whatsapp, Facebook, Instagram, and Threads.

## Development

1. Fork the repository
2. Run `npm run build`
3. Open chrome://extensions
4. Check the Developer mode checkbox
5. Click on the Load unpacked extension button
6. Select the folder `barra-ai/dist`
