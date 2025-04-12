# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - Unpublished

### Added

- Support for `gpt-4.5-preview-2025-02-27`.
- Support for `o3-mini-2025-01-31`.

### Removed

- Support for `gpt-3.5-turbo-0125`.

### Changed

- Bumped vite, rollup, and other dependencies to the latest versions via dependabot.

## [1.0.0] - 2024-08-02

Because the extension was published on the Chrome Web Store, we increased the major version to v1. Despite that, this version is fully backwards compatible.

### Added

- Support for `gpt-4o-mini`.

### Removed

- Permission for `ActiveTab`, which weren't being used.

## [0.1.0] - 2024-06-14

### Added

- Type `/ai` followed by a prompt in any input or text field, press Tab, and get a response from OpenAI's GPT model.
- Securely store your OpenAI API key locally in your browser.
- Direct API requests from the browser, with no backend involved.
