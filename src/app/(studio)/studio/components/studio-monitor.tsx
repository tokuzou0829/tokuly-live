import TokulyPlayerPreview from "@/components/tokuly-player-preview";
import React from "react";

export default function StudioMonitor({ streamKey }: { streamKey: string }) {
  return (
    <div className="aspect-video overflow-hidden rounded-xl bg-black">
      <TokulyPlayerPreview streamKey={streamKey} />
    </div>
  );
}
