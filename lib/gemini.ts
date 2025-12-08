import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "@/lib/logger";

const apiKey = process.env.GEMINI_API_KEY;
const modelName = process.env.MODEL || "gemini-1.5-flash";

if (!apiKey) {
    logger.warn("GEMINI_API_KEY is not set");
}

const genAI = new GoogleGenerativeAI(apiKey || "");

export async function analyzeImage(imagePart: { inlineData: { data: string; mimeType: string } }, promptText: string) {
    const model = genAI.getGenerativeModel({ model: modelName });

    logger.debug("Sending image to Gemini for analysis", { modelName, promptLength: promptText.length });

    try {
        const result = await model.generateContent([promptText, imagePart]);
        const response = await result.response;
        const text = response.text();

        logger.debug("Gemini response received", { textLength: text.length, textSnippet: text.slice(0, 100) + '...' });

        // Clean up markdown code blocks if present
        const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();

        try {
            return JSON.parse(jsonStr);
        } catch (e) {
            logger.debug("Gemini raw response:", text);
            logger.error("Failed to parse Gemini response:", e);
            throw new Error("Invalid JSON response from Gemini");
        }
    } catch (e: any) {
        logger.error("Gemini API error:", e);
        throw e;
    }
}

export async function fixDish(promptText: string, imagePart?: { inlineData: { data: string; mimeType: string } }) {
    const model = genAI.getGenerativeModel({ model: modelName });

    logger.debug("Sending fix request to Gemini", { modelName, promptLength: promptText.length, hasImage: !!imagePart });

    try {
        const content = imagePart ? [promptText, imagePart] : [promptText];
        const result = await model.generateContent(content);
        const response = await result.response;
        const text = response.text();

        logger.debug("Gemini fix response received", { textLength: text.length, textSnippet: text.slice(0, 100) + '...' });

        const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();

        try {
            return JSON.parse(jsonStr);
        } catch (e) {
            logger.debug("Gemini raw fix response:", text);
            logger.error("Failed to parse Gemini fix response:", e);
            throw new Error("Invalid JSON response from Gemini");
        }
    } catch (e: any) {
        logger.error("Gemini API error (fix):", e);
        throw e;
    }
}
