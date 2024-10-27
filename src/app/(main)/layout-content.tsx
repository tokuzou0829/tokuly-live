"use client";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ChList } from "./chList";
import type { Channels } from "@/types/channel";
import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { Nav } from "@/app/(main)/nav";
import { Home, Radio } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { usePathname } from 'next/navigation';

export default function LayoutContent({
  children,
  channels,
}: {
  children: React.ReactNode;
  channels: Channels;
}) {
  const pathname = usePathname();
  const firstLocation = pathname.startsWith('/video/') || pathname.startsWith('/live/');
  const [isCollapsed, setIsCollapsed] = useState(firstLocation ? true : false);
  const panelRef = useRef<any>(null);

  useEffect(() => {
    const isPhone = window.innerWidth < 1150;
    if(isPhone) {
      setIsCollapsed(true);
      panelRef.current?.collapse();
    }
  }, []);

  useEffect(() => {
    const isLocation = pathname.startsWith('/video/') || pathname.startsWith('/live/');
    if (isLocation) {
      panelRef.current?.collapse();
      setIsCollapsed(true);
    }
    if(pathname === '/' && window.innerWidth > 1150) {
      panelRef.current?.expand();
      setIsCollapsed(false);
    }
  }, [pathname]);

  return (
    <TooltipProvider delayDuration={0}>
      <ResizablePanelGroup
        onLayout={(sizes: number[]) => {
          document.cookie = `react-resizable-panels:layout=${JSON.stringify(
            sizes
          )}`;
        }}
        direction="horizontal"
        className="items-stretch"
      >
        <ResizablePanel
          defaultSize={firstLocation? 4 : 15}
          collapsedSize={4}
          ref={panelRef}
          collapsible={true}
          minSize={10}
          maxSize={15}
          onCollapse={() => {
            setIsCollapsed(true);
            document.cookie = `react-resizable-panels:collapsed=${JSON.stringify(
              true
            )}`;
          }}
          onExpand={() => {
            setIsCollapsed(false);
            document.cookie = `react-resizable-panels:collapsed=${JSON.stringify(
              false
            )}`;
          }}
          className={cn(
            "bg-white sticky top-[0px] z-20",
            isCollapsed &&
              "min-w-[50px] transition-all duration-300 ease-in-out"
          )}
        >
          <Nav
            isCollapsed={isCollapsed}
            links={[
              {
                title: "ホーム",
                href: "/",
                variant: "default",
                icon: Home,
                label: "",
              },
              {
                title: "配信を開始",
                href: "https://tokuly.com/studio",
                variant: "ghost",
                label: "",
                icon: Radio,
              },
            ]}
          />
          <ChList isCollapsed={isCollapsed} channels={channels} />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={85}>{children}</ResizablePanel>
      </ResizablePanelGroup>
    </TooltipProvider>
  );
}
