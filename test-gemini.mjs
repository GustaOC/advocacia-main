import { GoogleGenAI } from '@google/genai';
try {
  const ai = new GoogleGenAI({ apiKey: 'fake-key' });
  console.log("ai.models:", typeof ai.models);
} catch (e) {
  console.error(e);
}
