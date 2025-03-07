import React, { useState } from 'react';
import { Upload, X } from 'lucide-react';
import { avatarService } from '../services/avatarService';

interface AvatarUploadProps {
  onClose: () => void;
}

const AvatarUpload: React.FC<AvatarUploadProps> = ({ onClose }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.name.endsWith('.glb')) {
        setSelectedFile(file);
        setError(null);
      } else {
        setError('Please select a .glb file');
        setSelectedFile(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError(null);

    try {
      console.log('Starting avatar upload...', {
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileType: selectedFile.type
      });

      const formData = new FormData();
      formData.append('avatar', selectedFile);

      console.log('Sending request to server...');
      const response = await fetch('http://localhost:8080/api/avatar/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      });

      console.log('Server response status:', response.status);
      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
        console.log('Server response data:', data);
      } else {
        const text = await response.text();
        console.log('Server response text:', text);
        throw new Error('Invalid response format from server');
      }

      if (!response.ok) {
        throw new Error(data.error || `Server error: ${response.status}`);
      }

      if (!data.path) {
        throw new Error('No path received from server');
      }

      // Update the avatar path in the service
      console.log('Upload successful, updating avatar path:', data.path);
      avatarService.setAvatarPath(data.path);

      // Close the modal after successful upload
      onClose();
    } catch (error) {
      console.error('Detailed upload error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      setError(error instanceof Error ? error.message : 'Failed to upload avatar. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#12121A] rounded-xl shadow-2xl w-full max-w-md p-6 border border-[#2A2A35]/20">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">Upload Avatar</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="border-2 border-dashed border-[#2A2A35] rounded-lg p-8 text-center">
            <input
              type="file"
              accept=".glb"
              onChange={handleFileSelect}
              className="hidden"
              id="avatar-upload"
            />
            <label
              htmlFor="avatar-upload"
              className="cursor-pointer flex flex-col items-center space-y-4"
            >
              <div className="w-12 h-12 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                <Upload className="w-6 h-6 text-indigo-400" />
              </div>
              <div className="text-gray-400">
                <span className="text-indigo-400 hover:text-indigo-300 transition-colors">
                  Click to upload
                </span>{' '}
                or drag and drop
                <p className="text-sm">GLB file only</p>
              </div>
            </label>
          </div>

          {selectedFile && (
            <div className="bg-[#1A1A23] rounded-lg p-4">
              <p className="text-gray-400 truncate">{selectedFile.name}</p>
            </div>
          )}

          {error && (
            <div className="bg-rose-500/10 text-rose-400 rounded-lg p-4 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
              !selectedFile || uploading
                ? 'bg-gray-700 cursor-not-allowed'
                : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700'
            } text-white`}
          >
            {uploading ? 'Uploading...' : 'Upload Avatar'}
          </button>

          <button
            onClick={() => {
              avatarService.resetToDefault();
              onClose();
            }}
            className="w-full py-3 px-4 rounded-lg font-medium bg-gray-700 hover:bg-gray-600 transition-colors text-white"
          >
            Reset to Default Avatar
          </button>
        </div>
      </div>
    </div>
  );
};

export default AvatarUpload; 