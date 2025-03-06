import React from 'react';

interface AudioUploadProps {
  setAudioFile: (file: File | null) => void; // Define the prop type
}

const AudioUpload: React.FC<AudioUploadProps> = ({ setAudioFile }) => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setAudioFile(selectedFile); // Store the audio file in the parent component
    }
  };

  return (
    <div className="absolute top-4 right-4">
      <input
        type="file"
        accept="audio/*"
        onChange={handleFileChange}
        className="border rounded p-2"
      />
    </div>
  );
};

export default AudioUpload; 