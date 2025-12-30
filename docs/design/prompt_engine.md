# Prompt Management

YuHeng features a decoupled prompt management system that keeps AI instructions separate from the application logic. This allows for easier iteration on AI behavior without changing code.

## Architecture

The system is centered around the `PromptManager` class in `lib/prompts.ts`:
- **Template Storage**: Prompts are stored as `.txt` files in the `prompts/` directory at the project root.
- **Variable Injection**: Uses a simple `{{variable}}` syntax for dynamic data injection.
- **Singleton Pattern**: The `promptManager` is a singleton instance used throughout the backend API.

## How it Works

### 1. Prompt Definition
A typical prompt file (e.g., `prompts/dish-init-prompt.txt`) contains base instructions and placeholders for runtime data:

```text
You are a professional nutritionist. 
Please analyze this food photo in {{language}}.
Return the results in {{unit}}...
```

### 2. Variable Replacement
When the code requests a prompt, it passes a `variables` object:

```typescript
const prompt = await promptManager.getPrompt('dish-init-prompt', {
    language: 'English',
    unit: 'kcal'
});
```

The `PromptManager` reads the file and replaces all occurrences of `{{language}}` and `{{unit}}` with the provided values.

## Benefits
- **Language Agnostic**: Prompts can be easily adapted for multiple languages by injecting a language variable or using different prompt sets.
- **Clear Separation**: Nutritionists or prompt engineers can modify AI behavior by editing text files, without needing to understand the underlying TypeScript code.
- **Version Control**: Changes to AI behavior are tracked via Git as simple text diffs.
