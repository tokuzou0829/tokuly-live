"use client";
import React, { useRef, useEffect, useState } from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlay, faPause, faVolumeHigh, faExpand, faCompress } from "@fortawesome/free-solid-svg-icons";
import Hls from 'hls.js';

interface VideoProps {
  id: string;
  className?: string;
}

function Player(props: VideoProps) {
  const { id, className } = props;
  const playerRef = useRef<HTMLDivElement | null>(null); // playerRefに型を追加
  const myRef = useRef<HTMLVideoElement | null>(null); // myRefに型を追加
  const overlayRef = useRef<HTMLDivElement | null>(null); // overlayRefに型を追加

  const [showControls, setShowControls] = useState<boolean>(false); // showControlsに型を追加
  const [isPlaying, setIsPlaying] = useState<boolean>(true); // isPlayingに型を追加
  const [volume, setVolume] = useState<number>();
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);

  // Load volume from local storage on component mount
  useEffect(() => {
    const initialVolume = window?.localStorage?.getItem('volume') || '1'; // initialVolumeに型を追加    
    if (initialVolume !== null) {
      setVolume(parseFloat(initialVolume));
      myRef.current!.volume = parseFloat(initialVolume);
    }
  }, []);

  // Save volume to local storage whenever it changes
  useEffect(() => {
    if(volume){
      window?.localStorage?.setItem('volume', volume.toString());
    }
  }, [volume]);

  const loadVideo = () => {
    const videoSrc = `https://live-data.tokuly.com/hls/${id}/index.m3u8`;

    if (Hls.isSupported()) {
      const hls = new Hls({
        "enableWorker": true,
        "maxBufferLength": 1,
        "liveBackBufferLength": 0,
        "liveSyncDuration": 0,
        "liveMaxLatencyDuration": 15,
        "liveDurationInfinity": true,
        "highBufferWatchdogPeriod": 1,
      });
      hls.loadSource(videoSrc);
      hls.attachMedia(myRef.current!);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        myRef.current!.currentTime = myRef.current!.duration;
        myRef.current!.play();
      });
    } else {
      const video = myRef.current!;
      video.src = videoSrc;
      video.load();
      myRef.current!.currentTime = myRef.current!.duration;
      video.oncanplay = () => {
        myRef.current!.play();
      };
    }

    myRef.current!.addEventListener('pause', handleVideoPause);
  };

  const toggleControls = () => {
    const video = myRef.current!;
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  };

  const handleVideoPlay = () => {
    setIsPlaying(true);
  };

  const handleVideoPause = () => {
    setIsPlaying(false);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    myRef.current!.volume = newVolume;
  };

  const handleVideoHoverEnter = () => {
    setShowControls(true);
  };

  const handleVideoHoverLeave = () => {
    if (!myRef.current!.paused) {
      setShowControls(false);
    }
  };

const enterFullScreen = () => {
  if (playerRef.current) {
    if (playerRef.current.requestFullscreen) {
      playerRef.current.requestFullscreen();
    }
  }
};
  const exitFullScreen = () => {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  };

  // フルスクリーンモードの切り替えを監視
  useEffect(() => {
    const handleFullScreenChange = () => {
      if (
        document.fullscreenElement
      ) {
        setIsFullScreen(true);
      } else {
        setIsFullScreen(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullScreenChange);
    document.addEventListener('mozfullscreenchange', handleFullScreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullScreenChange);
    document.addEventListener('msfullscreenchange', handleFullScreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullScreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullScreenChange);
      document.removeEventListener('msfullscreenchange', handleFullScreenChange);
    };
  }, []);

  useEffect(() => {
    loadVideo();
  }, []);

  return (
    <div ref={playerRef} className={"w-full relative player" + className}>
      <video
        autoPlay
        webkit-playsinline="true"
        playsInline
        ref={myRef}
        className="w-full h-full bg-black aspect-w-16 aspect-h-9"
        style={ isFullScreen ? {} : { maxHeight: '600px'} }
        onMouseEnter={handleVideoHoverEnter}
        onPlay={handleVideoPlay}
        onPause={handleVideoPause}
      ></video>
      <div
        ref={overlayRef}
        className={`absolute bottom-0 left-0 ${showControls ? 'block' : 'hidden'} h-full w-full bg-black bg-opacity-50`}
        onMouseLeave={handleVideoHoverLeave}
        onClick={toggleControls}
      >
        <div className="flex items-end h-full mt-[-10px] ml-[10px] relative">
          <div className='flex items-center'>
            <button onClick={(e) => {e.stopPropagation();toggleControls();}} className="text-white">
              {isPlaying ? <FontAwesomeIcon icon={faPause} /> : <FontAwesomeIcon icon={faPlay} />}
            </button>
            <div className="flex ml-3 items-center">
              <FontAwesomeIcon className="text-white" icon={faVolumeHigh} />
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={handleVolumeChange}
                onClick={(e) => e.stopPropagation()}
                className='ml-[5px] h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer bg-gray-700'
              />
            </div>
            <div className='ml-[auto]'>
              {isFullScreen ? (
              <button onClick={(e) => {e.stopPropagation();exitFullScreen()}} className="absolute bottom-[0px] right-[0px] mt-[-10px] mr-[10px] text-white">
                <FontAwesomeIcon icon={faCompress} />
              </button>
            ) : (
              <button onClick={(e) => {e.stopPropagation();enterFullScreen();}} className="absolute bottom-[0px] right-[0px] mt-[-10px] mr-[10px] text-white">
                <FontAwesomeIcon icon={faExpand} />
              </button>
            )}
            </div>
          </div>
          <div className='absolute bg-red-600 w-[100px] h-[25px] top-[20px] right-[10px] rounded-md'>
            <p className=' text-white text-center font-semibold'>ライブ配信</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Player;
