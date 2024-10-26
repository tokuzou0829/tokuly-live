"use client";
import React, { useRef, useEffect, useState } from "react";
import { Copy } from "lucide-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlay,
  faPause,
  faVolumeHigh,
  faExpand,
  faCompress,
  faVolumeMute,
  faShare,
  faCopy,
  faHandMiddleFinger,
  faGear
} from "@fortawesome/free-solid-svg-icons";
import Hls from "hls.js";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import SeekBar from "./player-seekbar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu"
import { DropdownMenuCheckboxItemProps } from "@radix-ui/react-dropdown-menu"
import { set } from "date-fns";
import { Button } from "@/components/ui/button"

interface VideoProps {
  id: string;
  className?: string;
  poster_url?: string;
}
function Player(props: VideoProps) {
  const { id, className,poster_url } = props;
  const playerRef = useRef<HTMLDivElement | null>(null);
  const myRef = useRef<HTMLVideoElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const LinkText = useRef<HTMLInputElement | null>(null);
  const EmdedCode = useRef<HTMLTextAreaElement | null>(null);
  const [showControls, setShowControls] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>();
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const cursorHideTimeoutRef = useRef<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffer, setBuffer] = useState(0);

  const [previewPosition, setPreviewPosition] = useState({ x: 0, y: 0 });
  const [showPreview, setShowPreview] = useState(false);
  const [currentPreviewUrl, setCurrentPreviewUrl] = useState("");
  const [hoverPosition, setHoverPosition] = useState(0);
  const previewRef = useRef<HTMLDivElement>(null);
  const [previewTime, setPreviewTime] = useState(0);

  const [videoQuality, setVideoQuality] = useState("-1");
  const [loadVideoQuality, setLoadVideoQuality] = useState(0);
  const [videoQualityList, setVideoQualityList] = useState<string[]>([]);
  const hlsRef = useRef<Hls | null>(null);
  const [qualityMenuOpen, setQualityMenuOpen] = useState(false);

  // コンポーネントがアンマウントされたときにクリーンアップ
  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.style.cursor = "auto"; // カーソルを表示
    }

    const resetCursorHideTimeout = () => {
      if (cursorHideTimeoutRef.current) {
        clearTimeout(cursorHideTimeoutRef.current);
      }

      cursorHideTimeoutRef.current = window.setTimeout(() => {
        if (playerRef.current && !myRef.current?.paused) {
          console.log("hide");
          playerRef.current.style.cursor = "none";
          setShowControls(false);
        }
      }, 3000);
    };

    const handleMouseMove = () => {
      if (playerRef.current) {
        if (playerRef.current.style.cursor == "none") {
          setShowControls(true);
        }
        playerRef.current.style.cursor = "auto"; // オーバーレイ内でのみカーソルを表示
        resetCursorHideTimeout();
      }
    };

    document.addEventListener("mousemove", handleMouseMove);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      if (cursorHideTimeoutRef.current) {
        clearTimeout(cursorHideTimeoutRef.current);
      }
    };
  }, []);

  // Load volume from local storage on component mount
  useEffect(() => {
    const initialVolume = window?.localStorage?.getItem("volume") || "1"; // initialVolumeに型を追加
    if (initialVolume !== null) {
      setVolume(parseFloat(initialVolume));
      myRef.current!.volume = parseFloat(initialVolume);
    }
  }, []);

  // Save volume to local storage whenever it changes
  useEffect(() => {
    if (volume) {
      window?.localStorage?.setItem("volume", volume.toString());
    }
  }, [volume]);

  useEffect(() => {
    const handleKeyDown = (event:any) => {
      if (!myRef.current) return;
      
      const video = myRef.current;

      switch (event.key) {
        case ' ': // スペースキーで再生/一時停止
          event.preventDefault(); // ページのスクロール防止
          if (video.paused) {
            video.play();
          } else {
            video.pause();
          }
          break;
        case 'ArrowLeft': // 左矢印キーで5秒巻き戻し
          video.currentTime = Math.max(0, video.currentTime - 5);
          break;
        case 'ArrowRight': // 右矢印キーで5秒早送り
          video.currentTime = Math.min(video.duration, video.currentTime + 5);
          break;
        case 'ArrowUp': // 上矢印キーで音量を上げる
          setVolume(Math.min(1, video.volume + 0.05));
          video.volume = Math.min(1, video.volume + 0.05);
          break;
        case 'ArrowDown': // 下矢印キーで音量を下げる
          setVolume(Math.max(0, video.volume - 0.05));
          video.volume = Math.max(0, video.volume - 0.05);
          break;
        case 'f': // "f"キーでフルスクリーンにする/解除
          if (document.fullscreenElement) {
            exitFullScreen();
          } else {
            enterFullScreen();
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  function copyLink() {
    if (LinkText.current) {
      const link = LinkText.current.value;
      return navigator.clipboard.writeText(link);
    }
  }
  function copyEmdedCode() {
    if (EmdedCode.current) {
      const link = EmdedCode.current.value;
      return navigator.clipboard.writeText(link);
    }
  }

  const toggleControls = () => {
    const video = myRef.current!;
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  };
  const toggleMute = () => {
    const video = myRef.current!;
    if (!video.muted) {
      video.muted = true;
      setIsMuted(true);
    } else {
      video.muted = false;
      setIsMuted(false);
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
    setIsHovered(true);
    if (playerRef.current && playerRef.current.style.cursor == "auto") {
      setShowControls(true);
    }
  };

  const handleVideoHoverLeave = () => {
    setIsHovered(false);
  if (!myRef.current?.paused && !qualityMenuOpen) {
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
      if (document.fullscreenElement) {
        setIsFullScreen(true);
      } else {
        setIsFullScreen(false);
      }
    };

    document.addEventListener("fullscreenchange", handleFullScreenChange);
    document.addEventListener("mozfullscreenchange", handleFullScreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullScreenChange);
    document.addEventListener("msfullscreenchange", handleFullScreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullScreenChange);
      document.removeEventListener(
        "mozfullscreenchange",
        handleFullScreenChange
      );
      document.removeEventListener(
        "webkitfullscreenchange",
        handleFullScreenChange
      );
      document.removeEventListener(
        "msfullscreenchange",
        handleFullScreenChange
      );
    };
  }, []);

  useEffect(() => {
    let hls: Hls; // HLS.js インスタンスを保持する変数を定義
    const videoSrc = `https://live-data.tokuly.com/videos/hls/${id}/index.m3u8`;

    // Function to check the m3u8 file status
    const checkM3u8Status = () => {
      fetch(videoSrc, { method: "HEAD" }).then((response) => {
        if (response.status === 200) {
          console.log("load_video");
          if (Hls.isSupported()) {
            hls = new Hls();
            hlsRef.current = hls;
            hls.loadSource(videoSrc);
            hls.attachMedia(myRef.current!);

            hls.on(Hls.Events.FRAG_BUFFERED, () => {
              const buffered = myRef.current!.buffered;
              const currentTime = myRef.current!.currentTime;
              let bufferedSeconds = 0;

              for (let i = 0; i < buffered.length; i++) {
                if (buffered.start(i) <= currentTime && buffered.end(i) >= currentTime) {
                  bufferedSeconds = buffered.end(i) - currentTime;
                  break;
                }
              }
              console.log("bufferedSeconds", bufferedSeconds);
              setBuffer(bufferedSeconds);
            });
            hls.on(Hls.Events.MANIFEST_PARSED, function(event, data) {
              var availableQualities = hls.levels.map(function(level) {
                  return level.height + 'p';
              });
              setVideoQualityList(availableQualities);
          });
          } else {
            const video = myRef.current!;
            video.src = videoSrc;
            video.load();
          }

          myRef.current!.addEventListener("pause", handleVideoPause);
        }
      });
    };
    const setUp = setTimeout(checkM3u8Status, 0);
    return () => {
      clearTimeout(setUp);
      if (hls) {
        hls.destroy(); // HLS.js インスタンスを破棄
      }
    };
  }, []);

  useEffect(()=>{
    if(myRef.current){
      setDuration(myRef.current.duration);
    }
  },[myRef.current])

  useEffect(() => {
    if(hlsRef.current){
        hlsRef.current.nextLevel = Number(videoQuality);
    }
  }, [videoQuality]);

  const handleTimeUpdate = () => {
    if(myRef.current){
      setCurrentTime(myRef.current.currentTime);
    }
  };

  const handleSeek = (e:any) => {
    if(myRef.current){
      const newTime = e;
      myRef.current.currentTime = newTime;
      setCurrentTime(newTime);
      }
  };

  const formatTime = (time:any) => {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);
  
    if (hours === 0) {
      return `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    } else if (hours < 10) {
      return `${hours}:${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    } else {
      return `${hours < 10 ? '0' : ''}${hours}:${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }
  };
  

  const handleSeekHover = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const previewTime = percentage * duration;
    if(previewTime > duration){
      setShowPreview(false);
      return;
    }
    // プレビュー画像の位置を計算
    const tileSetNumber = Math.ceil(previewTime / 125);
    if(tileSetNumber === 0){
      setShowPreview(false);
      return;
    }
    const tileSet = tileSetNumber === 0 ? '001' : tileSetNumber.toString().padStart(3, '0');
    
    // 5秒ごとに1フレームのインデックスを計算
    const tileIndex = Math.round(previewTime / 5);
    const tileX = tileIndex % 5;
    const tileY = Math.floor(tileIndex / 5);

    setPreviewPosition({
        x: -(tileX * 160),  // 160はプレビュー画像の幅
        y: -(tileY * 90)    // 90はプレビュー画像の高さ
    });

    // タイルセットの番号に基づいて適切な画像URLを生成
    const baseUrl = `https://live-data.tokuly.com/videos/hls/${id}/video_preview/video_preview_`;
    const imageUrl = `${baseUrl}${tileSet}.jpg`;

    setCurrentPreviewUrl(imageUrl);
    setShowPreview(true);
    setHoverPosition(percentage);
    setPreviewTime(previewTime);
};

  const handleSeekLeave = () => {
    setShowPreview(false);
  };

  function testSetting(){
    console.log("test");
  }
  return (
    <div ref={playerRef} className={"w-full relative player " + className}>
      <video
        webkit-playsinline="true"
        playsInline
        ref={myRef}
        className="w-full h-full bg-black aspect-w-16 aspect-h-9"
        onMouseEnter={handleVideoHoverEnter}
        onPlay={handleVideoPlay}
        onPause={handleVideoPause}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={(event) => {
          const videoElement = event.target as HTMLVideoElement;
          setDuration(videoElement.duration);
        }}
      ></video>
      <ContextMenu>
        <Dialog>
          <div
            ref={overlayRef}
            className={`absolute bottom-0 left-0 h-full w-full transition-opacity duration-300 ease-in-out ${
              showControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
            style={{
              background: 'linear-gradient(to top, rgba(0, 0, 0, 0.8) 0%, transparent 15%)',
            }}
            onMouseLeave={handleVideoHoverLeave}
            onClick={toggleControls}
          >
            {/* Overlay menu */}
            <ContextMenuTrigger>
              <div className="flex flex-col justify-end h-full p-4">
                  <div className="flex items-center mb-4 relative">
                    <div className="relative flex-grow">
                      <SeekBar 
                          playervalue={currentTime}
                          duration={duration}
                          bufferValue={buffer} 
                          onChange={handleSeek}
                          onMouseMove={handleSeekHover}
                          onMouseLeave={handleSeekLeave}
                          onClick={(e) => e.stopPropagation()}         
                        ></SeekBar>
                        {showPreview && currentPreviewUrl && (
                          <div 
                            className="absolute bottom-4 w-40 flex flex-col justify-center" 
                            style={{
                              left: `clamp(0px, calc(${hoverPosition * 100}% - 80px), calc(100% - 160px))`,
                            }}
                          >
                            <div
                              ref={previewRef}
                              className="h-[90px] overflow-hidden pointer-events-none rounded border-white border"
                            >
                              <div
                                className="w-[800px] h-[450px]"  // 10x10タイルの全体サイズ
                                style={{
                                  backgroundImage: `url(${currentPreviewUrl})`,
                                  backgroundPosition: `${previewPosition.x}px ${previewPosition.y}px`,
                                }}
                              />
                            </div>
                            <p className="mt-1 text-white mx-[auto]">{formatTime(previewTime)}</p>
                          </div>
                        )}
                    </div>
                  </div>
                <input
                  ref={LinkText}
                  className="hidden"
                  readOnly
                  value={"https://live.tokuly.com/video/" + id}
                />
                <div className="flex items-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleControls();
                    }}
                    className="text-white"
                  >
                    {isPlaying ? (
                      <FontAwesomeIcon size="lg" icon={faPause} />
                    ) : (
                      <FontAwesomeIcon size="lg" icon={faPlay} />
                    )}
                  </button>
                  <div className="flex ml-3 items-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleMute();
                      }}
                      className="text-white"
                    >
                      {isMuted ? (
                        <FontAwesomeIcon
                          className="text-white"
                          size="lg"
                          icon={faVolumeMute}
                        />
                      ) : (
                        <FontAwesomeIcon
                          className="text-white"
                          size="lg"
                          icon={faVolumeHigh}
                        />
                      )}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={volume}
                      onChange={handleVolumeChange}
                      onClick={(e) => e.stopPropagation()}
                      className="ml-[5px] h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer bg-gray-700"
                    />
                  </div>
                  <div className="flex ml-3">
                    <span className="text-white">{formatTime(currentTime)}</span>
                    <span className="text-white mx-1">/</span>
                    <span className="text-white">{formatTime(duration)}</span>
                  </div>
                  <div className="ml-[auto]">
                    <DropdownMenu open={qualityMenuOpen} onOpenChange={(open)=>{
                      if(open){
                        setQualityMenuOpen(true);
                        setShowControls(true);
                      }else{
                        setQualityMenuOpen(false);
                      }
                    }}>
                      <DropdownMenuTrigger onClick={(e)=>{e.stopPropagation()}}>
                          <FontAwesomeIcon size="lg" icon={faGear} color="white" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent side="top">
                        <DropdownMenuLabel>画質選択</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuRadioGroup value={videoQuality} onValueChange={setVideoQuality} onClick={(e)=>{e.stopPropagation(),setShowControls(false)}} >
                          <DropdownMenuRadioItem value="-1">Auto {videoQuality === "-1" ? videoQualityList.length >= 2 ? `(${videoQualityList[hlsRef.current ? hlsRef.current.currentLevel : 0]})`: "(ソース)" : ""}</DropdownMenuRadioItem>
                          {videoQualityList.length >= 2 && videoQualityList.slice().reverse().map((quality, index) => (
                            <DropdownMenuRadioItem key={videoQualityList.length - 1 - index} value={(videoQualityList.length - 1 - index).toString()}>
                              {quality}
                            </DropdownMenuRadioItem>
                          ))}
                        </DropdownMenuRadioGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    {isFullScreen ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          exitFullScreen();
                        }}
                        className="bottom-[0px] right-[0px] mt-[-10px] mr-[10px] ml-[20px] text-white"
                      >
                        <FontAwesomeIcon size="lg" icon={faCompress} />
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          enterFullScreen();
                        }}
                        className="bottom-[0px] right-[0px] mt-[-10px] mr-[10px] ml-[20px] text-white"
                      >
                        <FontAwesomeIcon size="lg" icon={faExpand} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="absolute bg-white w-[100px] h-[25px] top-[20px] right-[10px] rounded-md">
                  <p className=" text-black text-center font-semibold">
                    アーカイブ
                  </p>
                </div>
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <DialogTrigger asChild>
                <ContextMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <FontAwesomeIcon icon={faShare} className="mr-[10px]" />
                  共有する
                </ContextMenuItem>
              </DialogTrigger>
              <ContextMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  copyLink();
                }}
              >
                <FontAwesomeIcon icon={faCopy} className="mr-[10px]" />
                リンクをコピー
              </ContextMenuItem>
            </ContextMenuContent>
          </div>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>シェアリンク</DialogTitle>
              <DialogDescription>
                このリンクを他の人にシェアしよう！
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center space-x-2">
              <div className="grid flex-1 gap-2">
                <Label htmlFor="link" className="sr-only">
                  Link
                </Label>
                <Input
                  id="link"
                  defaultValue={"https://live.tokuly.com/video/" + id}
                  readOnly
                />
              </div>
              <Button
                type="submit"
                size="sm"
                className="px-3"
                onClick={copyLink}
              >
                <span className="sr-only">Copy</span>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center space-x-2">
              <div className="grid flex-1 gap-2">
                <Label htmlFor="emded_code" className="">
                  埋め込みコード
                </Label>
                <Textarea
                  id="emded_code"
                  ref={EmdedCode}
                  readOnly
                  defaultValue={`<iframe src="https://live.tokuly.com/embed/${id}" title="Tokuly video player" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen class="tokuly-live"></iframe>`}
                ></Textarea>
              </div>
              <Button
                type="submit"
                size="sm"
                className="px-3"
                onClick={copyEmdedCode}
              >
                <span className="sr-only">Copy</span>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <DialogFooter className="sm:justify-start">
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Close
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </ContextMenu>
    </div>
  );
}

export default Player;
