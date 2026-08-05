"use client";

import React from "react";
import { useListenerAnalytics } from "./listener-analytics";

function Viewer() {
  const { listenerCount } = useListenerAnalytics();
  return (
    <div>
      <p>視聴者数 : {listenerCount}</p>
    </div>
  );
}

export default Viewer;
