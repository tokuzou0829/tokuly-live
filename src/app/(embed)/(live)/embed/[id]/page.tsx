"use client";

import TokulyPlayerPreview from "@/components/tokuly-player-preview";
import React from "react";

export default function LivePage({ params }: { params: { id: string } }) {
  return <TokulyPlayerPreview streamKey={params.id} />;
}
