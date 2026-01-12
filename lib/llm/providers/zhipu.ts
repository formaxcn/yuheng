import { ILLMProvider, LLMImagePart } from "../interface";
import { logger } from "@/lib/logger";

export class ZhipuProvider implements ILLMProvider {
    private apiKey: string;
    private modelName: string;
    private baseUrl = 'https://open.bigmodel.cn/api/paas/v4';

    constructor(apiKey: string, modelName: string) {
        this.apiKey = apiKey;
        this.modelName = modelName;
    }

    async analyzeImage(imagePart: LLMImagePart, promptText: string): Promise<any> {
        logger.debug({ modelName: this.modelName, promptLength: promptText.length }, "Sending image to Zhipu API for analysis");

        try {
            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
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
                    response_format: { type: "json_object" }
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                logger.error({ status: response.status, error: errorText }, "Zhipu API error");
                throw new Error(`Zhipu API error: ${response.status}`);
            }

            const data = await response.json();
            const text = data.choices?.[0]?.message?.content || "";
            logger.debug({ textLength: text.length, textSnippet: text.slice(0, 100) + '...' }, "Zhipu response received");

            try {
                return JSON.parse(text);
            } catch (e) {
                logger.error({ raw: text }, "Failed to parse Zhipu JSON response");
                throw new Error("Invalid JSON response from Zhipu");
            }
        } catch (e: any) {
            logger.error(e as Error, "Zhipu provider error");
            throw e;
        }
    }

    async generateContent(promptText: string): Promise<string> {
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: this.modelName,
                messages: [{ role: "user", content: promptText }]
            })
        });

        if (!response.ok) {
            throw new Error(`Zhipu API error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || "";
    }
}
