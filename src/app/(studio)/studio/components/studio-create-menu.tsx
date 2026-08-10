"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Plus, Radio, Upload } from "lucide-react";
import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";

export default function StudioCreateMenu({ variant = "button" }: { variant?: "button" | "icon" }) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCloseTimer = () => {
    if (!closeTimer.current) return;
    clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };

  const showMenu = () => {
    clearCloseTimer();
    setOpen(true);
  };

  const scheduleClose = () => {
    clearCloseTimer();
    closeTimer.current = setTimeout(() => {
      setOpen(false);
      closeTimer.current = null;
    }, 200);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    clearCloseTimer();
    setOpen(nextOpen);
  };

  useEffect(() => () => clearCloseTimer(), []);

  return (
    <DropdownMenu modal={false} open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        {variant === "icon" ? (
          <Button
            variant="ghost"
            size="icon"
            className="group h-11 w-11 shrink-0 rounded-full p-1.5 text-black hover:bg-transparent hover:text-black"
            aria-label="作成メニューを開く"
            onMouseEnter={showMenu}
            onMouseLeave={scheduleClose}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--studio-border)] bg-white shadow-sm transition-colors group-hover:bg-neutral-100">
              <Plus className="h-4 w-4" />
            </span>
          </Button>
        ) : (
          <Button
            aria-label="コンテンツを作成"
            onMouseEnter={showMenu}
            onMouseLeave={scheduleClose}
          >
            <Plus className="mr-2 h-4 w-4" />
            作成
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-52"
        onMouseEnter={showMenu}
        onMouseLeave={scheduleClose}
      >
        {variant === "icon" && (
          <>
            <DropdownMenuLabel>新しく作成</DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem asChild>
          <Link href="/studio/videos/new">
            <Upload className="mr-2 h-4 w-4" />
            動画をアップロード
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/studio/streams/new">
            <Radio className="mr-2 h-4 w-4" />
            ライブ配信を作成
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
