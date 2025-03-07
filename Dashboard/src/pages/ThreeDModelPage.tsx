import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mic, MicOff, X, Glasses } from 'lucide-react';
import * as THREE from 'three';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
import { elevenLabsService } from '../services/elevenLabsService';
import { DEFAULT_VOICE_ID } from '../config/elevenlabs';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';
import { useAI } from '../hooks/useAI';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { avatarService } from '../services/avatarService';
import { isVRSupported } from '../utils/deviceDetection';

interface LoaderProgress {
  loaded: number;
  total: number;
}

interface MorphTargetGroups {
  eyes: string[];
  mouth: string[];
  brow: string[];
  cheek: string[];
  nose: string[];
  jaw: string[];
  viseme: string[];
  other: string[];
}

interface VoiceType {
  type: 'default' | 'cloned';
}

const ThreeDModelPage = () => {
  const navigate = useNavigate();
  const [voiceOption, setVoiceOption] = useState<VoiceType>({ type: 'default' });
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [audioElements, setAudioElements] = useState<HTMLAudioElement[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState('');
  const { transcript, startListening, stopListening } = useVoiceRecognition();
  const { generateResponse } = useAI();
  const containerRef = useRef<HTMLDivElement>(null);
  const modelRef = useRef<THREE.Group | null>(null);
  const morphTargetMeshRef = useRef<THREE.Mesh | null>(null);
  const morphGroupsRef = useRef<MorphTargetGroups | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const [vrSupported, setVRSupported] = useState(false);
  const [isVRMode, setIsVRMode] = useState(false);

  const isClonedVoice = (voice: VoiceType): boolean => {
    return voice.type === 'cloned';
  };

  // Initialize morph targets when model is loaded
  const initializeMorphTargets = (mesh: THREE.Mesh) => {
    if (!mesh.morphTargetDictionary) return;

    const availableMorphs = Object.keys(mesh.morphTargetDictionary);
    console.log('Available morph targets:', availableMorphs);
    
    // Group morph targets by type
    morphGroupsRef.current = {
      eyes: availableMorphs.filter(name => name.toLowerCase().includes('eye')),
      mouth: availableMorphs.filter(name => name.toLowerCase().includes('mouth')),
      brow: availableMorphs.filter(name => name.toLowerCase().includes('brow')),
      cheek: availableMorphs.filter(name => name.toLowerCase().includes('cheek')),
      nose: availableMorphs.filter(name => name.toLowerCase().includes('nose')),
      jaw: availableMorphs.filter(name => name.toLowerCase().includes('jaw')),
      viseme: availableMorphs.filter(name => name.toLowerCase().includes('viseme')),
      other: availableMorphs.filter(name => 
        !name.toLowerCase().match(/(eye|mouth|brow|cheek|nose|jaw|viseme)/))
    };

    // Initialize all morph target influences to 0
    if (mesh.morphTargetInfluences) {
      mesh.morphTargetInfluences.fill(0);
    }

    // Setup materials
    if (mesh.material) {
      (mesh.material as THREE.Material).side = THREE.DoubleSide;
      (mesh.material as THREE.Material).transparent = true;
      (mesh.material as THREE.Material).needsUpdate = true;
    }
  };

  // Apply morph target animation based on audio
  const updateMorphTargets = () => {
    if (!morphTargetMeshRef.current || !analyzerRef.current || !isSpeaking || !morphTargetMeshRef.current.morphTargetInfluences) return;

    const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount);
    analyzerRef.current.getByteFrequencyData(dataArray);

    // Get frequency data for detailed analysis
    const frequencies = [...dataArray];
    const bassIntensity = frequencies.slice(0, 10).reduce((a, b) => a + b, 0) / 1280;
    const midIntensity = frequencies.slice(10, 30).reduce((a, b) => a + b, 0) / 2560;
    const highIntensity = frequencies.slice(30, 50).reduce((a, b) => a + b, 0) / 2560;

    // Calculate overall audio intensity with focus on speech frequencies
    const speechFreqs = frequencies.slice(5, 100);
    const sum = speechFreqs.reduce((a, b) => a + b, 0);
    const audioIntensity = Math.min(0.2, (sum / speechFreqs.length) / 300);

    // Reset all morph target influences
    morphTargetMeshRef.current.morphTargetInfluences.fill(0);

    if (audioIntensity > 0.05) {
      // Base mouth opening with teeth showing
      const mouthOpenAmount = Math.min(0.15, audioIntensity * 0.2);
      applyMorphTarget("mouthOpen", mouthOpenAmount);
      applyMorphTarget("jawOpen", mouthOpenAmount * 0.1);

      // Show teeth by rolling lips slightly
      applyMorphTarget("mouthRollUpper", -mouthOpenAmount * 0.3);
      applyMorphTarget("mouthRollLower", -mouthOpenAmount * 0.2);

      // Apply visemes based on frequency bands
      if (bassIntensity > 0.3) {
        // O/U sounds - round shapes
        applyMorphTarget("viseme_O", bassIntensity * 0.1);
        applyMorphTarget("viseme_U", bassIntensity * 0.08);
        applyMorphTarget("mouthPucker", bassIntensity * 0.06);
      }
      
      if (midIntensity > 0.3) {
        // A/E sounds - wide shapes
        applyMorphTarget("viseme_aa", midIntensity * 0.1);
        applyMorphTarget("viseme_E", midIntensity * 0.08);
        applyMorphTarget("mouthStretch", midIntensity * 0.04);
      }
      
      if (highIntensity > 0.3) {
        // Consonants
        applyMorphTarget("viseme_FF", highIntensity * 0.08);
        applyMorphTarget("viseme_TH", highIntensity * 0.06);
        applyMorphTarget("viseme_DD", highIntensity * 0.05);
        applyMorphTarget("viseme_kk", highIntensity * 0.05);
      }

      // Subtle jaw movement
      const jawMovement = Math.sin(performance.now() * 0.003) * 0.02;
      applyMorphTarget("jawLeft", Math.max(0, jawMovement) * audioIntensity * 0.04);
      applyMorphTarget("jawRight", Math.max(0, -jawMovement) * audioIntensity * 0.04);

      // Expressions based on intensity
      if (audioIntensity > 0.15) {
        applyMorphTarget("browInnerUp", audioIntensity * 0.04);
        applyMorphTarget("eyeWideLeft", audioIntensity * 0.03);
        applyMorphTarget("eyeWideRight", audioIntensity * 0.03);
        applyMorphTarget("mouthSmile", audioIntensity * 0.04);
      }
    } else {
      // Resting face
      applyMorphTarget("viseme_sil", 0.3);
      applyMorphTarget("mouthClose", 0.05);
      
      // Subtle idle movements
      const idleTime = performance.now() * 0.0001;
      const subtleMovement = Math.sin(idleTime) * 0.01;
      applyMorphTarget("mouthLeft", Math.max(0, subtleMovement) * 0.01);
      applyMorphTarget("mouthRight", Math.max(0, -subtleMovement) * 0.01);
    }

    // Random blinking
    if (Math.random() < 0.01) {
      applyMorphTarget("eyesClosed", 1);
      setTimeout(() => {
        applyMorphTarget("eyesClosed", 0);
      }, 150);
    }
  };

  const applyMorphTarget = (name: string, value: number) => {
    if (!morphTargetMeshRef.current?.morphTargetDictionary) return;
    
    const index = morphTargetMeshRef.current.morphTargetDictionary[name];
    if (typeof index === 'number' && morphTargetMeshRef.current?.morphTargetInfluences) {
      morphTargetMeshRef.current.morphTargetInfluences[index] = value;
    }
  };

  useEffect(() => {
    // Remove mobile check and only check VR support
    const checkVRSupport = async () => {
      const supported = await isVRSupported();
      setVRSupported(supported);
    };
    
    checkVRSupport();
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize Three.js scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    cameraRef.current = camera;
    camera.position.set(0, 1.5, 4);

    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true
    });
    rendererRef.current = renderer;
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    
    // Enable WebXR
    renderer.xr.enabled = true;
    containerRef.current.appendChild(renderer.domElement);

    // Add VR button if supported - remove mobile check
    if (vrSupported) {
      const vrButton = VRButton.createButton(renderer);
      vrButton.style.display = isVRMode ? 'block' : 'none';
      containerRef.current.appendChild(vrButton);
    }

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // Add fill light from the front
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
    fillLight.position.set(0, 1, 2);
    scene.add(fillLight);

    // Add VR controllers if in VR mode
    let controllers: THREE.XRGripSpace[] = [];
    if (isVRMode) {
      const controllerModelFactory = new XRControllerModelFactory();
      
      for (let i = 0; i < 2; i++) {
        const controller = renderer.xr.getController(i);
        scene.add(controller);
        
        const grip = renderer.xr.getControllerGrip(i);
        const model = controllerModelFactory.createControllerModel(grip);
        grip.add(model);
        scene.add(grip);
        
        controllers.push(grip);
      }
    }

    // Add OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    
    // Configure controls
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.5;
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.minPolarAngle = Math.PI / 2.5;
    controls.maxPolarAngle = Math.PI / 1.8;
    controls.target.set(0, 1.5, 0);

    // Initialize audio context and analyzer
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      const analyzer = audioContext.createAnalyser();
      analyzer.fftSize = 2048; // Higher FFT size for better frequency resolution
      analyzer.smoothingTimeConstant = 0.8; // Smooth transitions between frequency changes
      analyzer.minDecibels = -90;
      analyzer.maxDecibels = -10;
      analyzerRef.current = analyzer;

      // Resume audio context if it's suspended
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
    } catch (error) {
      console.error('Error initializing audio context:', error);
    }

    // Load the 3D model
    const loader = new GLTFLoader();
    const modelPath = avatarService.getAvatarPath();
    
    loader.load(
      modelPath,
      (gltf: GLTF) => {
        if (modelRef.current) {
          scene.remove(modelRef.current);
        }
        
        modelRef.current = gltf.scene;
        
        // Position the model for VR
        if (isVRMode) {
          gltf.scene.position.set(0, 1.5, -1.5); // Adjusted height and distance
          gltf.scene.rotation.set(0, Math.PI, 0); // Rotate 180 degrees to face user
          gltf.scene.scale.setScalar(1.2); // Slightly larger in VR
        } else {
          gltf.scene.position.set(0, 0, 0);
          const box = new THREE.Box3().setFromObject(gltf.scene);
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 2.5 / maxDim;
          gltf.scene.scale.multiplyScalar(scale);
        }
        
        scene.add(gltf.scene);
        
        // Initialize morph targets
        gltf.scene.traverse((child) => {
          if (child instanceof THREE.Mesh && child.morphTargetDictionary) {
            morphTargetMeshRef.current = child;
            initializeMorphTargets(child);
          }
        });
      },
      (progress: LoaderProgress) => {
        console.log('Loading progress:', (progress.loaded / progress.total * 100) + '%');
      },
      (error: unknown) => {
        console.error('Error loading model:', error);
      }
    );

    // Animation loop
    const animate = () => {
      if (!isVRMode) {
        requestAnimationFrame(animate);
      }
      if (controlsRef.current) {
        controlsRef.current.update();
      }
      updateMorphTargets();
      renderer.render(scene, camera);
    };

    // Use setAnimationLoop for VR
    renderer.setAnimationLoop(isVRMode ? animate : null);
    
    if (!isVRMode) {
      animate();
    }

    // Handle window resize
    const handleResize = () => {
      if (!containerRef.current || !camera || !renderer) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      if (controlsRef.current) {
        controlsRef.current.update();
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (containerRef.current) {
        const vrButton = containerRef.current.querySelector('.VRButton');
        if (vrButton) {
          vrButton.remove();
        }
        if (renderer.domElement) {
          containerRef.current.removeChild(renderer.domElement);
        }
      }
      if (controlsRef.current) {
        controlsRef.current.dispose();
      }
      controllers.forEach(controller => {
        scene.remove(controller);
      });
    };
  }, [isVRMode, vrSupported]);

  const startSession = async (selectedVoice: VoiceType) => {
    if (isClonedVoice(selectedVoice)) {
      // Store the return destination in localStorage
      localStorage.setItem('returnTo', '/3d-model');
      // Redirect to voice clone page
      navigate('/voice-clone');
      return;
    }

    setVoiceOption(selectedVoice);
    try {
      const response = await fetch('http://localhost:8080/api/sessions/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        setIsSessionActive(true);
        // Initialize session with greeting
        const greeting = "Hello! I'm your AI therapy assistant. How can I help you today?";
        setMessages([{ role: 'assistant', content: greeting }]);
        
        try {
          // Use cloned voice ID or fall back to default female voice
          const voiceId = selectedVoice.type === 'cloned' 
            ? elevenLabsService.getVoiceId() 
            : DEFAULT_VOICE_ID;
          
          // Generate speech using the selected voice
          const audioBuffer = await elevenLabsService.generateSpeech(greeting, selectedVoice.type === 'cloned');
          const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
          const audio = new Audio(URL.createObjectURL(blob));
          
          // Set up audio analysis
          if (audioContextRef.current && analyzerRef.current) {
            const source = audioContextRef.current.createMediaElementSource(audio);
            source.connect(analyzerRef.current);
            analyzerRef.current.connect(audioContextRef.current.destination);
          }
          
          setAudioElements(prev => [...prev, audio]);
          
          // Handle audio events
          audio.onplay = () => setIsSpeaking(true);
          audio.onended = () => {
            setIsSpeaking(false);
            setAudioElements(prev => prev.filter(a => a !== audio));
            URL.revokeObjectURL(audio.src);
          };
          
          await audio.play();
        } catch (error) {
          console.error('Error playing audio:', error);
        }
      }
    } catch (error) {
      console.error('Failed to start session:', error);
    }
  };

  // Check if returning from voice clone page
  useEffect(() => {
    const checkVoiceCloneReturn = async () => {
      const returnTo = localStorage.getItem('returnTo');
      if (returnTo === '/3d-model' && elevenLabsService.getVoiceId()) {
        // Clear the return destination
        localStorage.removeItem('returnTo');
        // Start session with cloned voice
        await startSession({ type: 'cloned' });
      }
    };

    checkVoiceCloneReturn();
  }, []);

  const handleMicClick = async () => {
    if (isListening) {
      stopListening();
      setIsListening(false);
      setProcessing(true);
      setStatus('Thinking...');
      
      try {
        // Only proceed if there's actual transcript content
        if (transcript.trim()) {
          try {
            // Resume audio context if it's suspended
            if (audioContextRef.current?.state === 'suspended') {
              await audioContextRef.current.resume();
            }

            // Get response from Gemini
            const aiResponse = await generateResponse(transcript, null);
            if (aiResponse) {
              // Add message to chat
              setMessages(prev => [...prev, 
                { role: 'user', content: transcript },
                { role: 'assistant', content: aiResponse }
              ]);

              // Generate speech using the selected voice
              const audioBuffer = await elevenLabsService.generateSpeech(
                aiResponse,
                voiceOption.type === 'cloned'
              );
              
              // Create audio element
              const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
              const audio = new Audio(URL.createObjectURL(blob));
              
              // Set up audio analysis for lip sync
              if (audioContextRef.current && analyzerRef.current) {
                const source = audioContextRef.current.createMediaElementSource(audio);
                source.connect(analyzerRef.current);
                analyzerRef.current.connect(audioContextRef.current.destination);
              }
              
              // Add to audio elements array
              setAudioElements(prev => [...prev, audio]);
              
              // Handle audio events
              audio.onplay = () => {
                console.log('Audio started playing');
                setIsSpeaking(true);
                // Reset any existing morph targets
                if (morphTargetMeshRef.current?.morphTargetInfluences) {
                  morphTargetMeshRef.current.morphTargetInfluences.fill(0);
                }
              };
              
              audio.onended = () => {
                console.log('Audio finished playing');
                setIsSpeaking(false);
                // Reset morph targets when done speaking
                if (morphTargetMeshRef.current?.morphTargetInfluences) {
                  morphTargetMeshRef.current.morphTargetInfluences.fill(0);
                }
                setAudioElements(prev => prev.filter(a => a !== audio));
                URL.revokeObjectURL(audio.src);
              };

              // Add error handling for audio
              audio.onerror = (error) => {
                console.error('Audio playback error:', error);
                setIsSpeaking(false);
                setStatus('Error playing audio');
                setTimeout(() => setStatus(''), 2000);
              };
              
              // Ensure audio is loaded before playing
              audio.oncanplaythrough = async () => {
                try {
                  console.log('Audio ready to play');
                  await audio.play();
                } catch (error) {
                  console.error('Error playing audio:', error);
                  setStatus('Error playing audio');
                  setTimeout(() => setStatus(''), 2000);
                }
              };

              // Load the audio
              audio.load();
            }
          } catch (error) {
            console.error('Error playing audio:', error);
            setStatus('Error playing audio');
            setTimeout(() => setStatus(''), 2000);
          }
        }
      } catch (error) {
        console.error('Error in conversation:', error);
        setStatus('Error processing message');
        setTimeout(() => setStatus(''), 2000);
      }
      
      setProcessing(false);
      setStatus('');
    } else {
      // Start listening
      try {
        if (audioContextRef.current?.state === 'suspended') {
          await audioContextRef.current.resume();
        }
        await startListening();
        setIsListening(true);
        setStatus('Listening...');
      } catch (error) {
        console.error('Error starting voice recognition:', error);
        setStatus('Error starting microphone');
        setTimeout(() => setStatus(''), 2000);
      }
    }
  };

  const endSession = () => {
    setIsSessionActive(false);
    setMessages([]);
    audioElements.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
    setAudioElements([]);
    setIsSpeaking(false);
    setStatus('');
  };

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      audioElements.forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
        if (audio.src) {
          URL.revokeObjectURL(audio.src);
        }
      });
    };
  }, [audioElements]);

  // Function to toggle VR mode
  const toggleVRMode = () => {
    setIsVRMode(!isVRMode);
  };

  useEffect(() => {
    if (!isVRMode) return;

    const continuousSpeech = async () => {
      if (!isSessionActive) return;
      
      try {
        const response = await generateResponse([...messages, { role: 'user', content: 'Please continue our conversation naturally.' }]);
        if (response) {
          const audioBlob = await elevenLabsService.textToSpeech(response, DEFAULT_VOICE_ID);
          const audio = new Audio(URL.createObjectURL(audioBlob));
          
          setAudioElements(prev => [...prev, audio]);
          
          audio.onplay = () => {
            setIsSpeaking(true);
            if (morphTargetMeshRef.current?.morphTargetInfluences) {
              morphTargetMeshRef.current.morphTargetInfluences.fill(0);
            }
          };
          
          audio.onended = () => {
            setIsSpeaking(false);
            if (morphTargetMeshRef.current?.morphTargetInfluences) {
              morphTargetMeshRef.current.morphTargetInfluences.fill(0);
            }
            setAudioElements(prev => prev.filter(a => a !== audio));
            URL.revokeObjectURL(audio.src);
            
            // Continue speaking after a short pause
            setTimeout(continuousSpeech, 2000);
          };
          
          await audio.play();
        }
      } catch (error) {
        console.error('Error in continuous speech:', error);
        // Retry after error
        setTimeout(continuousSpeech, 5000);
      }
    };

    if (isSessionActive) {
      continuousSpeech();
    }

    return () => {
      audioElements.forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
        if (audio.src) {
          URL.revokeObjectURL(audio.src);
        }
      });
    };
  }, [isVRMode, isSessionActive]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Back Button */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            <span>Back to Chat</span>
          </button>

          {/* VR Mode Button - Show on all devices */}
          <div className="flex items-center space-x-4">
            {vrSupported && (
              <button
                onClick={toggleVRMode}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105 ${
                  isVRMode 
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700' 
                    : 'bg-[#12121A]/90 hover:bg-[#1A1A23]/90'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg ${
                  isVRMode
                    ? 'bg-white/10'
                    : 'bg-gradient-to-br from-purple-500/10 to-pink-500/10'
                } flex items-center justify-center`}>
                  <Glasses className={`w-5 h-5 ${
                    isVRMode ? 'text-white' : 'text-purple-400'
                  }`} />
                </div>
                <span className={`font-medium ${
                  isVRMode
                    ? 'text-white'
                    : 'bg-gradient-to-r from-purple-400 to-pink-400 text-transparent bg-clip-text'
                }`}>{isVRMode ? 'Exit VR' : 'VR Mode'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative flex-1 flex flex-col items-center justify-center min-h-[calc(100vh-5rem)]">
        {/* 3D Model Container */}
        <div 
          ref={containerRef} 
          className="absolute inset-0 flex items-center justify-center"
          style={{ 
            background: 'radial-gradient(circle at center, rgba(17, 24, 39, 0.7) 0%, rgba(17, 24, 39, 0.9) 100%)'
          }}
        />

        {/* Status Indicator */}
        {status && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
            <div className="bg-gray-800 px-6 py-2 rounded-full shadow-lg border border-gray-700/50">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  status === 'Listening...' ? 'bg-green-500 animate-pulse' : 
                  status === 'Thinking...' ? 'bg-yellow-500 animate-pulse' : 
                  'bg-blue-500 animate-pulse'
                }`}></div>
                <span className="text-white font-medium">{status}</span>
              </div>
            </div>
          </div>
        )}

        {/* Voice Selection UI */}
        {!isSessionActive && (
          <div className="relative z-10 max-w-md mx-auto px-6">
            <div className="bg-gray-800 bg-opacity-90 rounded-lg p-6 shadow-xl">
              <h2 className="text-2xl font-bold mb-6 text-center">
                Choose Voice Option
              </h2>
              <div className="space-y-4">
                <button
                  onClick={() => startSession({ type: 'default' })}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  Use Default Voice
                </button>
                <button
                  onClick={() => startSession({ type: 'cloned' })}
                  className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                >
                  Use Cloned Voice
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Control buttons */}
        {isSessionActive && (
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleMicClick}
                className={`p-4 rounded-full shadow-xl transition-all duration-200 ${
                  isListening
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-blue-500 hover:bg-blue-600'
                }`}
                disabled={processing}
              >
                {isListening ? (
                  <MicOff className="w-6 h-6 text-white" />
                ) : (
                  <Mic className="w-6 h-6 text-white" />
                )}
              </button>
              <button
                onClick={endSession}
                className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 shadow-xl transition-colors"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ThreeDModelPage; 