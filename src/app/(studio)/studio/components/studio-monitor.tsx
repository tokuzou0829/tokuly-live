import TokulyPlayerPreview from "@/components/tokuly-player-preview";
import React from "react";

export default function StudioMonitor({ streamKey }: { streamKey: string }) {
  return (
    <div className="aspect-video w-full min-w-0 max-w-full overflow-hidden rounded-xl bg-black [&>*]:min-w-0 [&>*]:max-w-full">
      <TokulyPlayerPreview streamKey={streamKey} />
    </div>
  );
}
