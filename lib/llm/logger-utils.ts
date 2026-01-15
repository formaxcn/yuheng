import { logger } from "@/lib/logger";
import { LLMImagePart } from "./interface";

export function logLLMRequest(provider: string, model: string, prompt: string, imagePart?: LLMImagePart) {
    const maskedPrompt = maskSensitiveData(prompt);

    const logData: any = {
        provider,
        model,
        promptLength: prompt.length,
        promptSnippet: maskedPrompt.slice(0, 500),
    };

    if (imagePart) {
        logData.image = {
            mimeType: imagePart.inlineData.mimeType,
            sizeKB: Math.round(imagePart.inlineData.data.length / 1024),
        };
    }

    logger.info(logData, `[${provider}] Starting LLM Request`);
}

export function logLLMResponse(provider: string, response: any) {
    let responseData = response;

    // Attempt to stringify if it's an object to ensure it logs nicely, 
    // but try-catch in case of circular refs (though unlikely for LLM responses)
    try {
        if (typeof response === 'object') {
            responseData = JSON.stringify(response, null, 2);
        }
    } catch (e) {
        // ignore
    }

    logger.info({
        provider,
        responseLength: String(responseData).length,
        response: responseData
    }, `[${provider}] LLM Response Received`);
}

export function logLLMError(provider: string, error: any) {
    logger.error({
        provider,
        error: error.message || String(error),
        stack: error.stack,
        details: error.response ? {
            status: error.response.status,
            statusText: error.response.statusText,
            headers: error.response.headers
        } : undefined
    }, `[${provider}] LLM Request Failed`);
}

function maskSensitiveData(text: string): string {
    // Simple regex to catch common API key formats if they accidentally slip into prompt
    // This is a basic safeguard; primary security is avoiding putting keys in prompts.
    return text.replace(/(sk-[a-zA-Z0-9]{20,})/g, 'sk-***')
        .replace(/(AIza[a-zA-Z0-9-_]{35})/g, 'AIza***');
}
