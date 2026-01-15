import { ILLMProvider, LLMImagePart } from "../interface";
import { logger } from "@/lib/logger";
import { logLLMError, logLLMRequest, logLLMResponse } from "../logger-utils";

export class ZhipuProvider implements ILLMProvider {
    private apiKey: string;
    private modelName: string;
    private baseUrl = 'https://open.bigmodel.cn/api/paas/v4';
    private pollInterval = 2000; // 2 seconds
    private maxPollTime = 300000; // 5 minutes

    constructor(apiKey: string, modelName: string) {
        this.apiKey = apiKey;
        this.modelName = modelName;
    }

    private async pollResult(taskId: string): Promise<any> {
        const startTime = Date.now();

        while (Date.now() - startTime < this.maxPollTime) {
            const response = await fetch(`${this.baseUrl}/async-result/${taskId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Zhipu poll error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();

            if (data.task_status === 'SUCCESS') {
                return data;
            } else if (data.task_status === 'FAIL') {
                throw new Error(`Zhipu task failed: ${JSON.stringify(data)}`);
            }

            // Still processing, wait before next poll
            await new Promise(resolve => setTimeout(resolve, this.pollInterval));
        }

        throw new Error('Zhipu task timed out during polling');
    }

    async analyzeImage(imagePart: LLMImagePart, promptText: string): Promise<any> {
        logLLMRequest("Zhipu", this.modelName, promptText, imagePart);

        try {
            const response = await fetch(`${this.baseUrl}/async/chat/completions`, {
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
                const errorObj = new Error(`Zhipu API error: ${response.status}`);
                (errorObj as any).response = { status: response.status, statusText: response.statusText, headers: response.headers };
                throw errorObj;
            }

            const initialData = await response.json();
            const taskId = initialData.id;

            if (!taskId) {
                throw new Error("No task ID returned from Zhipu async call");
            }

            logger.debug({ taskId }, "Zhipu async task created, polling...");

            const data = await this.pollResult(taskId);
            logLLMResponse("Zhipu", data);

            const text = data.choices?.[0]?.message?.content || "";

            try {
                return JSON.parse(text);
            } catch (e) {
                logger.error({ raw: text }, "Failed to parse Zhipu JSON response");
                throw new Error("Invalid JSON response from Zhipu");
            }
        } catch (e: any) {
            logLLMError("Zhipu", e);
            throw e;
        }
    }

    async generateContent(promptText: string): Promise<string> {
        try {
            const response = await fetch(`${this.baseUrl}/async/chat/completions`, {
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

            const initialData = await response.json();
            const taskId = initialData.id;

            if (!taskId) {
                throw new Error("No task ID returned from Zhipu async call");
            }

            const data = await this.pollResult(taskId);
            return data.choices?.[0]?.message?.content || "";
        } catch (e: any) {
            logLLMError("Zhipu", e);
            throw e;
        }
    }
}
