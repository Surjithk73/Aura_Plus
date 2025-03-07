'use client';

import { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import clsx from 'clsx';

type PhotoType = 'frontal' | 'left' | 'right';

const LoadingOverlay = () => {
  const [loadingStep, setLoadingStep] = useState(0);
  const steps = [
    "Analyzing photo angles...",
    "Processing image quality...",
    "Preparing for model training...",
    "Initializing neural network...",
    "Generating mesh structure...",
    "Optimizing vertex positions...",
    "Applying textures...",
    "Final processing..."
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setLoadingStep((prev) => (prev + 1) % steps.length);
    }, 4000); // Change message every 4 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 backdrop-blur-xl z-50 flex flex-col items-center justify-center">
      <div className="w-64 h-64 relative">
        <div className="absolute inset-0 border-8 border-[#c1ff72] border-t-transparent rounded-full animate-spin"></div>
        <div className="absolute inset-4 border-8 border-white border-t-transparent rounded-full animate-spin-slow"></div>
      </div>
      <div className="mt-8 text-center">
        <h2 className="text-2xl font-bold text-white mb-4">Processing Images</h2>
        <div className="space-y-2 text-gray-300">
          <p className="animate-pulse h-6">{steps[loadingStep]}</p>
          <p className="text-sm text-gray-500 mt-4">This process may take several minutes...</p>
        </div>
      </div>
    </div>
  );
};

export default function Home() {
  const [photos, setPhotos] = useState<Record<PhotoType, string | null>>({
    frontal: null,
    left: null,
    right: null
  });
  const [bodyType, setBodyType] = useState<'male' | 'female'>('male');
  const [isLoading, setIsLoading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[], type: PhotoType) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      const reader = new FileReader();
      reader.onload = () => {
        setPhotos(prev => ({
          ...prev,
          [type]: reader.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const getDropzone = (type: PhotoType) => {
    const { getRootProps, getInputProps } = useDropzone({
      accept: {
        'image/jpeg': ['.jpeg', '.jpg'],
        'image/png': ['.png']
      },
      maxFiles: 1,
      onDrop: (files) => onDrop(files, type)
    });

    return (
      <div className="relative">
        <div
          {...getRootProps()}
          className="border-2 border-dashed border-gray-300 rounded-2xl h-64 w-48 flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors"
        >
          <input {...getInputProps()} />
          {photos[type] ? (
            <img
              src={photos[type]!}
              alt={`${type} photo`}
              className="w-full h-full object-cover rounded-2xl"
            />
          ) : (
            <div className="text-gray-400">+</div>
          )}
        </div>
        <div className="absolute -top-8 left-0 text-white">
          {type === 'frontal' ? '1. Frontal' : type === 'left' ? '2. Left' : '3. Right'}
        </div>
      </div>
    );
  };

  const handleUpload = () => {
    setIsLoading(true);
    // Simulate longer processing time (5 minutes)
    setTimeout(() => {
      setIsLoading(false);
      // Here you would normally handle the success state
    }, 300000); // 300 seconds = 5 minutes
  };

  return (
    <div className="content-overlay">
      {isLoading && <LoadingOverlay />}
      <main className="min-h-screen flex flex-col items-center py-12 px-4 relative">
        <div className="absolute top-8 left-8">
          <h1 className="text-white text-2xl font-bold tracking-wide">aura+</h1>
        </div>
        
        <div className="text-center mb-12 mt-16">
          <h1 className="text-white text-2xl flex items-center gap-2 mb-2">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-white">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Upload 3 photos to create an avatar
          </h1>
          <p className="text-gray-400">Drag and drop or browse to choose a file (jpeg or png)</p>
        </div>

        <div className="flex gap-8 mb-12">
          {getDropzone('frontal')}
          {getDropzone('left')}
          {getDropzone('right')}
        </div>

        <div className="bg-[#2c2d30] p-6 rounded-xl max-w-2xl w-full mb-8">
          <div className="flex items-center gap-2 text-[#c1ff72] mb-4">
            <span>IMPORTANT!</span>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-gray-300">You'll get best results if the photos are similar to how you scan with camera at Aura+</span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-gray-300">
            <div className="flex items-center gap-2">
              <span>📏</span>
              <span>The face should be at selfie-distance (max ~0.7m distance to face).</span>
            </div>
            <div className="flex items-center gap-2">
              <span>📸</span>
              <span>All photos should be shot with same camera.</span>
            </div>
            <div className="flex items-center gap-2">
              <span>🔍</span>
              <span>Long distance to face will cause distortion.</span>
            </div>
            <div className="flex items-center gap-2">
              <span>👓</span>
              <span>Take off your glasses and tie your hair.</span>
            </div>
            <div className="flex items-center gap-2">
              <span>📐</span>
              <span>Images should be vertical, 3:4 or 9:16.</span>
            </div>
            <div className="flex items-center gap-2">
              <span>☀️</span>
              <span>Good Lighting leads to best results.</span>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <span className="text-gray-400 mr-4">Choose body type</span>
          <button
            onClick={() => setBodyType('male')}
            className={clsx('px-4 py-2 rounded-full', bodyType === 'male' ? 'bg-[#c1ff72] text-black' : 'border border-gray-600 text-gray-400')}
          >
            ♂️
          </button>
          <button
            onClick={() => setBodyType('female')}
            className={clsx('px-4 py-2 rounded-full ml-2', bodyType === 'female' ? 'bg-[#c1ff72] text-black' : 'border border-gray-600 text-gray-400')}
          >
            ♀️
          </button>
        </div>

        <button
          onClick={handleUpload}
          className={clsx(
            'px-8 py-3 rounded-lg font-medium',
            Object.values(photos).every(p => p) 
              ? 'bg-[#c1ff72] text-black hover:bg-[#b1ef62] transition-colors'
              : 'bg-gray-700 text-gray-400 cursor-not-allowed'
          )}
          disabled={!Object.values(photos).every(p => p) || isLoading}
        >
          {isLoading ? 'Processing...' : `Upload ${Object.values(photos).filter(p => p).length}/3`}
        </button>
      </main>
    </div>
  );
} 