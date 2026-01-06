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
        logger.info(`Starting Gemini analysis with model: ${this.modelName}`);
        logger.debug(`Prompt length: ${promptText.length}`);

        try {
            logger.debug("Calling Gemini API...");
            const result = await model.generateContent([promptText, imagePart]);

            logger.debug("Waiting for Gemini response...");
            const response = await result.response;
            const text = response.text();

            logger.info(`Gemini response received. Length: ${text.length}`);
            logger.debug("Raw response text:", text);

            const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
            try {
                return JSON.parse(jsonStr);
            } catch (e) {
                logger.error("Failed to parse Gemini JSON response", { textSnippet: text.slice(0, 200) });
                throw new Error("Invalid JSON response from LLM");
            }
        } catch (e: any) {
            logger.error("--- Gemini API Error Details ---");
            logger.error(`Message: ${e.message}`);
            if (e.stack) logger.error(`Stack: ${e.stack}`);
            if (e.response) {
                logger.error("Response object found in error:", {
                    status: e.response.status,
                    statusText: e.response.statusText,
                    headers: e.response.headers
                });
            }
            logger.error("---------------------------------");
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
