import React from 'react';
import Image from 'next/image';
import Video from './player';

export default function LivePlayer({ params }: { params: { id: string } }) {
  return (
        <Video id={params.id} />
  )
}
