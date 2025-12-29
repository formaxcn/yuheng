import { GoogleGenerativeAI } from "@google/generative-ai";
import { ILLMProvider, LLMImagePart } from "../interface";
import { logger } from "@/lib/logger";

export class GeminiProvider implements ILLMProvider {
    private genAI: GoogleGenerativeAI;
    private modelName: string;

    constructor(apiKey: string, modelName: string) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.modelName = modelName;
    }

    async analyzeImage(imagePart: LLMImagePart, promptText: string): Promise<any> {
        const model = this.genAI.getGenerativeModel({ model: this.modelName });
        logger.debug({ modelName: this.modelName, promptLength: promptText.length }, "Sending image to Gemini for analysis");

        try {
            const result = await model.generateContent([promptText, imagePart]);
            const response = await result.response;
            const text = response.text();

            logger.debug({ textLength: text.length, textSnippet: text.slice(0, 100) + '...' }, "Gemini response received");

            const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
            try {
                return JSON.parse(jsonStr);
            } catch (e) {
                logger.error({ raw: text }, "Failed to parse Gemini JSON response");
                throw new Error("Invalid JSON response from LLM");
            }
        } catch (e: any) {
            logger.error(e as Error, "Gemini API error");
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
