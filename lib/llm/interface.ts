export interface LLMImagePart {
    inlineData: {
        data: string;
        mimeType: string;
    };
}

export interface ILLMProvider {
    analyzeImage(imagePart: LLMImagePart, promptText: string): Promise<any>;
    generateContent(promptText: string): Promise<string>;
}
