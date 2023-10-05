import React from 'react';
import Image from 'next/image';
import '../../tokuly-livestyle.css'; // スタイルシートをインポート
import Video from './player';

export default function LivePlayer({ params }: { params: { id: string } }) {
  return (
        <Video id={params.id} />
  )
}
