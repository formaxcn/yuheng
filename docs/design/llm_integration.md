# LLM Providers & Configuration

YuHeng leverages Large Language Models (LLMs) to provide advanced food recognition and nutritional analysis. It supports multiple providers through a factory-based architecture.

## Supported Providers

- **Google Gemini**: The primary provider, optimized for vision-language tasks. Recommended models: `gemini-2.5-flash`, `gemini-2.5-pro`.
- **Zhipu AI**: Official support for Zhipu (GLM) models.
- **OpenAI**: Support for `gpt-4o` and `gpt-4o-mini`.
- **OpenAI Compatible**: Support for any API that follows the OpenAI specification, allowing integration with local models or other providers like DeepSeek, Qwen-VL, GLM-4V, and Doubao.

## Architecture

The LLM abstraction layer is located in `lib/llm/`:
- `interface.ts`: Defines the common `LLMProvider` interface (e.g., `analyzeImage`, `fixDish`).
- `factory.ts`: Instantiates the correct provider implementation based on user settings.
- `providers/`: Contains implementation-specific logic for each provider.

## Configuration

LLM settings can be configured in the application's **Settings** page:

1. **Provider Select**: Choose between Gemini, OpenAI, or Compatible.
2. **API Key**: Securely store your provider's API key.
3. **Model Name**: Use the combobox to select from available cloud models or type to enter a custom model name directly.
4. **Base URL** (Compatible only): specify the endpoint for your OpenAI-compatible service.

## Security

API keys are stored in the application's persistent settings. On the server, they are used to initialize the appropriate LLM client for each request, ensuring that keys are handled securely and not exposed to the client-side code where possible.
