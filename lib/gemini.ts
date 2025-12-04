import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const modelName = process.env.MODEL || "gemini-1.5-flash";

if (!apiKey) {
    console.warn("GEMINI_API_KEY is not set");
}

const genAI = new GoogleGenerativeAI(apiKey || "");

export async function analyzeImage(imagePart: { inlineData: { data: string; mimeType: string } }, promptText: string) {
    const model = genAI.getGenerativeModel({ model: modelName });

    const result = await model.generateContent([promptText, imagePart]);
    const response = await result.response;
    const text = response.text();

    // Clean up markdown code blocks if present
    const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();

    try {
        return JSON.parse(jsonStr);
    } catch (e) {
        console.error("Failed to parse Gemini response:", text);
        throw new Error("Invalid JSON response from Gemini");
    }
}

export async function fixDish(promptText: string, imagePart?: { inlineData: { data: string; mimeType: string } }) {
    const model = genAI.getGenerativeModel({ model: modelName });

    const content = imagePart ? [promptText, imagePart] : [promptText];
    const result = await model.generateContent(content);
    const response = await result.response;
    const text = response.text();

    const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();

    try {
        return JSON.parse(jsonStr);
    } catch (e) {
        console.error("Failed to parse Gemini response:", text);
        throw new Error("Invalid JSON response from Gemini");
    }
}
