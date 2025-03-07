import React from 'react';
import { Upload, RefreshCw } from 'lucide-react';

interface AudioUploadProps {
  setAudioFile: (file: File | null) => void;
  voiceCloned: boolean;
  onResetVoice: () => void;
}

const AudioUpload: React.FC<AudioUploadProps> = ({ setAudioFile, voiceCloned, onResetVoice }) => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setAudioFile(selectedFile);
    }
  };

  return (
    <div className="flex flex-col space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-white mb-2">Voice Upload</h3>
        <p className="text-gray-400 text-sm mb-4">
          Upload a voice sample to clone for the AI assistant's responses.
        </p>
      </div>

      <div className="flex flex-col items-center space-y-4">
        <div className="w-full max-w-xs">
          <label className="flex flex-col items-center px-4 py-6 bg-gray-700 text-gray-300 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors">
            <Upload className="w-8 h-8 mb-2" />
            <span className="text-sm">Choose an audio file</span>
            <input
              type="file"
              accept="audio/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>

        {voiceCloned && (
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-green-500 text-sm">Voice cloned successfully</span>
            <button
              onClick={onResetVoice}
              className="ml-2 p-1 text-gray-400 hover:text-white transition-colors"
              title="Reset voice"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="text-xs text-gray-400 text-center">
          Supported formats: MP3, WAV, M4A
          <br />
          Recommended length: 30-60 seconds
        </div>
      </div>
    </div>
  );
};

export default AudioUpload; 