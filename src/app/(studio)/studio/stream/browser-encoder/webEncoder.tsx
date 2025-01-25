'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuPortal } from "@/components/ui/dropdown-menu";
import { Plus, Video, Mic, Monitor, Image as ImageIcon, Music } from "lucide-react"; // Lucideアイコンを使用
import { useSearchParams } from "next/navigation";

interface VideoSource {
  id: string;
  stream: MediaStream;
  videoElement: HTMLVideoElement;
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;  // 名前を追加
  loop?: boolean;  // ループ再生フラグを追加
  isAnimated?: boolean;  // アニメーション有無フラグ
  isEditing?: boolean; // 編集状態を追加
}

interface AudioSource {
  gain: GainNode;
  volume: number;
  muted: boolean;
  loop?: boolean;  // ループ再生フラグを追加
  audioElement?: HTMLAudioElement;  // 音声ファイル用のエレメント
  name: string;  // 名前を追加
  type: 'mic' | 'audio' | 'screen';  // ソースタイプを追加
}

export default function WebEncoder({ch_pass, streamTitle}:{ch_pass: string | null,streamTitle: string | null}) {
  const searchParams = useSearchParams();
  const [isStreaming, setIsStreaming] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [streamKey, setStreamKey] = useState(searchParams.get('stream_name') || '');
  const [devices, setDevices] = useState<{
    audioInputs: MediaDeviceInfo[];
    videoInputs: MediaDeviceInfo[];
  }>({ audioInputs: [], videoInputs: [] });
  const [audioSources, setAudioSources] = useState<{[key: string]: { volume: number, muted: boolean, loop?: boolean, name: string, type: 'mic' | 'audio' | 'screen' }}>({});
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [isCanvasActive, setIsCanvasActive] = useState(true);
  const [videoSources, setVideoSources] = useState<VideoSource[]>([]);
  const [editingName, setEditingName] = useState<string | null>(null);

  const currentStreamRef = useRef<MediaStream | null>(null);
  const wsConnectionRef = useRef<WebSocket | null>(null);
  const activeRecorderRef = useRef<MediaRecorder | null>(null);
  const audioTrackRef = useRef<MediaStreamTrack | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const hlsPlayerRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const videoSourcesRef = useRef<VideoSource[]>([]);
  const dragSourceRef = useRef<{id: string, startX: number, startY: number} | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioMixerRef = useRef<{[key: string]: { gain: GainNode, volume: number, muted: boolean, loop?: boolean, audioElement?: HTMLAudioElement }}>({});
  const mainGainNodeRef = useRef<GainNode | null>(null);
  const [resizeInfo, setResizeInfo] = useState<{
    sourceId: string;
    type: 'move' | 'resize';
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
  } | null>(null);

  const createMediaRecorder = (stream: MediaStream) => {
    let mimeType = 'video/webm;codecs=h264,opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      console.warn('H264 not supported, falling back to VP8');
      mimeType = 'video/webm;codecs=vp8,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        console.error('VP8 also not supported');
        return null;
      }
    }

    const options = {
      mimeType,
      videoBitsPerSecond: 5000000,
      audioBitsPerSecond: 96000,
    };
    
    const recorder = new MediaRecorder(stream, options);
    
    recorder.ondataavailable = async (event) => {
      if (event.data.size > 0 && wsConnectionRef.current?.readyState === WebSocket.OPEN) {
        try {
          await wsConnectionRef.current.send(event.data);
        } catch (error) {
          console.error('Error sending media chunk:', error);
        }
      }
    };

    recorder.onerror = (event) => {
      //console.error('MediaRecorder Error:', event.error);
      if (activeRecorderRef.current === recorder) {
        stopStreaming();
        alert('Recording error occurred. Stream stopped.');
      }
    };
    
    return recorder;
  };

  const initAudioMixer = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    const destination = audioContextRef.current.createMediaStreamDestination();
    if (!mainGainNodeRef.current) {
      mainGainNodeRef.current = audioContextRef.current.createGain();
    }

    // 無音オシレータを作成
    const silentOscillator = audioContextRef.current.createOscillator();
    const silentGain = audioContextRef.current.createGain();
    silentGain.gain.value = 0; // 完全な無音
    silentOscillator.connect(silentGain);
    silentGain.connect(mainGainNodeRef.current);
    silentOscillator.start();

    mainGainNodeRef.current.connect(destination);
    return { destination, mainGain: mainGainNodeRef.current };
  };

  const addAudioSource = (sourceId: string, stream: MediaStream | null, options: { name: string, type: 'mic' | 'audio' | 'screen' }) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    if (stream && stream.getAudioTracks().length === 0) return;

    const gainNode = audioContextRef.current.createGain();
    if (stream) {
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(gainNode);
    }
    
    if (!mainGainNodeRef.current) {
      const { mainGain } = initAudioMixer();
      mainGainNodeRef.current = mainGain;
    }
    
    gainNode.connect(mainGainNodeRef.current);

    audioMixerRef.current[sourceId] = {
      gain: gainNode,
      volume: 1.0,
      muted: false
    };

    // 状態を更新して再レンダリングをトリガー
    setAudioSources(prev => ({
      ...prev,
      [sourceId]: { 
        volume: 1.0, 
        muted: false,
        name: options.name,
        type: options.type
      }
    }));
  };

  const updateAudioVolume = (sourceId: string, volume: number) => {
    const mixer = audioMixerRef.current[sourceId];
    if (mixer) {
      mixer.volume = volume;
      mixer.gain.gain.value = volume;
      
      // 状態を更新して再レンダリングをトリガー
      setAudioSources(prev => ({
        ...prev,
        [sourceId]: { 
          ...prev[sourceId],
          volume
        }
      }));
    }
  };

  const toggleMute = (sourceId: string) => {
    const mixer = audioMixerRef.current[sourceId];
    if (mixer) {
      const newMuted = !audioSources[sourceId].muted;
      mixer.gain.gain.value = newMuted ? 0 : audioSources[sourceId].volume;
      
      setAudioSources(prev => ({
        ...prev,
        [sourceId]: { 
          ...prev[sourceId],
          muted: newMuted
        }
      }));
    }
  };

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 重ね順を考慮して描画
    const sourcesToDraw = [...videoSourcesRef.current].reverse();
  
    sourcesToDraw.forEach(source => {
      if (source.videoElement.readyState === 4) {
        try {
          ctx.drawImage(source.videoElement, source.x, source.y, source.width, source.height);
        } catch (error) {
          console.error('Error drawing video:', error);
        }
      }
    });

    // オーバーレイキャンバスに選択枠とリサイズハンドルを描画
    const overlayCanvas = overlayCanvasRef.current;
    const overlayCtx = overlayCanvas?.getContext('2d');
    if (overlayCanvas && overlayCtx) {
      overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

      videoSourcesRef.current.forEach(source => {
        if (source.id === selectedSourceId) {
          // 選択枠の描画
          overlayCtx.strokeStyle = '#00ff00';
          overlayCtx.lineWidth = 2;
          overlayCtx.strokeRect(source.x, source.y, source.width, source.height);

          // リサイズハンドルの描画
          overlayCtx.fillStyle = 'white';
          overlayCtx.strokeStyle = 'black';
          overlayCtx.lineWidth = 1;
          
          const handleSize = 15;
          overlayCtx.fillRect(
            source.x + source.width - handleSize,
            source.y + source.height - handleSize,
            handleSize,
            handleSize
          );
          overlayCtx.strokeRect(
            source.x + source.width - handleSize,
            source.y + source.height - handleSize,
            handleSize,
            handleSize
          );
        }
      });
    }

    requestAnimationFrame(drawCanvas);
  };

  const createVideoElement = async (stream: MediaStream): Promise<HTMLVideoElement> => {
    const video = document.createElement('video');
    video.autoplay = true;
    video.playsInline = true;
    video.muted = true;
    video.srcObject = stream;
    
    // ビデオの再生準備が整うまで待機
    await new Promise((resolve) => {
      video.onloadedmetadata = () => {
        video.play().then(resolve);
      };
    });
    
    return video;
  };

  const startCamera = async () => {
    try {
      // 配信開始時にミキサーを初期化
      const { destination } = initAudioMixer();
      const canvasStream = canvasRef.current!.captureStream(30);

      // キャンバスのビデオストリームとミキサーの音声出力を結合
      return new MediaStream([
        canvasStream.getVideoTracks()[0],
        destination.stream.getAudioTracks()[0]
      ]);
    } catch (error) {
      console.error('Error creating stream:', error);
      throw error;
    }
  };

  const addAudioOnlySource = async (deviceId: string) => {
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

  const addVideoSource = async (type: 'camera' | 'screen' | 'image', deviceId?: string) => {
    try {
      let stream: MediaStream;
      if (type === 'camera') {
        // カメラはビデオのみを取得
        stream = await navigator.mediaDevices.getUserMedia({
          video: deviceId ? {
            deviceId,
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: 30
          } : true
        });
      } else {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: 30
          },
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false, 
            channelCount: 2
          }
        });
      }

      const videoElement = await createVideoElement(stream);
      const uniqueId = Date.now();
      const sourceId = deviceId ? `${type}-${deviceId}-${uniqueId}` : `${type}-${uniqueId}`;
      const position = {
        x: Math.random() * 100,
        y: Math.random() * 100,
        width: 480,
        height: 270
      };

      const newSource = {
        id: sourceId,
        name: type === 'camera' ? `Camera ${deviceId || uniqueId}` :
              type === 'screen' ? 'Screen Share' :
              type === 'image' ? `Image ${uniqueId}` : sourceId,
        stream,
        videoElement,
        x: Math.random() * 100,
        y: Math.random() * 100,
        width: 480,
        height: 270
      };

      // 新しいソースを先頭に追加
      setVideoSources(prev => [newSource, ...prev]);
      
      if (type === 'screen' && stream.getAudioTracks().length > 0) {
        addAudioSource(sourceId, stream, {
          name: 'Screen Share',
          type: 'screen'
        });
      }

      if (type === 'screen') {
        stream.getVideoTracks()[0].onended = () => {
          removeSource(sourceId);
          setIsScreenSharing(false);
        };
        setIsScreenSharing(true);
      }
    } catch (err) {
      console.error(`Error adding ${type}:`, err);
      alert(`Failed to add ${type}`);
    }
  };

  // addImageSource 関数を更新
  const addImageSource = async () => {
    try {
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

        const stream = canvas.captureStream();
        const videoElement = await createVideoElement(stream);
        const sourceId = `image-${Date.now()}`;

        const newSource = {
          id: sourceId,
          name: file.name,
          stream,
          videoElement,
          x: Math.random() * 100,
          y: Math.random() * 100,
          width: 480,
          height: (480 * img.height) / img.width
        };

        setVideoSources(prev => [newSource, ...prev]);
      };

      input.click();
    } catch (err) {
      console.error('Error adding image:', err);
      alert('Failed to add image');
    }
  };

  // addAudioFileSource 関数を追加
  const addAudioFileSource = async () => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'audio/*';

      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        const sourceId = `audio-${Date.now()}`;
        const audioElement = new Audio(URL.createObjectURL(file));
        audioElement.volume = 1.0;

        const audioContext = audioContextRef.current || new AudioContext();
        if (!audioContextRef.current) {
          audioContextRef.current = audioContext;
        }

        const source = audioContext.createMediaElementSource(audioElement);
        const gainNode = audioContext.createGain();
        source.connect(gainNode);

        if (!mainGainNodeRef.current) {
          const { mainGain } = initAudioMixer();
          mainGainNodeRef.current = mainGain;
        }

        gainNode.connect(mainGainNodeRef.current);

        audioMixerRef.current[sourceId] = {
          gain: gainNode,
          volume: 1.0,
          muted: false,
          loop: false,
          audioElement
        };

        setAudioSources(prev => ({
          ...prev,
          [sourceId]: { volume: 1.0, muted: false, loop: false, name: file.name, type: 'audio' }
        }));
      };

      input.click();
    } catch (err) {
      console.error('Error adding audio file:', err);
      alert('Failed to add audio file');
    }
  };

  // 動画ファイルを追加する関数
  const addVideoFile = async () => {
    try {
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
        video.muted = false; // ミュートを解除
        video.playsInline = true;

        await new Promise((resolve) => {
          video.onloadeddata = () => resolve(null);
        });

        // オーディオコンテキストを使用して音声を処理
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
        const stream = (video as any).captureStream();

        // 音声ミキサーに追加
        audioMixerRef.current[sourceId] = {
          gain: gainNode,
          volume: 1.0,
          muted: false,
          audioElement: video
        };

        setAudioSources(prev => ({
          ...prev,
          [sourceId]: { 
            volume: 1.0, 
            muted: false, 
            loop: false,
            name: file.name,
            type: 'audio'
          }
        }));

        const newSource = {
          id: sourceId,
          name: file.name,
          stream,
          videoElement: video,
          x: Math.random() * 100,
          y: Math.random() * 100,
          width: 480,
          height: 270,
          loop: false
        };

        video.play();
        setVideoSources(prev => [newSource, ...prev]);
      };

      input.click();
    } catch (err) {
      console.error('Error adding video:', err);
      alert('Failed to add video');
    }
  };

  // toggleLoop 関数を追加
  const toggleLoop = (sourceId: string) => {
    const mixer = audioMixerRef.current[sourceId];
    if (mixer && mixer.audioElement) {
      const newLoop = !mixer.audioElement.loop;
      mixer.audioElement.loop = newLoop;
      
      setAudioSources(prev => ({
        ...prev,
        [sourceId]: { 
          ...prev[sourceId],
          loop: newLoop
        }
      }));
    }
  };

  // toggleVideoLoop 関数を更新
  const toggleVideoLoop = (sourceId: string) => {
    setVideoSources(prev => 
      prev.map(source => {
        if (source.id === sourceId) {
          const video = source.videoElement;
          const newLoop = !video.loop;
          video.loop = newLoop;

          // 動画が終了している場合は最初から再生
          if (video.ended) {
            video.currentTime = 0;
            video.play();
          }

          return { ...source, loop: newLoop };
        }
        return source;
      })
    );
  };

  // playAudio 関数を追加
  const playAudio = (sourceId: string) => {
    const mixer = audioMixerRef.current[sourceId];
    if (mixer && mixer.audioElement) {
      mixer.audioElement.play();
    }
  };

  // pauseAudio 関数を追加
  const pauseAudio = (sourceId: string) => {
    const mixer = audioMixerRef.current[sourceId];
    if (mixer && mixer.audioElement) {
      mixer.audioElement.pause();
    }
  };

  // removeSource 関数を更新
  const removeSource = (sourceId: string) => {
    setVideoSources(prev => {
      const source = prev.find(s => s.id === sourceId);
      if (source) {
        source.stream.getTracks().forEach(track => track.stop());
        source.videoElement.pause();
        source.videoElement.src = '';
        source.videoElement.srcObject = null;
        source.videoElement.remove();
      }
      return prev.filter(s => s.id !== sourceId);
    });

    // 音声ミキサーからも削除
    if (audioMixerRef.current[sourceId]) {
      // 音声ファイルの場合、再生を停止して解放
      if (audioMixerRef.current[sourceId].audioElement) {
        audioMixerRef.current[sourceId].audioElement.pause();
        audioMixerRef.current[sourceId].audioElement.src = '';
      }
      audioMixerRef.current[sourceId].gain.disconnect();
      delete audioMixerRef.current[sourceId];
      setAudioSources(prev => {
        const newSources = { ...prev };
        delete newSources[sourceId];
        return newSources;
      });
    }

    if (sourceId.startsWith('screen')) {
      setIsScreenSharing(false);
    }
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = overlayCanvasRef.current!.getBoundingClientRect();
    const scaleX = overlayCanvasRef.current!.width / rect.width;
    const scaleY = overlayCanvasRef.current!.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // 重ね順を考慮して後ろから検索（表示上は上の要素から検索）
    const sources = [...videoSourcesRef.current]
      .sort((a, b) => getSourceIndex(b.id) - getSourceIndex(a.id));

    let found = false;
    for (const source of sources) {
      // リサイズハンドルの判定
      const isOnResizeHandle = 
        source.id === selectedSourceId &&
        x >= source.x + source.width - 15 &&
        x <= source.x + source.width &&
        y >= source.y + source.height - 15 &&
        y <= source.y + source.height;

      if (isOnResizeHandle) {
        setResizeInfo({
          sourceId: source.id,
          type: 'resize',
          startX: x,
          startY: y,
          startWidth: source.width,
          startHeight: source.height
        });
        found = true;
        break;
      }

      // 要素の選択判定
      if (x >= source.x && x <= source.x + source.width &&
          y >= source.y && y <= source.y + source.height) {
        setSelectedSourceId(source.id);
        if (source.id === selectedSourceId) {
          setResizeInfo({
            sourceId: source.id,
            type: 'move',
            startX: x - source.x,
            startY: y - source.y,
            startWidth: source.width,
            startHeight: source.height
          });
        }
        found = true;
        break;
      }
    }

    if (!found) {
      setSelectedSourceId(null);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!resizeInfo) return;

    const rect = overlayCanvasRef.current!.getBoundingClientRect();
    const scaleX = overlayCanvasRef.current!.width / rect.width;
    const scaleY = overlayCanvasRef.current!.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const source = videoSourcesRef.current.find(s => s.id === resizeInfo.sourceId);
    if (!source) return;

    if (resizeInfo.type === 'resize') {
      // リサイズ処理
      const newWidth = Math.max(100, resizeInfo.startWidth + (x - resizeInfo.startX));
      const newHeight = Math.max(100, resizeInfo.startHeight + (y - resizeInfo.startY));
      
      // アスペクト比を維持
      const aspect = resizeInfo.startWidth / resizeInfo.startHeight;
      source.width = newWidth;
      source.height = newWidth / aspect;
    } else {
      // 移動処理
      source.x = Math.max(0, Math.min(x - resizeInfo.startX, canvasRef.current!.width - source.width));
      source.y = Math.max(0, Math.min(y - resizeInfo.startY, canvasRef.current!.height - source.height));
    }
  };

  const handleCanvasMouseUp = () => {
    setResizeInfo(null);
  };

  const startStreaming = async () => {
    if (!streamKey.trim()) {
      alert('Please enter a stream key');
      return;
    }

    try {
      if (videoSourcesRef.current.length === 0) {
        alert('Please add at least one video source before starting the stream');
        return;
      }

      const stream = await startCamera();
      currentStreamRef.current = stream;
      
      wsConnectionRef.current = new WebSocket(`wss://live-data.tokuly.com/stream/${streamKey}?password=${ch_pass}`);
      
      wsConnectionRef.current.onopen = () => {
        const recorder = createMediaRecorder(stream);
        if (recorder) {
          activeRecorderRef.current = recorder;
          recorder.start(500);
          setIsStreaming(true);
        }
      };

      wsConnectionRef.current.onerror = (error) => {
        console.error('WebSocket Error:', error);
        stopStreaming();
        alert('Connection error occurred');
      };

    } catch (err) {
      console.error('Error starting stream:', err);
      alert('Error starting stream');
    }
  };

  const stopStreaming = () => {
    if (activeRecorderRef.current) {
      activeRecorderRef.current.stop();
      activeRecorderRef.current = null;
    }
    
    if (wsConnectionRef.current) {
      wsConnectionRef.current.close();
      wsConnectionRef.current = null;
    }

    if (currentStreamRef.current) {
      // キャンバスのストリームトラックのみを停止
      const tracks = currentStreamRef.current.getTracks();
      tracks.forEach(track => track.stop());
      currentStreamRef.current = null;
    }

    if (hlsPlayerRef.current) {
      hlsPlayerRef.current.src = '';
    }

    setIsStreaming(false);
  };

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        await addVideoSource('screen');
      } else {
        const source = videoSourcesRef.current.find(s => s.id === 'screen');
        if (source) {
          source.stream.getTracks().forEach(track => track.stop());
          source.videoElement.srcObject = null;
          source.videoElement.remove();
          videoSourcesRef.current = videoSourcesRef.current.filter(s => s.id !== 'screen');
          delete audioMixerRef.current['screen'];
        }
      }

      setIsScreenSharing(!isScreenSharing);
    } catch (err) {
      console.error('Error toggling screen share:', err);
      alert('Failed to switch video source');
    }
  };

  const switchToCamera = async () => {
    try {
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: true
      });

      const videoTrack = cameraStream.getVideoTracks()[0];
      const nextStream = new MediaStream([videoTrack, audioTrackRef.current!]);

      await switchStream(nextStream);
      setIsScreenSharing(false);
    } catch (err) {
      console.error('Error switching to camera:', err);
    }
  };

  const switchStream = async (newStream: MediaStream) => {
    if (!wsConnectionRef.current || wsConnectionRef.current.readyState !== WebSocket.OPEN) return;

    try {
      if (activeRecorderRef.current) {
        activeRecorderRef.current.stop();
      }

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = newStream;
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const newRecorder = createMediaRecorder(newStream);
      if (newRecorder) {
        newRecorder.start(500);
        activeRecorderRef.current = newRecorder;
        currentStreamRef.current = newStream;
      }
    } catch (error) {
      console.error('Error switching stream:', error);
      alert('Failed to switch video source');
    }
  };

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

  // moveSourceLayer 関数を更新
  const moveSourceLayer = (sourceId: string, direction: 'up' | 'down') => {
    setVideoSources(prev => {
      const index = prev.findIndex(s => s.id === sourceId);
      if (index === -1) return prev;
  
      const newSources = [...prev];
      if (direction === 'up' && index > 0) {
        [newSources[index], newSources[index - 1]] = 
        [newSources[index - 1], newSources[index]];
      } else if (direction === 'down' && index < newSources.length - 1) {
        [newSources[index], newSources[index + 1]] = 
        [newSources[index + 1], newSources[index]];
      }
  
      // videoSourcesRef も同時に更新
      videoSourcesRef.current = newSources;
      return newSources;
    });
  };

  const getSourceIndex = (sourceId: string) => {
    const index = videoSourcesRef.current.findIndex(s => s.id === sourceId);
    return videoSourcesRef.current.length - 1 - index; // インデックスを反転
  };

  const renameSource = (sourceId: string, newName: string) => {
    if (sourceId.startsWith('audio-') || sourceId.startsWith('mic-') || sourceId.startsWith('screen-')) {
      setAudioSources(prev => ({
        ...prev,
        [sourceId]: { 
          ...prev[sourceId],
          name: newName
        }
      }));
    } else {
      setVideoSources(prev => 
        prev.map(source => 
          source.id === sourceId 
            ? { ...source, name: newName }
            : source
        )
      );
    }
  };

  useEffect(() => {
    drawCanvas();
    loadDevices();
    navigator.mediaDevices.addEventListener('devicechange', loadDevices);
    
    return () => {
      // コンポーネントのアンマウント時のみ完全なクリーンアップを実行
      if (videoSourcesRef.current) {
        videoSourcesRef.current.forEach(source => {
          source.stream.getTracks().forEach(track => track.stop());
          source.videoElement.pause();
          source.videoElement.src = '';
          source.videoElement.srcObject = null;
          source.videoElement.remove();
        });
        videoSourcesRef.current = [];
      }
      stopStreaming();
      navigator.mediaDevices.removeEventListener('devicechange', loadDevices);
      Object.values(audioMixerRef.current).forEach(mixer => {
        if (mixer.audioElement) {
          mixer.audioElement.pause();
          mixer.audioElement.src = '';
        }
      });
    };
  }, []);

  useEffect(() => {
    drawCanvas();
  }, [selectedSourceId]);

  useEffect(() => {
    videoSourcesRef.current = videoSources;
    requestAnimationFrame(drawCanvas); // 強制的に再描画
  }, [videoSources]);

  return (
    <div className="container mx-auto p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>TokulyLive Web Encoder</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <h1 className='flex-1 text-xl'>配信：{streamTitle}</h1>
              {!isStreaming ? (
                <Button onClick={startStreaming} disabled={isStreaming}>
                  配信開始
                </Button>
              ):(
                <Button 
                  onClick={stopStreaming} 
                  disabled={!isStreaming}
                  variant="destructive"
                >
                  配信停止
                </Button>
              )}
            </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-[50%_1fr] gap-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Sources</CardTitle>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Video className="h-4 w-4 mr-2" />
                      <span>カメラを追加</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent>
                        {devices.videoInputs.map(device => (
                          <DropdownMenuItem 
                            key={device.deviceId}
                            onSelect={() => addVideoSource('camera', device.deviceId)}
                          >
                            {device.label || `Camera ${device.deviceId}`}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>

                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Mic className="h-4 w-4 mr-2" />
                      <span>マイクを追加</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent>
                        {devices.audioInputs.map(device => (
                          <DropdownMenuItem 
                            key={device.deviceId}
                            onSelect={() => addAudioOnlySource(device.deviceId)}
                          >
                            {device.label || `Microphone ${device.deviceId}`}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>

                  <DropdownMenuItem onSelect={() => addVideoSource('screen')}>
                    <Monitor className="h-4 w-4 mr-2" />
                    <span>画面を追加</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem onSelect={addImageSource}>
                    <ImageIcon className="h-4 w-4 mr-2" />
                    <span>画像を追加</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem onSelect={addAudioFileSource}>
                    <Music className="h-4 w-4 mr-2" />
                    <span>音声ファイルを追加</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem onSelect={addVideoFile}>
                    <Video className="h-4 w-4 mr-2" />
                    <span>動画ファイルを追加</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px]">
                {/* 映像ソース */}
                {videoSources
                  .map((source, index) => (
                    <div 
                      key={source.id} 
                      className={`flex items-center justify-between p-2 rounded-lg mb-2 ${
                        source.id === selectedSourceId ? 'bg-accent' : 'bg-card'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {source.id.startsWith('camera-') && <Video className="h-4 w-4" />}
                        {source.id.startsWith('screen-') && <Monitor className="h-4 w-4" />}
                        {source.id.startsWith('image-') && <ImageIcon className="h-4 w-4" />}
                        {source.id.startsWith('video-') && <Video className="h-4 w-4" />}
                        {editingName === source.id ? (
                          <Input
                            className="h-6 w-40"
                            value={source.name}
                            autoFocus
                            onChange={(e) => renameSource(source.id, e.target.value)}
                            onBlur={() => setEditingName(null)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                setEditingName(null);
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span 
                            className="cursor-pointer hover:bg-accent/50 px-2 py-1 rounded min-w-[160px]"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingName(source.id);
                            }}
                          >
                            {source.name}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {(source.id.startsWith('video-') || source.isAnimated) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleVideoLoop(source.id)}
                          >
                            {source.loop ? 'Loop: On' : 'Loop: Off'}
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => moveSourceLayer(source.id, 'up')}
                          disabled={index === 0} // インデックスで直接判定
                        >
                          ↑
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => moveSourceLayer(source.id, 'down')}
                          disabled={index === videoSources.length - 1} // インデックスで直接判定
                        >
                          ↓
                        </Button>
                        <Button
                          size="icon"
                          variant="destructive"
                          onClick={() => removeSource(source.id)}
                        >
                          ×
                        </Button>
                      </div>
                    </div>
                  ))}

                {/* 音声ソース */}
                {Object.entries(audioSources)
                  .filter(([id]) => !id.startsWith('screen-')) // 画面共有の音声は除外
                  .map(([sourceId, source]) => (
                    <div 
                      key={sourceId}
                      className="flex items-center justify-between p-2 rounded-lg mb-2 bg-card"
                    >
                      <div className="flex items-center gap-2">
                        {source.type === 'mic' && <Mic className="h-4 w-4" />}
                        {source.type === 'audio' && <Music className="h-4 w-4" />}
                        {editingName === sourceId ? (
                          <Input
                            className="h-6 w-40"
                            value={source.name}
                            autoFocus
                            onChange={(e) => renameSource(sourceId, e.target.value)}
                            onBlur={() => setEditingName(null)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                setEditingName(null);
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span 
                            className="cursor-pointer hover:bg-accent/50 px-2 py-1 rounded min-w-[160px]"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingName(sourceId);
                            }}
                          >
                            {source.name}
                          </span>
                        )}
                      </div>
                      <Button
                        size="icon"
                        variant="destructive"
                        onClick={() => removeSource(sourceId)}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Audio Mixer</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px]">
                {Object.entries(audioSources).map(([sourceId, { volume, muted, loop }]) => (
                  <div key={sourceId} className="space-y-2 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">
                        {audioSources[sourceId].name}
                      </span>
                      <div className="flex gap-2">
                        {sourceId.startsWith('audio-') && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleLoop(sourceId)}
                            >
                              {loop ? 'Loop: On' : 'Loop: Off'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => playAudio(sourceId)}
                            >
                              ▶
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => pauseAudio(sourceId)}
                            >
                              ⏸
                            </Button>
                          </>
                        )}
                        <Button
                          variant={muted ? "destructive" : "outline"}
                          size="sm"
                          onClick={() => toggleMute(sourceId)}
                        >
                          {muted ? 'Unmute' : 'Mute'}
                        </Button>
                      </div>
                    </div>
                    <Slider
                      value={[volume]}
                      min={0}
                      max={1}
                      step={0.01}
                      disabled={muted}
                      onValueChange={(values: number[]) => updateAudioVolume(sourceId, values[0])}
                    />
                  </div>
                ))}
              </ScrollArea>
            </CardContent>
          </Card>
      </div>
      <Card>
            <CardContent className="p-4">
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                <canvas
                  ref={canvasRef}
                  width={1280}
                  height={720}
                  className="absolute top-0 left-0 w-full h-full"
                />
                <canvas
                  ref={overlayCanvasRef}
                  width={1280}
                  height={720}
                  className="absolute top-0 left-0 w-full h-full cursor-move"
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseLeave={handleCanvasMouseUp}
                />
              </div>
            </CardContent>
          </Card>
      
    </div>
  );
}