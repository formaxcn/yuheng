import { ILLMProvider, LLMImagePart } from "../interface";
import { logger } from "@/lib/logger";
import { logLLMError, logLLMRequest, logLLMResponse } from "../logger-utils";

export class ZhipuProvider implements ILLMProvider {
    private apiKey: string;
    private modelName: string;
    private baseUrl = 'https://open.bigmodel.cn/api/paas/v4';

    constructor(apiKey: string, modelName: string) {
        this.apiKey = apiKey;
        this.modelName = modelName;
    }

    async analyzeImage(imagePart: LLMImagePart, promptText: string): Promise<any> {
        logLLMRequest("Zhipu", this.modelName, promptText, imagePart);

        const startTime = Date.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

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
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                // Construct a fake error object to leverage our standardized logger
                const errorObj = new Error(`Zhipu API error: ${response.status}`);
                (errorObj as any).response = { status: response.status, statusText: response.statusText, headers: response.headers };
                throw errorObj;
            }

            const data = await response.json();
            logLLMResponse("Zhipu", data);

            const text = data.choices?.[0]?.message?.content || "";

            try {
                return JSON.parse(text);
            } catch (e) {
                logger.error({ raw: text }, "Failed to parse Zhipu JSON response");
                throw new Error("Invalid JSON response from Zhipu");
            }
        } catch (e: any) {
            clearTimeout(timeoutId);

            if (e.name === 'AbortError') {
                logLLMError("Zhipu", new Error('Zhipu API request timed out after 60 seconds'));
                throw new Error('Zhipu API request timed out after 60 seconds');
            }

            logLLMError("Zhipu", e);
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
