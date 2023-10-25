"use client";
import React, { useState } from 'react';
import './in.css';
import Player from './live/[id]/player';

interface OptionProps {
  image: string;
  icon: string;
  main: string;
  sub: string;
  video_id:string;
  active: boolean;
  onClick: () => void;
  style: { [key: string]: string };
}

type Live = {
  id: string;
  title: string;
  stream_name: string;
  thumbnail_url: string;
  ch_name: string;
  ch_icon: string;
  ch_handle: string;
};
type LiveProps = {
    lives:Live[];
}
function Option({ image, icon, main, sub, active, onClick, style,video_id }: OptionProps) {
  const optionClass = active ? 'option active' : 'option';

  return (
    <div className={optionClass} style={style} onClick={onClick}>
      {active && (
        <>
          <Player id={video_id} className={"absolute h-[100%]"}></Player>
          <a href={"/live/"+video_id} className="absolute bottom-0 right-0 text-white m-[10px] font-bold p-[10px] rounded-full bg-opacity-60 bg-black">配信を見る</a>
        </>
      )}
      <div className="label">
        <div className="icon" style={{ backgroundImage: `url(${icon})`, backgroundSize: 'cover' }}></div>
        {active && (
        <div className="info">
          <div className="main">{main}</div>
          <div className="sub">{sub}</div>
        </div>
        )}
      </div>
    </div>
  );
}

function TopLive(props:LiveProps) {
  const [activeOption, setActiveOption] = useState<number>(0);
  const {lives} = props;
  const options = lives;

  const handleOptionClick = (index: number) => {
    setActiveOption(index);
  };

  return (
    <div className="options">
      {options.slice(0, 5).map((option, index) => (
        <Option
          key={index}
          image={option.thumbnail_url}
          icon={option.ch_icon}
          main={option.ch_name}
          sub={option.title}
          video_id={option.stream_name}
          active={index === activeOption}
          onClick={() => handleOptionClick(index)}
          style={{ '--optionBackground': `url(${option.thumbnail_url})` }}
        />
      ))}
    </div>
  );
  
}

export default TopLive;
