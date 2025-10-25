import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Gender } from '@/types/analysis';
import { generateSajuAnalysisPrompt } from './prompts';
import { API_TIMEOUT } from '@/constants/app';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);

export type GeminiModel = 'gemini-2.5-flash' | 'gemini-2.5-pro';

export interface GenerateSajuAnalysisInput {
  name: string;
  birthDate: string;
  birthTime?: string;
  isLunar: boolean;
  gender: Gender;
  timeZone?: string;
  additionalInfo?: string;
  model: GeminiModel;
}

/**
 * Generate Saju analysis using Gemini API
 * @param input - Analysis input including model selection
 * @returns Markdown-formatted Saju analysis result
 * @throws Error if API call fails or times out
 */
export async function generateSajuAnalysis(
  input: GenerateSajuAnalysisInput
): Promise<string> {
  // Generate prompt
  const prompt = generateSajuAnalysisPrompt({
    name: input.name,
    birthDate: input.birthDate,
    birthTime: input.birthTime,
    isLunar: input.isLunar,
    gender: input.gender,
    timeZone: input.timeZone,
    additionalInfo: input.additionalInfo,
  });

  // Select model
  const model = genAI.getGenerativeModel({
    model: input.model,
  });

  try {
    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Gemini API request timed out'));
      }, API_TIMEOUT.GEMINI);
    });

    // Generate content with timeout
    const resultPromise = model.generateContent(prompt);

    const result = await Promise.race([resultPromise, timeoutPromise]);
    const response = result.response;
    const text = response.text();

    if (!text || text.trim().length === 0) {
      throw new Error('Empty response from Gemini API');
    }

    return text;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Gemini API error: ${error.message}`);
    }
    throw new Error('Unknown Gemini API error');
  }
}
