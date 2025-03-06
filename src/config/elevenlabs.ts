export const ELEVENLABS_API_KEY = 'sk_c72808fdd1d40fce30b45a25a1f6adaf04cdee9f12ad1c87';
export const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

// Default female voice ID (Rachel - Professional and versatile female voice)
export const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM';

// Voice settings according to ElevenLabs API docs
export const VOICE_SETTINGS = {
    stability: 0.5,           // Range: 0-1
    similarity_boost: 0.75,   // Range: 0-1
    model_id: "eleven_monolingual_v1", // Production ready model
    voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75
    },
    optimize_streaming_latency: 0, // Range: 0-4
    output_format: "mp3_44100_128"
}; 