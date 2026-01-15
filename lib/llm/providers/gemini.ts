import { GoogleGenerativeAI } from "@google/generative-ai";
import { ILLMProvider, LLMImagePart } from "../interface";
import { logger } from "@/lib/logger";
import { logLLMError, logLLMRequest, logLLMResponse } from "../logger-utils";

export class GeminiProvider implements ILLMProvider {
    private genAI: GoogleGenerativeAI;
    private modelName: string;

    constructor(apiKey: string, modelName: string) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.modelName = modelName;
    }

    async analyzeImage(imagePart: LLMImagePart, promptText: string): Promise<any> {
        logLLMRequest("Gemini", this.modelName, promptText, imagePart);
        const model = this.genAI.getGenerativeModel({ model: this.modelName });

        try {
            const result = await model.generateContent([promptText, imagePart]);
            const response = await result.response;
            const text = response.text();

            logLLMResponse("Gemini", text);

            const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
            try {
                return JSON.parse(jsonStr);
            } catch (e) {
                logger.error("Failed to parse Gemini JSON response", { textSnippet: text.slice(0, 200) });
                throw new Error("Invalid JSON response from LLM");
            }
        } catch (e: any) {
            logLLMError("Gemini", e);
            throw e;
        }
    }

    async generateContent(promptText: string): Promise<string> {
        const model = this.genAI.getGenerativeModel({ model: this.modelName });
        const result = await model.generateContent(promptText);
        const response = await result.response;
        return response.text();
    }
}
