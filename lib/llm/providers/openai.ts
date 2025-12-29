import OpenAI from "openai";
import { ILLMProvider, LLMImagePart } from "../interface";
import { logger } from "@/lib/logger";

export class OpenAIProvider implements ILLMProvider {
    private client: OpenAI;
    private modelName: string;

    constructor(apiKey: string, modelName: string, baseUrl?: string) {
        this.client = new OpenAI({
            apiKey: apiKey,
            baseURL: baseUrl || undefined,
        });
        this.modelName = modelName;
    }

    async analyzeImage(imagePart: LLMImagePart, promptText: string): Promise<any> {
        logger.debug({ modelName: this.modelName, promptLength: promptText.length }, "Sending image to OpenAI compatible provider for analysis");

        try {
            const response = await this.client.chat.completions.create({
                model: this.modelName,
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: promptText },
                            {
                                type: "image_url",
                                image_url: {
                                    url: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`,
                                },
                            },
                        ],
                    },
                ],
                response_format: { type: "json_object" },
            });

            const text = response.choices[0].message.content || "";
            logger.debug({ textLength: text.length, textSnippet: text.slice(0, 100) + '...' }, "OpenAI compatible response received");

            try {
                return JSON.parse(text);
            } catch (e) {
                logger.error({ raw: text }, "Failed to parse OpenAI compatible JSON response");
                throw new Error("Invalid JSON response from LLM");
            }
        } catch (e: any) {
            logger.error(e as Error, "OpenAI compatible API error");
            throw e;
        }
    }

    async generateContent(promptText: string): Promise<string> {
        const response = await this.client.chat.completions.create({
            model: this.modelName,
            messages: [{ role: "user", content: promptText }],
        });
        return response.choices[0].message.content || "";
    }
}
