import { useState } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ZyphraClient } from '@zyphra/client';

const client = new ZyphraClient({ apiKey: 'zsk-729237f9c3ca8eb3396136c07c537375ec89c71f5511b0000ad506b3522ea174' });

export const useAI = () => {
  const [loading, setLoading] = useState(false);

  const generateResponse = async (input: string, audioFile: File | null) => {
    setLoading(true);
    try {
      // Log the user's input
      console.log('User Input:', input);

      const genAI = new GoogleGenerativeAI('AIzaSyCT43QYBuN8a4dA8Pq6i9wxXmgHPPnO8a0');
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

      const prompt = `You are therapist with 15 years of experience. Your role is to provide empathetic, professional support in a concise manner. Follow these guidelines:

1. Keep responses brief, typically 1-3 short sentences.
2. Use active listening, reflecting the user's emotions concisely.
3. Ask short, open-ended questions to encourage exploration.
4. Provide brief, evidence-based insights when appropriate.
5. Recognize AI limitations; recommend human help when needed.
6. Maintain a warm, professional tone throughout.
7. Adapt language to the user's style, remaining concise.
8. Use "I" statements to personalize responses.
9. Prioritize the user's well-being and safety always.

Remember, your goal is supportive, brief interactions that encourage self-reflection and growth. Respond to the following input from a client: "${input}"`;
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      console.log(response.text());
      // Check if an audio file is provided
      if (audioFile) {
        // Read and encode audio file using FileReader
        const audioBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64data = reader.result as string;
            resolve(base64data.split(',')[1]); // Get the base64 string without the prefix
          };
          reader.onerror = reject;
          reader.readAsDataURL(audioFile); // Read the file as a data URL
        });

        // Generate speech with cloned voice
        const audioBlob = await client.audio.speech.create({
          text: response.text(),
          speaker_audio: audioBase64,
          model: 'zonos-v0.1-hybrid',
          speaking_rate: 15
        });

        // Speak the AI's response using the cloned voice
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.play();
      } else {
        // Speak the AI's response using the existing speakText function
        await speakText(response.text());
      }
      
      return response.text();
    } catch (error) {
      console.error('Error generating AI response:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const speakText = async (text: string) => {
    try {
      const audioBlob = await client.audio.speech.create({
        text: text,
        speaking_rate: 15,
        model: 'zonos-v0.1-hybrid', // Default model
      });

      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.play();
    } catch (error) {
      console.error('Error in text-to-speech:', error);
    }
  };

  return { generateResponse, loading, speakText };
};