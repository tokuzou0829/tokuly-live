'use client';

import React, { Component } from 'react';
import Hls from 'hls.js';

interface VideoProps {
  id: string; // idプロパティの型を指定
}

class Video extends Component<VideoProps> {
  private myRef: React.RefObject<HTMLVideoElement>;

  constructor(props: VideoProps) {
    super(props);
    this.myRef = React.createRef();
  }

  componentDidMount() {
    this.loadVideo();
  }

  loadVideo() {
    // 受け取った id プロパティを使って動的なビデオソースURLを生成
    const { id } = this.props;
    const videoSrc = `https://live.tokuly.com/hls/${id}.m3u8`;

    if (Hls.isSupported()) {
      var hls = new Hls();
      hls.loadSource(videoSrc);
      hls.attachMedia(this.myRef.current!);
    }
  }

  render() {
    return (
      <>
        <video
          autoPlay
          controls
          ref={this.myRef}
          style={{ width: '100%' }}
        ></video>
      </>
    );
  }
}

export default Video;
