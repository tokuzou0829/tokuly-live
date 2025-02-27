'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from "next/navigation";
import { Session } from 'next-auth';
import { Card } from '@/components/ui/card';
import Chat from "@/app/(main)/live/[id]/chat";
import { useAudioMixer } from './hooks/useAudioMixer';
import { useVideoSources } from './hooks/useVideoSources';
import { useCanvas } from './hooks/useCanvas';
import { useStreamControl } from './hooks/useStreamControl';
import { StreamControls } from './components/StreamControls';
import { SourceList } from './components/SourceList';
import { AudioMixer } from './components/AudioMixer';
import { Canvas } from './components/Canvas';

export default function WebEncoder({
  ch_pass,
  streamTitle,
  id,
  session
}: {
  ch_pass: string | null;
  streamTitle: string | null;
  id: number;
  session: Session | null;
}) {
  const searchParams = useSearchParams();
  const [streamKey, setStreamKey] = useState(searchParams.get('stream_name') || '');
  const [devices, setDevices] = useState<{
    audioInputs: MediaDeviceInfo[];
    videoInputs: MediaDeviceInfo[];
  }>({ audioInputs: [], videoInputs: [] });
  const [editingName, setEditingName] = useState<string | null>(null);
  const [resolution, setResolution] = useState<'720p' | '1080p'>('720p');
  const [screenShareSettings, setScreenShareSettings] = useState({
    maintainAspectRatio: true,
    resolution: '720p' as '720p' | '1080p'
  });
  const [resizeInfo, setResizeInfo] = useState<{
    sourceId: string;
    type: 'move' | 'resize' | 'crop';
    edge?: 'left' | 'right' | 'top' | 'bottom' | 'corner';
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
    originalX?: number;
    originalY?: number;
  } | null>(null);

  const {
    videoSources,
    selectedSourceId,
    setSelectedSourceId,
    isScreenSharing,
    videoSourcesRef,
    setVideoSources,
    addVideoSource,
    removeSource,
    moveSourceLayer,
    toggleVideoLoop,
    toggleCropping,
    renameSource: renameVideoSource
  } = useVideoSources();

  const {
    audioSources,
    initAudioMixer,
    addAudioSource,
    updateAudioVolume,
    toggleMute,
    toggleLoop,
    playAudio,
    pauseAudio,
    removeAudioSource,
    audioContextRef,
    mainGainNodeRef
  } = useAudioMixer();

  const {
    isStreaming,
    startStreaming,
    stopStreaming
  } = useStreamControl({
    streamKey,
    ch_pass,
    videoSourcesRef,
    mainGainNodeRef
  });

  const drawOverlayCanvas = () => {
    const overlayCanvas = overlayCanvasRef.current;
    if (!overlayCanvas) return;
    const overlayCtx = overlayCanvas.getContext('2d');
    if (!overlayCtx) return;
  
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    if (selectedSourceId) {
      const selectedSource = videoSourcesRef.current.find(s => s.id === selectedSourceId);
      if (selectedSource) {
        drawOverlay(overlayCtx, selectedSource);
      }
    }
  };

  const {
    canvasRef,
    overlayCanvasRef,
    drawCanvas,
    drawOverlay,
    handleCanvasMouseDown,
    handleCanvasMouseMove,
    updateCursor
  } = useCanvas(
    videoSourcesRef,
    setSelectedSourceId,
    selectedSourceId,
    setResizeInfo,
    drawOverlayCanvas
  );

  const loadDevices = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      const devices = await navigator.mediaDevices.enumerateDevices();
      setDevices({
        audioInputs: devices.filter(device => device.kind === 'audioinput'),
        videoInputs: devices.filter(device => device.kind === 'videoinput')
      });
    } catch (err) {
      console.error('Error loading devices:', err);
    }
  };

  const handleResolutionChange = (newResolution: '720p' | '1080p') => {
    setResolution(newResolution);
    const { width, height } = newResolution === '720p' 
      ? { width: 1280, height: 720 } 
      : { width: 1920, height: 1080 };
    
    if (canvasRef.current) {
      canvasRef.current.width = width;
      canvasRef.current.height = height;
    }
    if (overlayCanvasRef.current) {
      overlayCanvasRef.current.width = width;
      overlayCanvasRef.current.height = height;
    }
    
    if (isStreaming) {
      stopStreaming();
      if (audioContextRef.current) {
        startStreaming(audioContextRef.current);
      }
    }
  };

  const handleAddAudioSource = async (deviceId: string) => {
    const sourceId = `mic-${deviceId}`;
    if (audioSources[sourceId]) {
      alert('このマイクは既に追加されています。');
      return;
    }

    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      addAudioSource(sourceId, audioStream, {
        name: `Microphone ${deviceId}`,
        type: 'mic'
      });
    } catch (err) {
      console.error('Error adding microphone:', err);
      alert('Failed to add microphone');
    }
  };

  const handleRemoveSource = (sourceId: string) => {
    // First, check if this is a screen share source
    const isScreenShare = sourceId.startsWith('screen-');
    
    // Remove audio source first if it exists
    if (sourceId.startsWith('audio-') || sourceId.startsWith('mic-') || isScreenShare) {
      removeAudioSource(sourceId);
      
      // For screen share, also check for any related audio sources that might have the same prefix
      if (isScreenShare) {
        Object.keys(audioSources).forEach(audioId => {
          if (audioId.startsWith(sourceId) || 
              (audioId.startsWith('screen-') && sourceId.startsWith('screen-'))) {
            removeAudioSource(audioId);
          }
        });
      }
    }
    
    // Then remove the video source
    removeSource(sourceId);
  };

  const handleRenameSource = (sourceId: string, newName: string) => {
    if (sourceId.startsWith('audio-') || sourceId.startsWith('mic-') || sourceId.startsWith('screen-')) {
      // オーディオソースの名前を更新
      const source = audioSources[sourceId];
      if (source) {
        addAudioSource(sourceId, null, {
          ...source,
          name: newName
        });
      }
    } else {
      renameVideoSource(sourceId, newName);
    }
  };

  useEffect(() => {
    drawCanvas();
    loadDevices();
    navigator.mediaDevices.addEventListener('devicechange', loadDevices);
    
    return () => {
      stopStreaming();
      navigator.mediaDevices.removeEventListener('devicechange', loadDevices);
      Object.values(audioContextRef.current || {}).forEach(mixer => {
        if (mixer.audioElement) {
          mixer.audioElement.pause();
          mixer.audioElement.src = '';
        }
      });
    };
  }, []);

  useEffect(() => {
    drawOverlayCanvas();
  }, [selectedSourceId, videoSources]);

  useEffect(() => {
    videoSourcesRef.current = videoSources;
    drawCanvas();
  }, [videoSources]);

  // Add beforeunload event listener when streaming is active
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isStreaming) {
        // Standard way to show a confirmation dialog
        e.preventDefault();
        // Chrome requires returnValue to be set
        e.returnValue = '配信中です。本当にページを離れますか？';
        return '配信中です。本当にページを離れますか？';
      }
    };

    if (isStreaming) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isStreaming]);

  return (
    <div className="h-full flex flex-col">
      <div className="grid grid-cols-0 md:grid-cols-[minmax(0,400px)_1fr_350px] flex-1">
        <div className="flex flex-col h-full">
          <StreamControls
            streamTitle={streamTitle}
            isStreaming={isStreaming}
            resolution={resolution}
            onResolutionChange={handleResolutionChange}
            onStartStreaming={() => {
              if (!audioContextRef.current) {
                audioContextRef.current = new AudioContext();
              }
              
              // Initialize audio mixer if main gain node is not initialized
              if (!mainGainNodeRef.current) {
                initAudioMixer();
              }
              
              startStreaming(audioContextRef.current);
            }}
            onStopStreaming={stopStreaming}
          />
          <SourceList
            videoSources={videoSources}
            audioSources={audioSources}
            devices={devices}
            selectedSourceId={selectedSourceId}
            isScreenSharing={isScreenSharing}
            editingName={editingName}
            screenShareSettings={screenShareSettings}
            onAddVideoSource={async (type, deviceId) => {
              try {
                const result = await addVideoSource(type, deviceId, screenShareSettings);
                
                // Handle screen sharing audio
                if (type === 'screen' && result && result.stream) {
                  const stream = result.stream;
                  const sourceId = result.sourceId;
                  
                  // Check if screen share has audio tracks
                  if (stream.getAudioTracks().length > 0) {
                    // Initialize audio context and mixer if needed
                    if (!audioContextRef.current) {
                      audioContextRef.current = new AudioContext();
                    }
                    
                    if (!mainGainNodeRef.current) {
                      initAudioMixer();
                    }
                    
                    // Add screen share audio to audio mixer
                    addAudioSource(sourceId, stream, {
                      name: 'Screen Audio',
                      type: 'screen'
                    });
                  }
                }
              } catch (error) {
                console.error('Error adding video source:', error);
              }
            }}
            onAddAudioSource={handleAddAudioSource}
            onAddImageSource={async () => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/*';

              input.onchange = async (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (!file) return;

                const img = new Image();
                const url = URL.createObjectURL(file);
                img.src = url;
                await new Promise((resolve) => (img.onload = resolve));

                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d')!;
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);

                const stream = (canvas as any).captureStream();
                const video = document.createElement('video');
                video.autoplay = true;
                video.playsInline = true;
                video.muted = true;
                video.srcObject = stream;
                
                await new Promise((resolve) => {
                  video.onloadedmetadata = () => {
                    video.play().then(resolve);
                  };
                });
                const sourceId = `image-${Date.now()}`;

                const newSource = {
                  id: sourceId,
                  name: file.name,
                  stream,
                  videoElement: video,
                  x: Math.random() * 100,
                  y: Math.random() * 100,
                  width: 480,
                  height: (480 * img.height) / img.width,
                  originalDimensions: {
                    width: img.width,
                    height: img.height
                  },
                  originalAspectRatio: img.width / img.height,
                  crop: {
                    x: 0,
                    y: 0,
                    width: img.width,
                    height: img.height
                  }
                };

                setVideoSources(prev => [newSource, ...prev]);
              };

              input.click();
            }}
            onAddAudioFileSource={async () => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'audio/*';

              input.onchange = async (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (!file) return;

                const sourceId = `audio-${Date.now()}`;
                const audioElement = new Audio(URL.createObjectURL(file));
                audioElement.volume = 1.0;

                if (!audioContextRef.current) {
                  audioContextRef.current = new AudioContext();
                }

                const source = audioContextRef.current.createMediaElementSource(audioElement);
                const gainNode = audioContextRef.current.createGain();
                source.connect(gainNode);
                
                if (!mainGainNodeRef.current) {
                  const { mainGain } = initAudioMixer();
                  mainGainNodeRef.current = mainGain;
                }
                
                gainNode.connect(mainGainNodeRef.current);
                
                addAudioSource(sourceId, null, {
                  name: file.name,
                  type: 'audio'
                });
              };

              input.click();
            }}
            onAddVideoFile={async () => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'video/*';

              input.onchange = async (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (!file) return;

                const videoUrl = URL.createObjectURL(file);
                const video = document.createElement('video');
                video.src = videoUrl;
                video.autoplay = true;
                video.loop = false;
                video.muted = false;
                video.playsInline = true;

                await new Promise((resolve) => {
                  video.onloadeddata = () => resolve(null);
                });

                if (!audioContextRef.current) {
                  audioContextRef.current = new AudioContext();
                }

                const audioCtx = audioContextRef.current;
                const source = audioCtx.createMediaElementSource(video);
                const gainNode = audioCtx.createGain();
                source.connect(gainNode);
                
                if (!mainGainNodeRef.current) {
                  const { mainGain } = initAudioMixer();
                  mainGainNodeRef.current = mainGain;
                }
                
                gainNode.connect(mainGainNodeRef.current);
                
                const sourceId = `video-${Date.now()}`;
                addAudioSource(sourceId, null, {
                  name: file.name,
                  type: 'audio'
                });

                const stream = (video as any).captureStream();
                const newSource = {
                  id: sourceId,
                  name: file.name,
                  stream,
                  videoElement: video,
                  x: Math.random() * 100,
                  y: Math.random() * 100,
                  width: 480,
                  height: 270,
                  loop: false,
                  originalDimensions: {
                    width: video.videoWidth,
                    height: video.videoHeight
                  },
                  originalAspectRatio: video.videoWidth / video.videoHeight,
                  crop: {
                    x: 0,
                    y: 0,
                    width: video.videoWidth,
                    height: video.videoHeight
                  }
                };

                video.play();
                setVideoSources(prev => [newSource, ...prev]);
              };

              input.click();
            }}
            onRemoveSource={handleRemoveSource}
            onMoveSourceLayer={moveSourceLayer}
            onToggleVideoLoop={toggleVideoLoop}
            onToggleCropping={toggleCropping}
            onRenameSource={handleRenameSource}
            onEditingNameChange={setEditingName}
            onScreenShareSettingsChange={(settings) => 
              setScreenShareSettings(prev => ({ ...prev, ...settings }))
            }
          />
          <AudioMixer
            audioSources={audioSources}
            onUpdateVolume={updateAudioVolume}
            onToggleMute={toggleMute}
            onToggleLoop={toggleLoop}
            onPlayAudio={playAudio}
            onPauseAudio={pauseAudio}
          />
        </div>
        <Canvas
          canvasRef={canvasRef}
          overlayCanvasRef={overlayCanvasRef}
          resolution={resolution}
          resizeInfo={resizeInfo}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={(e) => handleCanvasMouseMove(e, resizeInfo)}
          onMouseUp={() => setResizeInfo(null)}
          onMouseLeave={() => setResizeInfo(null)}
          updateCursor={updateCursor}
        />
        <Chat session={session} id={id} />
      </div>
      <Card className='p-1'>
        <div className='flex px-2 items-center'>
          <p className='text-gray-500 font-semibold'></p>
          <p className='ml-auto text-sm'>StreamKey:{streamKey}</p>
        </div>
      </Card>  
    </div>
  );
}
