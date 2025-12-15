# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2025-12-15

### Added

- Support for `gpt-5.2`, `gpt-5.1`, `gpt-5`, `gpt-5-mini`, and `gpt-5-nano`.
- Support for `gpt-4.1`, `gpt-4.1-mini`, and `gpt-4.1-nano`.

### Removed

- Snapshot-specific models such as `gpt-4.5-preview-2025-02-27` and `o3-mini-2025-01-31`.

### Changed

- Centralized the OpenAI model catalog.

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
