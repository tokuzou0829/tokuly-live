"use client";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import Ch from "./chList";
import type { Channels } from "@/types/channel";

export default function LayoutContent({
  children,
  channels,
}: {
  children: React.ReactNode;
  channels: Channels;
}) {
  return (
    <ResizablePanelGroup direction="horizontal" className="items-stretch">
      <ResizablePanel
        defaultSize={15}
        collapsedSize={4}
        collapsible={true}
        minSize={10}
        maxSize={15}
        className="bg-white sticky top-[0px] z-20 p-4"
      >
        <div className="space-y-3 ">
          <p>おすすめチャンネル</p>
          <div className="space-y-4">
            {channels.channels.map((ch, index) => (
              <Ch key={index} ch={ch} />
            ))}
          </div>
        </div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={85}>{children}</ResizablePanel>
    </ResizablePanelGroup>
  );
}
