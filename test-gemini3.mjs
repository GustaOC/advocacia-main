import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: 'fake-key-123' });
try {
  await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: 'Hello' }] }],
      config: {
        temperature: 0.2,
      }
    });
} catch(e) {
  console.log(e.message);
}
