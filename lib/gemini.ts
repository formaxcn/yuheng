import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "@/lib/logger";

import { getSetting } from "@/lib/db";

async function getGenAI() {
    const apiKey = await getSetting("llm_api_key");
    if (!apiKey) {
        logger.warn("llm_api_key is not set in DB settings");
    }
    return new GoogleGenerativeAI(apiKey || "");
}

async function getModelName() {
    const dbModel = await getSetting("llm_model");
    return dbModel || "gemini-2.0-flash";
}

export async function analyzeImage(imagePart: { inlineData: { data: string; mimeType: string } }, promptText: string) {
    const genAI = await getGenAI();
    const modelName = await getModelName();
    const model = genAI.getGenerativeModel({ model: modelName });

    logger.debug({ modelName, promptLength: promptText.length }, "Sending image to Gemini for analysis");

    try {
        const result = await model.generateContent([promptText, imagePart]);
        const response = await result.response;
        const text = response.text();

        logger.debug({ textLength: text.length, textSnippet: text.slice(0, 100) + '...' }, "Gemini response received");

        // Clean up markdown code blocks if present
        const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();

        try {
            return JSON.parse(jsonStr);
        } catch (e) {
            logger.debug({ raw: text }, "Gemini raw response");
            logger.error(e as Error, "Failed to parse Gemini response");
            throw new Error("Invalid JSON response from Gemini");
        }
    } catch (e: any) {
        logger.error(e as Error, "Gemini API error");
        throw e;
    }
}

export async function fixDish(promptText: string, imagePart?: { inlineData: { data: string; mimeType: string } }) {
    const genAI = await getGenAI();
    const modelName = await getModelName();
    const model = genAI.getGenerativeModel({ model: modelName });

    logger.debug({ modelName, promptLength: promptText.length, hasImage: !!imagePart }, "Sending fix request to Gemini");

    try {
        const content = imagePart ? [promptText, imagePart] : [promptText];
        const result = await model.generateContent(content);
        const response = await result.response;
        const text = response.text();

        logger.debug({ textLength: text.length, textSnippet: text.slice(0, 100) + '...' }, "Gemini fix response received");

        const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();

        try {
            return JSON.parse(jsonStr);
        } catch (e) {
            logger.debug({ raw: text }, "Gemini raw fix response");
            logger.error(e as Error, "Failed to parse Gemini fix response");
            throw new Error("Invalid JSON response from Gemini");
        }
    } catch (e: any) {
        logger.error(e as Error, "Gemini API error (fix)");
        throw e;
    }
}
