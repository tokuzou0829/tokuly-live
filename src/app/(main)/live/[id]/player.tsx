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
  faRotateLeft,
  faClock,
  faRefresh,
} from "@fortawesome/free-solid-svg-icons";
import Hls from "hls.js";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Button } from "@/components/ui/button";
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
import SeekBar from "../../video/[id]/player-seekbar";

interface VideoProps {
  id: string;
  className?: string;
}

function Player(props: VideoProps) {
  const { id, className } = props;
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
  const [showLiveButton, setShowLiveButton] = useState<boolean>(false);
  const [hasInteractedWithSeek, setHasInteractedWithSeek] = useState<boolean>(false);
  const [isLoadingLiveStream, setIsLoadingLiveStream] = useState<boolean>(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [isSeeking, setIsSeeking] = useState<boolean>(false);
  const lastSeekTimeRef = useRef<number>(0);
  const seekTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const seekRetryCountRef = useRef<number>(0);
  const maxSeekRetries = 3; // 最大リトライ回数
  const seekTargetPositionRef = useRef<number | null>(null); // シークの目標位置（シークバー上での位置）
  
  // 実際の再生開始を検知するための状態
  const [playbackStarted, setPlaybackStarted] = useState<boolean>(false);
  // 巻き戻し機能用の状態
  const [isRewindMode, setIsRewindMode] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(7200); // 最大2時間（7200秒）
  const [bufferValue, setBufferValue] = useState<number>(0);
  const [hls, setHls] = useState<Hls | null>(null);
  const [isLive, setIsLive] = useState<boolean>(true);
  const [showSeekPreview, setShowSeekPreview] = useState<boolean>(false);
  const [seekPreviewTime, setSeekPreviewTime] = useState<number>(0);
  // 実際のHLS動画の長さを記録する状態
  const [actualHlsDuration, setActualHlsDuration] = useState<number>(7200);
  // シークバー表示用の最大時間（実際の長さまたは最大2時間）
  const [maxSeekableDuration, setMaxSeekableDuration] = useState<number>(7200);
  // 巻き戻し開始時のタイムスタンプ
  const rewindStartTimeRef = useRef<number>(0);
  // 巻き戻しモードの開始時刻
  const rewindStartedAtRef = useRef<number>(Date.now());
  // 定期的な更新のためのインターバルID
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // 巻き戻しモードへの切り替え中かどうか
  const [isLoadingRewindStream, setIsLoadingRewindStream] = useState<boolean>(false);
  // シーク待機中の目標時間
  const pendingSeekTimeRef = useRef<number | null>(null);

  // 自動的にライブモードに戻るための閾値（秒）
  const liveThresholdSeconds = 5;

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
        if (playerRef.current && myRef.current!.played) {
         // console.log("hide");
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

  // 現在の再生時間を更新
  useEffect(() => {
    const video = myRef.current;
    if (!video) return;

    const updateCurrentTime = () => {
      // 再生が始まったらローディングを非表示に
      if (!playbackStarted && video.currentTime > 0) {
        setPlaybackStarted(true);
        setIsLoadingLiveStream(false);
        setIsLoadingRewindStream(false);
        setIsInitializing(false);
      }
      
      // シーク操作中で、目標時間に近い位置まで到達したらシーク完了とみなす
      if (isSeeking && isRewindMode) {
        const currentSeekTime = video.currentTime;
        const seekDifference = Math.abs(currentSeekTime - lastSeekTimeRef.current);
        
        // 目標時間に1秒以内に近づいたか、またはバッファリングが目標時間を超えたらシーク完了
        if (seekDifference < 1.0 || (video.buffered.length > 0 && lastSeekTimeRef.current <= video.buffered.end(video.buffered.length - 1))) {
          console.log('Seek completed to:', currentSeekTime, 'target was:', lastSeekTimeRef.current);
          setIsSeeking(false);
          seekRetryCountRef.current = 0; // リトライカウントをリセット
          seekTargetPositionRef.current = null; // シーク目標をクリア
        }
      }
      
      if (isRewindMode) {
        // 巻き戻しモードでは、現在の再生位置をシークバー上の位置に変換
        const relativePosition = video.currentTime;
        // 実際の動画長に対する相対位置をシークバー上の位置に変換
        const seekBarPosition = (relativePosition / actualHlsDuration) * maxSeekableDuration;
        
        // シークバー位置が限界を超えないように制限
        const clampedPosition = Math.min(seekBarPosition, maxSeekableDuration);
        setCurrentTime(clampedPosition);
        
        // バッファー状態の更新
        if (video.buffered.length > 0) {
          const bufferedEnd = video.buffered.end(video.buffered.length - 1);
          // 実際のバッファ位置をシークバー上の位置に変換
          const seekBarBufferPosition = (bufferedEnd / actualHlsDuration) * maxSeekableDuration;
          // バッファー位置も限界を超えないように制限
          setBufferValue(Math.min(seekBarBufferPosition, maxSeekableDuration));
        }
        
        // 巻き戻しモードで最後まで再生したらライブモードに戻る
        if (relativePosition >= video.duration - 1) {
          switchToLiveMode();
        }
        
        // 最新位置（-0秒）に近い場合、自動的にライブモードに戻る
        // 現在位置と最大位置の差が閾値未満かどうかをチェック
        const remainingTime = maxSeekableDuration - clampedPosition;
        if (remainingTime < liveThresholdSeconds && !isSeeking) {
          console.log('Near live position, switching back to live mode');
          switchToLiveMode();
        }
      } 
    };

    video.addEventListener("timeupdate", updateCurrentTime);
    
    // シーク開始時のイベントハンドラ
    const handleSeeking = () => {
      if (isRewindMode) {
        console.log('Seeking started');
        setIsSeeking(true);
        
        // 既存のタイムアウトをクリア
        if (seekTimeoutRef.current) {
          clearTimeout(seekTimeoutRef.current);
        }
      }
    };
    
    // シーク完了時のイベントハンドラ（ネイティブイベント）
    const handleSeeked = () => {
      if (seekTimeoutRef.current) {
        clearTimeout(seekTimeoutRef.current);
      }
      console.log('Seek ended natively');
      setIsSeeking(false);
    };
    
    // waiting イベント（バッファリング中）のハンドラ
    const handleWaiting = () => {
      if (isRewindMode && !isLoadingRewindStream) {
        console.log('Buffering...');
        setIsSeeking(true);
        
        if (seekTimeoutRef.current) {
          clearTimeout(seekTimeoutRef.current);
        }
        
        // 10秒後にシーク状態を強制解除（フォールバック）
        seekTimeoutRef.current = setTimeout(() => {
          setIsSeeking(false);
        }, 10000);
      }
    };
    
    // playing イベント（再生開始/再開）のハンドラ
    const handlePlaying = () => {
      if (isSeeking) {
        console.log('Playing, ending seek state');
        if (seekTimeoutRef.current) {
          clearTimeout(seekTimeoutRef.current);
        }
        setIsSeeking(false);
      }
    };
    
    video.addEventListener("seeking", handleSeeking);
    video.addEventListener("seeked", handleSeeked);
    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("playing", handlePlaying);
    
    return () => {
      video.removeEventListener("timeupdate", updateCurrentTime);
      video.removeEventListener("seeking", handleSeeking);
      video.removeEventListener("seeked", handleSeeked);
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("playing", handlePlaying);
      
      if (seekTimeoutRef.current) {
        clearTimeout(seekTimeoutRef.current);
      }
    };
  }, [isRewindMode, actualHlsDuration, maxSeekableDuration, playbackStarted, isSeeking, isLoadingRewindStream, liveThresholdSeconds]);

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

  // タイムシフトプレイリストの長さを取得する関数
  const getRewindPlaylistDuration = async () => {
    try {
      const rewindSrc = `https://live-data.tokuly.com/hls_rewind/${id}/index.m3u8`;
      const response = await fetch(rewindSrc);
      
      if (!response.ok) {
        console.error(`Failed to fetch rewind playlist: ${response.status}`);
        return null;
      }
      
      const playlist = await response.text();
      
      // HLSプレイリストを分析して長さを取得
      // このロジックはプレイリスト形式によって調整が必要かもしれない
      if (playlist && playlist.includes('#EXT-X-PLAYLIST-TYPE:VOD')) {
        // プレイリスト内の全セグメントの長さを合計
        const segmentDurations = playlist.match(/#EXTINF:([0-9.]+)/g);
        if (segmentDurations) {
          let totalDuration = 0;
          segmentDurations.forEach(segment => {
            const duration = parseFloat(segment.replace('#EXTINF:', ''));
            if (!isNaN(duration)) {
              totalDuration += duration;
            }
          });
          
          console.log(`Rewind playlist total duration: ${totalDuration}s`);
          return totalDuration;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching rewind playlist:', error);
      return null;
    }
  };
  
  // ライブストリームをロードする関数
  const loadLiveStream = () => {
    const videoSrc = `https://live-data.tokuly.com/hls/${id}/index.m3u8`;
    
    setIsLoadingLiveStream(true);
    setStreamError(null);
    setPlaybackStarted(false);
    
    if (hls) {
      hls.destroy();
    }
    
    if (Hls.isSupported()) {
      const newHls = new Hls({
        enableWorker: true,
        maxBufferLength: 10,
        liveBackBufferLength: 5,
        liveSyncDuration: 3,
        liveMaxLatencyDuration: 10,
        liveDurationInfinity: true,
        highBufferWatchdogPeriod: 3,
        maxLiveSyncPlaybackRate: 1,
      });
      
      // エラーハンドリング
      newHls.on(Hls.Events.ERROR, (_, data) => {
        console.error("HLS error:", data);
        if (data.fatal) {
          setStreamError(`ストリーム読み込みに失敗しました: ${data.details}`);
          setIsLoadingLiveStream(false);
        }
      });
      
      newHls.loadSource(videoSrc);
      newHls.attachMedia(myRef.current!);
      newHls.on(Hls.Events.MANIFEST_PARSED, () => {
        // 初期化中フラグを解除 - ライブ配信の準備ができたら再生を優先
        setIsInitializing(false);
        myRef.current!.currentTime = myRef.current!.duration;
        myRef.current!.play().catch(e => {
          console.error("Error playing video:", e);
          setStreamError(`再生開始に失敗しました: ${e.message}`);
          setIsLoadingLiveStream(false);
        });
      });
      setHls(newHls);
    } else {
      const video = myRef.current!;
      video.src = videoSrc;
      video.load();
      myRef.current!.currentTime = myRef.current!.duration;
      
      video.oncanplay = () => {
        setIsInitializing(false);
        myRef.current!.play().catch(e => {
          console.error("Error playing video:", e);
          setStreamError(`再生開始に失敗しました: ${e.message}`);
          setIsLoadingLiveStream(false);
        });
      };
      
      video.onerror = () => {
        setStreamError(`ストリーム読み込みに失敗しました。再試行してください。`);
        setIsLoadingLiveStream(false);
        setIsInitializing(false);
      };
    }
    
    setIsLive(true);
  };
  
  // 巻き戻しストリームをロードする関数
  const loadRewindStream = (targetSeekPosition?: number) => {
    const rewindSrc = `https://live-data.tokuly.com/hls_rewind/${id}/index.m3u8`;
    
    // 既存のHLSインスタンスを破棄する前に、現在の映像を一時的に保持
    if (myRef.current) {
      // 映像を一時停止（ポーズ）して切り替え中の見栄えを良くする
      myRef.current.pause();
    }
    
    // ローディング状態を設定
    setIsLoadingRewindStream(true);
    setPlaybackStarted(false);
    setIsSeeking(false); // 新しいストリームロード時はシーク状態をリセット
    
    // シーク目標位置があれば保存
    if (targetSeekPosition !== undefined) {
      pendingSeekTimeRef.current = targetSeekPosition;
    }
    
    // 既存のHLSインスタンスを破棄
    if (hls) {
      hls.destroy();
    }
    
    // 巻き戻し開始時のタイムスタンプを記録
    rewindStartTimeRef.current = Date.now();
    rewindStartedAtRef.current = Date.now();
    
    // 巻き戻しモード開始時に定期的な更新を開始
    startPeriodicUpdate();
    
    if (Hls.isSupported()) {
      const newHls = new Hls({
        enableWorker: true,
        maxBufferLength: 30,
        // タイムアウト設定を追加して、ロード失敗時のハンドリングを強化
        manifestLoadingTimeOut: 20000,
        manifestLoadingMaxRetry: 3,
      });
      
      // ストリーム読み込み中のエラーハンドリング
      newHls.on(Hls.Events.ERROR, (_, data) => {
        console.error("HLS error:", data);
        if (data.fatal) {
          // 致命的なエラーの場合はライブモードに戻す
          console.error("Fatal HLS error, reverting to live mode");
          setIsLoadingRewindStream(false);
          pendingSeekTimeRef.current = null;
          switchToLiveMode();
        }
      });
      
      // 読み込み進捗のイベントをリッスン
      newHls.on(Hls.Events.MANIFEST_LOADING, () => {
        console.log("Rewind manifest loading");
        setIsLoadingRewindStream(true);
      });
      
      newHls.loadSource(rewindSrc);
      newHls.attachMedia(myRef.current!);
      
      // ストリームの解析が完了したときのイベント
      newHls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log("Rewind stream manifest parsed");
      });
      
      // 巻き戻しモードでメディア情報が取得できたらdurationを設定
      newHls.on(Hls.Events.LEVEL_LOADED, (_, data) => {
        // プレイリストの合計時間を取得
        if (data.details && data.details.totalduration) {
          const actualDuration = data.details.totalduration;
          setActualHlsDuration(actualDuration);
          
          // シークバーの範囲を更新
          updateSeekbarRange(actualDuration);
          
          // 最初のセグメントが読み込まれたら再生開始
          // ローディング状態はtimeupdate時に解除
          if (pendingSeekTimeRef.current !== null && myRef.current) {
            const seekRatio = pendingSeekTimeRef.current / maxSeekableDuration;
            const targetTime = seekRatio * actualDuration;
            console.log(`Applying pending seek to ${targetTime}s`);
            
            // 目標時間を記録（シーク完了判定用）
            lastSeekTimeRef.current = targetTime;
            
            myRef.current.currentTime = targetTime;
            pendingSeekTimeRef.current = null;
            myRef.current.play().catch(e => console.error("Error playing video:", e));
          } else {
            // シーク待機がない場合は通常再生
            myRef.current!.play().catch(e => console.error("Error playing video:", e));
          }
        }
      });
      
      // 定期的にプレイリスト情報を更新
      newHls.on(Hls.Events.LEVEL_UPDATED, (_, data) => {
        if (data.details && data.details.totalduration) {
          const actualDuration = data.details.totalduration;
          if (Math.abs(actualDuration - actualHlsDuration) > 5) { // 5秒以上の変更があれば更新
            setActualHlsDuration(actualDuration);
            updateSeekbarRange(actualDuration);
          }
        }
      });
      
      setHls(newHls);
    } else {
      const video = myRef.current!;
      video.src = rewindSrc;
      video.load();
      
      video.onerror = () => {
        console.error("Video error during rewind stream loading");
        setIsLoadingRewindStream(false);
        setStreamError("タイムシフトの読み込みに失敗しました。ライブモードに戻ります。");
        setTimeout(() => switchToLiveMode(), 2000);
      };
      
      video.oncanplaythrough = () => {
        // タイムシフトの準備ができたら再生を開始
        // 注: ローディング状態はtimeupdateイベントで解除
        if (pendingSeekTimeRef.current !== null) {
          const seekRatio = pendingSeekTimeRef.current / maxSeekableDuration;
          const targetTime = seekRatio * video.duration;
          video.currentTime = targetTime;
          pendingSeekTimeRef.current = null;
        }
        
        video.play().catch(e => console.error("Error playing video:", e));
      };
      
      video.ondurationchange = () => {
        const actualDuration = video.duration;
        setActualHlsDuration(actualDuration);
        updateSeekbarRange(actualDuration);
      };
    }
    
    setIsLive(false);
    setIsRewindMode(true);
    setHasInteractedWithSeek(true);
  };
  
  // シークバーの範囲を更新する関数
  const updateSeekbarRange = (actualDuration: number) => {
    // 実際の再生可能時間を計算
    // 配信が始まって間もない場合はactualDurationが短い
    // 配信時間が2時間を超える場合はHLSが2時間分のセグメントのみ保持
    const seekableDuration = Math.min(Math.max(actualDuration, 0), 7200);
    setMaxSeekableDuration(seekableDuration);
    setDuration(seekableDuration);
    
    console.log(`Updating seekbar range: ${seekableDuration}s (actual: ${actualDuration}s)`);
    
    // 現在位置が新しい最大値を超えていないかチェック
    if (currentTime > seekableDuration) {
      setCurrentTime(seekableDuration);
    }
    
    // バッファー位置も新しい最大値を超えていないかチェック
    if (bufferValue > seekableDuration) {
      setBufferValue(seekableDuration);
    }
  };
  
  // 定期的に更新を行う関数を開始
  const startPeriodicUpdate = () => {
    // 既存のインターバルがあれば停止
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
    }
    
    // 定期的に実行される更新関数
    updateIntervalRef.current = setInterval(() => {
      if (isRewindMode) {
        // 配信が進むにつれてHLSの長さも増加する可能性があるため、
        // 定期的にHLS.jsに問い合わせて最新の時間情報を取得
        if (hls && hls.media && hls.media.duration) {
          const currentMediaDuration = hls.media.duration;
          
          // 現在時刻 - 巻き戻し開始時刻 = 経過時間
          // 経過時間が加わることで、巻き戻し中でも時間が積み重なっていく
          const elapsedSinceStart = (Date.now() - rewindStartedAtRef.current) / 1000;
          
          // 配信開始からの経過時間を計算（最大2時間）
          const potentialDuration = Math.min(currentMediaDuration + elapsedSinceStart, 7200);
          
          // 実際のHLS長さが更新されていた場合
          if (Math.abs(potentialDuration - maxSeekableDuration) > 5) { // 5秒以上の差がある場合のみ更新
            setMaxSeekableDuration(potentialDuration);
            setDuration(potentialDuration);
            console.log(`Auto-updated seekbar range: ${potentialDuration}s`);
          }
        }
      }
    }, 10000); // 10秒ごとに更新
  };
  
  // ライブモードに切り替え
  const switchToLiveMode = () => {
    setIsRewindMode(false);
    setShowLiveButton(false);
    setHasInteractedWithSeek(false);
    
    // 定期更新を停止
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }
    
    loadLiveStream();
  };
  
  // シークバーの処理
  const handleSeekChange = (newValue: number) => {
    if (myRef.current) {
      // シークバーの値を限界内に制限
      const clampedValue = Math.min(Math.max(newValue, 0), maxSeekableDuration);
      
      // 最新位置（最大値）に非常に近い場合、ライブモードに切り替え
      if (maxSeekableDuration - clampedValue < liveThresholdSeconds && isRewindMode) {
        console.log('Seeking to near-live position, switching to live mode');
        switchToLiveMode();
        return;
      }
      
      if (isLive && !hasInteractedWithSeek) {
        // ライブモードでシーク操作を行った場合、自動的に巻き戻しモードに切り替え
        setShowLiveButton(true);
        
        // 巻き戻し時の目標位置をパラメータとして渡す
        loadRewindStream(clampedValue);
      } else if (isRewindMode) {
        // ロード中でもシーク位置を記録（ロード完了後に適用）
        if (isLoadingRewindStream) {
          console.log(`Storing seek position for after loading: ${clampedValue}`);
          pendingSeekTimeRef.current = clampedValue;
          return;
        }
        
        // 巻き戻しモード中のシーク操作
        setIsSeeking(true);
        
        // シークバー上の比率を計算（clampedValueを使用）
        const seekRatio = clampedValue / maxSeekableDuration;
        // 実際のHLSプレイヤーの時間位置に変換
        const targetTime = seekRatio * actualHlsDuration;
        
        // 目標時間を記録
        lastSeekTimeRef.current = targetTime;
        seekTargetPositionRef.current = clampedValue; // シークバー上での目標位置を記録
        seekRetryCountRef.current = 0; // リトライカウントをリセット
        myRef.current.currentTime = targetTime;
        
        // シーク操作を行うと「ライブに戻る」ボタンを表示
        setShowLiveButton(true);
        
        console.log(`Seeking to: ${targetTime}s (ratio: ${seekRatio})`);
        
        // 既存のタイムアウトをクリア
        if (seekTimeoutRef.current) {
          clearTimeout(seekTimeoutRef.current);
        }
        
      }
    }
  };
  
  // シークバーのマウスホバー処理
  const handleSeekMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    // シークバーの最大値を基準に位置を計算
    const seekTime = (x / rect.width) * maxSeekableDuration;
    setSeekPreviewTime(seekTime);
    setShowSeekPreview(true);
  };
  
  // シークバーのマウスリーブ処理
  const handleSeekMouseLeave = () => {
    setShowSeekPreview(false);
  };
  
  // シークバーのクリック処理
  const handleSeekClick = () => {
    setShowLiveButton(true);
  };
  
  // 時間表示のフォーマット (ライブからの経過時間 -HH:MM:SS)
  const formatTime = (seconds: number) => {
    
    // 巻き戻しモードまたはシーク操作後は、ライブからどれだけ遅れているかを表示
    // シークバーの最大値を基準に計算
    const behindSeconds = Math.max(0, maxSeekableDuration - seconds);
    
    const hours = Math.floor(behindSeconds / 3600);
    const minutes = Math.floor((behindSeconds % 3600) / 60);
    const secs = Math.floor(behindSeconds % 60);
    
    return `-${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    // 初回読み込み時の処理
    const initialize = async () => {
      setIsInitializing(true);
      
      // まず最初にライブストリームのチェックを行い、利用可能ならすぐに読み込む
      // これによりタイムシフト情報を待たずにライブ配信の視聴を開始できる
      const videoSrc = `https://live-data.tokuly.com/hls/${id}/index.m3u8`;
      
      try {
        const liveResponse = await fetch(videoSrc, { method: "HEAD" });
        
        if (liveResponse.status === 200) {
          console.log("Live stream is available, starting playback immediately");
          
          // デフォルトのシークバー範囲を設定（タイムシフト情報が取得できるまでの仮の値）
          setMaxSeekableDuration(7200);
          setDuration(7200);
          setCurrentTime(7200); // ライブでは常に最新位置
          
          // ライブ配信をすぐに開始
          loadLiveStream();
          
          // イベントリスナーの追加
          if (myRef.current) {
            myRef.current.addEventListener("pause", handleVideoPause);
          }
          
          // タイムシフト情報は裏で取得
          getRewindPlaylistDuration().then(rewindDuration => {
            if (rewindDuration) {
              // 2時間（7200秒）を上限として設定
              const limitedDuration = Math.min(rewindDuration, 7200);
              setMaxSeekableDuration(limitedDuration);
              setDuration(limitedDuration);
              setCurrentTime(limitedDuration); // ライブでは常に最新位置
              console.log(`Updated seekbar range to ${limitedDuration}s based on playlist`);
            }
          });
          
          // 定期的なチェックを停止
          clearInterval(intervalId);
        } else {
          // ライブが見つからない場合の処理
          setStreamError(`ライブ配信が見つかりません (ステータス: ${liveResponse.status})`);
          setIsLoadingLiveStream(false);
          setIsInitializing(false);
        }
      } catch (error) {
        console.error("Fetch error:", error);
        setStreamError(`ライブ配信の確認に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
        setIsLoadingLiveStream(false);
        setIsInitializing(false);
      }
    };
    
    initialize();
    
    // ライブストリームが見つからない場合は定期的に再試行
    intervalId = setInterval(() => {
      if (isInitializing) {
        const videoSrc = `https://live-data.tokuly.com/hls/${id}/index.m3u8`;
        
        fetch(videoSrc, { method: "HEAD" })
          .then((response) => {
            if (response.status === 200) {
              console.log("Live stream is now available");
              clearInterval(intervalId);
              loadLiveStream();
              myRef.current!.addEventListener("pause", handleVideoPause);
            }
          })
          .catch(error => console.error("Retry fetch error:", error));
      }
    }, 4000);
    
    return () => {
      clearInterval(intervalId);
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
      if (hls) {
        hls.destroy();
      }
    };
  }, [id]);

  return (
    <div ref={playerRef} className={"w-full relative player " + className}>
      <video
        autoPlay
        webkit-playsinline="true"
        playsInline
        ref={myRef}
        className="w-full h-full bg-black aspect-video"
        onMouseEnter={handleVideoHoverEnter}
        onPlay={handleVideoPlay}
        onPause={handleVideoPause}
      ></video>
      
      {/* シンプル化したローディングインジケータ - 初期化とライブストリーム読み込み */}
      {(isInitializing || isLoadingLiveStream) && !streamError && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      
      {/* シンプル化したタイムシフトローディングインジケータ - 読み込みと操作中 */}
      {(isLoadingRewindStream || (isSeeking && isRewindMode)) && !streamError && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      
      {/* エラー表示（背景は残す） */}
      {streamError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-80 z-20">
          <div className="bg-red-900 bg-opacity-90 p-6 rounded-lg max-w-md">
            <div className="text-white text-lg font-bold mb-2">エラーが発生しました</div>
            <div className="text-white mb-4">{streamError}</div>
            <button 
              onClick={() => { 
                setStreamError(null);
                setIsInitializing(true);
                const videoSrc = `https://live.tokuly.com/hls/${id}/index.m3u8`;
                fetch(videoSrc, { method: "HEAD" }).then((response) => {
                  if (response.status === 200) {
                    loadLiveStream();
                  } else {
                    setIsInitializing(false);
                    setStreamError(`ライブ配信が見つかりません (ステータス: ${response.status})`);
                  }
                }).catch(error => {
                  setIsInitializing(false);
                  setStreamError(`ライブ配信の確認に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
                });
              }} 
              className="bg-white text-red-900 px-4 py-2 rounded hover:bg-gray-200 flex items-center justify-center"
            >
              <FontAwesomeIcon icon={faRefresh} className="mr-2" />
              再試行
            </button>
          </div>
        </div>
      )}
      
      <ContextMenu>
        <Dialog>
          <div
            ref={overlayRef}
            className={`absolute bottom-0 left-0 h-full w-full transition-opacity duration-300 ease-in-out ${
              showControls ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
            style={{
              background: 'linear-gradient(to top, rgba(0, 0, 0, 0.8) 0%, transparent 30%)',
            }}
            onMouseLeave={handleVideoHoverLeave}
            onClick={toggleControls}
          >
            {/* Overlay menu */}
            <ContextMenuTrigger>
              <div className="flex flex-col items-end h-full relative">
                <input
                  ref={LinkText}
                  className="hidden"
                  readOnly
                  value={"https://live.tokuly.com/live/" + id}
                />
                
                {/* シークバー (常に操作可能) */}
                <div className="absolute bottom-12 left-0 w-full px-4">
                  {showSeekPreview && (
                    <div className="absolute bottom-6 bg-black bg-opacity-80 text-white px-2 py-1 rounded text-xs"
                         style={{ left: `${(Math.min(seekPreviewTime, maxSeekableDuration) / maxSeekableDuration) * 100}%`, transform: 'translateX(-50%)' }}>
                      {formatTime(Math.min(seekPreviewTime, maxSeekableDuration))}
                    </div>
                  )}
                  
                  {/* 読み込み中も操作可能に - 視覚的な状態のみ変更 */}
                  <div>
                    <SeekBar
                      playervalue={Math.min(currentTime, maxSeekableDuration)}
                      bufferValue={Math.min(bufferValue, maxSeekableDuration)}
                      duration={maxSeekableDuration}
                      onChange={handleSeekChange}
                      onMouseMove={handleSeekMouseMove}
                      onMouseLeave={handleSeekMouseLeave}
                      onClick={handleSeekClick}
                    />
                  </div>
                </div>
                
                <div className="flex items-center w-full px-4 pb-3 mt-auto">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleControls();
                    }}
                    className="text-white mr-4"
                  >
                    {isPlaying ? (
                      <FontAwesomeIcon icon={faPause} />
                    ) : (
                      <FontAwesomeIcon icon={faPlay} />
                    )}
                  </button>
                  
                  {/* ライブに戻るボタン (シーク操作後のみ表示) */}
                  {showLiveButton && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        switchToLiveMode();
                      }}
                      className="text-white mr-3 flex items-center bg-red-600 px-2 py-1 rounded-md"
                      title="ライブ配信に戻る"
                    >
                      <FontAwesomeIcon icon={faClock} className="mr-1" />
                      <span className="text-xs">ライブに戻る</span>
                    </button>
                  )}
                  
                  <div className="flex items-center">
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
                          icon={faVolumeMute}
                        />
                      ) : (
                        <FontAwesomeIcon
                          className="text-white"
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
                  <div className="ml-[auto]">
                    {isFullScreen ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          exitFullScreen();
                        }}
                        className="text-white"
                      >
                        <FontAwesomeIcon icon={faCompress} />
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          enterFullScreen();
                        }}
                        className="text-white"
                      >
                        <FontAwesomeIcon icon={faExpand} />
                      </button>
                    )}
                  </div>
                </div>
                
                <div className={`absolute bg-red-600 w-[100px] h-[25px] top-[20px] right-[10px] rounded-md ${!isLive || hasInteractedWithSeek ? 'bg-opacity-70' : ''}`}>
                  <p className="text-white text-center font-semibold">
                    {isLive && !hasInteractedWithSeek ? 'ライブ配信' : 'タイムシフト'}
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
                  defaultValue={"https://live.tokuly.com/live/" + id}
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
