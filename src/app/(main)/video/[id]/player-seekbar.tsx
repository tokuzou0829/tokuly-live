import React, { useState, useRef, useEffect, useCallback } from "react";
import { useAtom } from "jotai";
import { IsWatchWithFriend, IsPartyHost } from "@/atoms/watchWithFriendAtom";

type SeekBarProps = {
  playervalue: number;
  bufferValue: number;
  duration: number;
  onChange: (value: number) => void;
  onMouseMove?: (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
  onMouseLeave?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
};

export function seekBarPercent(value: number, duration: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(duration) || duration <= 0) return 0;
  return Math.min(100, Math.max(0, (value / duration) * 100));
}

const SeekBar = ({
  playervalue,
  bufferValue,
  duration,
  onChange,
  onMouseMove,
  onMouseLeave,
  onClick,
}: SeekBarProps) => {
  const [value, setValue] = useState(seekBarPercent(playervalue, duration));
  const [isDragging, setIsDragging] = useState(false);
  const seekBarRef = useRef<HTMLDivElement>(null);
  const [seek, setSeek] = useState(0);
  const [isWatchWithFriend] = useAtom(IsWatchWithFriend);
  const [isHost] = useAtom(IsPartyHost);

  const updateValue = useCallback(
    (clientX: number) => {
      if (seekBarRef.current && (!isWatchWithFriend || isHost)) {
        const rect = seekBarRef.current.getBoundingClientRect();
        const x = clientX - rect.left;
        const newValue = Math.max(0, Math.min(100, (x / rect.width) * 100));
        onChange((newValue / 100) * duration);
      }
    },
    [duration, isHost, isWatchWithFriend, onChange]
  );

  const handleStart = (clientX: number) => {
    setIsDragging(true);
    updateValue(clientX);
  };

  const handleMove = useCallback(
    (clientX: number) => {
      if (isDragging) {
        updateValue(clientX);
      }
      if (onMouseMove && seekBarRef.current) {
        const rect = seekBarRef.current.getBoundingClientRect();
        const syntheticEvent = {
          currentTarget: seekBarRef.current,
          target: seekBarRef.current,
          clientX: clientX,
          clientY: 0,
          getBoundingClientRect: () => rect,
        } as unknown as React.MouseEvent<HTMLDivElement, MouseEvent>;
        const x = clientX - rect.left;
        const newSeekValue = Math.max(0, Math.min(100, (x / rect.width) * 100));
        setSeek(newSeekValue);
        onMouseMove(syntheticEvent);
      }
    },
    [isDragging, onMouseMove, updateValue]
  );

  const handleEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Mouse event handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => handleStart(e.clientX);
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) =>
    !isDragging && handleMove(e.clientX);
  const handleMouseUp = useCallback(() => handleEnd(), [handleEnd]);

  // Touch event handlers
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) =>
    handleStart(e.touches[0].clientX);
  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => handleMove(e.touches[0].clientX);
  const handleTouchEnd = useCallback(() => handleEnd(), [handleEnd]);

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => isDragging && handleMove(e.clientX);
    const handleGlobalTouchMove = (e: TouchEvent) => isDragging && handleMove(e.touches[0].clientX);

    if (isDragging) {
      document.addEventListener("mousemove", handleGlobalMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.addEventListener("touchmove", handleGlobalTouchMove);
      document.addEventListener("touchend", handleTouchEnd);
    }

    return () => {
      document.removeEventListener("mousemove", handleGlobalMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchmove", handleGlobalTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isDragging, handleMove, handleMouseUp, handleTouchEnd]);

  useEffect(() => {
    setValue(seekBarPercent(playervalue, duration));
  }, [playervalue, duration]);

  const bufferPercent = seekBarPercent(bufferValue, duration);

  return (
    <div className="w-full">
      <div
        ref={seekBarRef}
        className="relative h-1 bg-gray-100 bg-opacity-[0.6] rounded-full cursor-pointer transition-all duration-300 ease-in-out hover:h-2 group"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseLeave={onMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={
          onClick
            ? (e) => {
                e.stopPropagation();
                onClick(e);
              }
            : undefined
        }
      >
        <div
          data-testid="seekbar-buffer"
          style={{ width: `${bufferPercent}%` }}
          className="absolute h-full bg-gray-400 rounded-full"
        />
        {(!isWatchWithFriend || isHost) && (
          <div
            style={{ width: `${seek}%` }}
            className="absolute h-full bg-gray-300 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          />
        )}
        <div
          data-testid="seekbar-progress"
          style={{ width: `${value}%` }}
          className="absolute h-full bg-white rounded-full"
        />
        {(!isWatchWithFriend || isHost) && (
          <div
            data-testid="seekbar-thumb"
            style={{ left: `clamp(8px, ${value}%, calc(100% - 8px))` }}
            className="absolute w-4 h-4 bg-white rounded-full top-1/2 transform -translate-x-1/2 -translate-y-1/2 hover:scale-110 transition-transform duration-200 shadow-md"
          />
        )}
      </div>
    </div>
  );
};

export default SeekBar;
