import OpenAI from "openai";
import { ILLMProvider, LLMImagePart } from "../interface";
import { logger } from "@/lib/logger";
import { logLLMError, logLLMRequest, logLLMResponse } from "../logger-utils";

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
        logLLMRequest("OpenAI", this.modelName, promptText, imagePart);

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
            logLLMResponse("OpenAI", text);

            try {
                return JSON.parse(text);
            } catch (e) {
                logger.error({ raw: text }, "Failed to parse OpenAI compatible JSON response");
                throw new Error("Invalid JSON response from LLM");
            }
        } catch (e: any) {
            logLLMError("OpenAI", e);
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
