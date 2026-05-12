import { RecognizedDish } from '../recognition/types';

export interface LLMImagePart {
    inlineData: {
        data: string;
        mimeType: string;
    };
}

export interface ILLMProvider {
    analyzeImage(imagePart: LLMImagePart, promptText: string): Promise<RecognizedDish[]>;
    generateContent(promptText: string): Promise<string>;
}
