import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");

export const getModel = (modelName: string = "gemini-1.5-flash", apiKey?: string) => {
  const key = apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY || "";
  const genAI = new GoogleGenerativeAI(key);
  return genAI.getGenerativeModel({ model: modelName });
};

/**
 * プロンプトを送信し、テキスト応答を取得する汎用関数
 */
export async function generateText(
  prompt: string, 
  modelName: string = "gemini-1.5-flash", 
  apiKey?: string
): Promise<string> {
  const model = getModel(modelName, apiKey);
  const result = await model.generateContent(prompt);
  return result.response.text();
}

/**
 * JSON 形式での応答を期待する関数
 */
export async function generateJSON<T>(
  prompt: string, 
  modelName: string = "gemini-1.5-flash", 
  apiKey?: string
): Promise<T> {
  const key = apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY || "";
  const genAI = new GoogleGenerativeAI(key);
  const jsonModel = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: { responseMimeType: "application/json" }
  });

  const result = await jsonModel.generateContent(prompt);
  return JSON.parse(result.response.text()) as T;
}
