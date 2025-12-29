import fs from 'fs';
import path from 'path';
import { logger } from './logger';

export type PromptName = 'gemini-dish-init-prompt' | 'gemini-dish-fix-prompt';

export interface PromptVariables {
    [key: string]: string | number | undefined;
}

export class PromptManager {
    private static instance: PromptManager;
    private promptsDir: string;

    private constructor() {
        this.promptsDir = path.join(process.cwd(), 'prompts');
    }

    public static getInstance(): PromptManager {
        if (!PromptManager.instance) {
            PromptManager.instance = new PromptManager();
        }
        return PromptManager.instance;
    }

    /**
     * Loads a prompt from the prompts directory and replaces variables.
     * Variables should be in the format {{variableName}} in the prompt file.
     */
    public async getPrompt(name: PromptName, variables: PromptVariables = {}): Promise<string> {
        const filePath = path.join(this.promptsDir, `${name}.txt`);

        try {
            let content = fs.readFileSync(filePath, 'utf-8');

            // Replace variables
            for (const [key, value] of Object.entries(variables)) {
                if (value !== undefined) {
                    const regex = new RegExp(`{{${key}}}`, 'g');
                    content = content.replace(regex, String(value));
                }
            }

            return content;
        } catch (error) {
            logger.error({ error, name }, 'Failed to load prompt');
            throw new Error(`Failed to load prompt: ${name}`);
        }
    }
}

export const promptManager = PromptManager.getInstance();
