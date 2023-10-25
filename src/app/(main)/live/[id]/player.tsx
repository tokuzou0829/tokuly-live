import React, { Component, RefObject } from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlay, faPause, faVolumeHigh } from "@fortawesome/free-solid-svg-icons";
import Hls from 'hls.js';

interface VideoProps {
  id: string;
}

interface VideoState {
  showControls: boolean;
  isPlaying: boolean;
  volume: number;
}

class Video extends Component<VideoProps, VideoState> {
  private myRef: RefObject<HTMLVideoElement>;
  private overlayRef: RefObject<HTMLDivElement>;

  constructor(props: VideoProps) {
    super(props);
    this.myRef = React.createRef<HTMLVideoElement>();
    this.overlayRef = React.createRef<HTMLDivElement>();
    this.state = {
      showControls: false,
      isPlaying: true,
      volume: 1,
    };
  }

  componentDidMount() {
    this.loadVideo();
  }
  loadVideo() {
    const { id } = this.props;
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
      hls.attachMedia(this.myRef.current!);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
          this.myRef.current!.currentTime = this.myRef.current!.duration;
          this.myRef.current!.play();
      });
    } else {
      const video = this.myRef.current!;
      video.src = videoSrc;
      video.load();
      this.myRef.current!.currentTime = this.myRef.current!.duration;
      video.oncanplay = () => {
        this.myRef.current!.play();
      };
    }

    this.myRef.current!.addEventListener('pause', this.handleVideoPause);
  }

  toggleControls = () => {
    const video = this.myRef.current!;
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  };

  handleVideoPlay = () => {
    this.setState({ isPlaying: true });
  };

  handleVideoPause = () => {
    this.setState({ isPlaying: false });
  };

  handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const volume = parseFloat(e.target.value);
    this.setState({ volume });
    this.myRef.current!.volume = volume;
  };

  handleVideoHoverEnter = () => {
    this.setState({ showControls: true });
  };

  handleVideoHoverLeave = () => {
    if (!this.myRef.current!.paused) {
      this.setState({ showControls: false });
    }
  };

  render() {
    const { showControls, isPlaying, volume } = this.state;
    return (
<div className="w-full relative player">
  <video
    autoPlay
    webkit-playsinline="true"
    playsInline
    ref={this.myRef}
    className="w-full h-full bg-black aspect-w-16 aspect-h-9"
    style={{maxHeight:'600px'}}
    onMouseEnter={this.handleVideoHoverEnter}
    onPlay={this.handleVideoPlay}
    onPause={this.handleVideoPause}
  ></video>
  <div
    ref={this.overlayRef}
    className={`absolute bottom-0 left-0 ${showControls ? 'block' : 'hidden'} h-full w-full bg-black bg-opacity-50`}
    onMouseLeave={this.handleVideoHoverLeave}
  >
    <div className="flex items-end h-full mt-[-10px] ml-[10px] relative">
      <div className='flex items-center'>
          <button onClick={this.toggleControls} className="text-white">
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
              onChange={this.handleVolumeChange}
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
}

export default Video;

