"use client";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import Ch from "./chList";

export default function LayoutContent({
  children,
  channels,
}: {
  children: React.ReactNode;
  channels: any[];
}) {
  return (
    <ResizablePanelGroup direction="horizontal" className="items-stretch">
      <ResizablePanel
        defaultSize={20}
        collapsedSize={4}
        collapsible={true}
        minSize={15}
        maxSize={20}
        className="bg-white px-2 py-4"
      >
        {channels.channels.map((ch, index) => (
          <Ch
            key={index}
            icon_url={ch.icon_url}
            name={ch.name}
            handle={ch.handle}
            game={ch.game}
          />
        ))}
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={80}>{children}</ResizablePanel>
    </ResizablePanelGroup>
  );
}
