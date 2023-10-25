import React, { Component, RefObject } from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlay, faPause, faVolumeHigh } from "@fortawesome/free-solid-svg-icons";
import Hls from 'hls.js';

interface VideoProps {
  id: string;
  className?:string;
}

interface VideoState {
  showControls: boolean;
  isPlaying: boolean;
  volume: number;
}

function Player(props: VideoProps) {
  const { id ,className} = props;
  const myRef = React.createRef<HTMLVideoElement>();
  const overlayRef = React.createRef<HTMLDivElement>();

  const [showControls, setShowControls] = React.useState(false);
  const [isPlaying, setIsPlaying] = React.useState(true);
  const [volume, setVolume] = React.useState(1);

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

  React.useEffect(() => {
    loadVideo();
  }, []);

  return (
    <div className={"w-full relative player" + className}>
      <video
        autoPlay
        webkit-playsinline="true"
        playsInline
        ref={myRef}
        className="w-full h-full bg-black aspect-w-16 aspect-h-9"
        style={{maxHeight:'600px'}}
        onMouseEnter={handleVideoHoverEnter}
        onPlay={handleVideoPlay}
        onPause={handleVideoPause}
      ></video>
      <div
        ref={overlayRef}
        className={`absolute bottom-0 left-0 ${showControls ? 'block' : 'hidden'} h-full w-full bg-black bg-opacity-50`}
        onMouseLeave={handleVideoHoverLeave}
      >
        <div className="flex items-end h-full mt-[-10px] ml-[10px] relative">
          <div className='flex items-center'>
            <button onClick={toggleControls} className="text-white">
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
                className='ml-[5px] h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer bg-gray-700'
              />
            </div>
          </div>
          <div className='absolute bg-red-600 w-[100px] h-[25px] top-[20px] right-[10px] rounded-md'>
            <p className=' text-white text-center	font-semibold	'>ライブ配信</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Player;


