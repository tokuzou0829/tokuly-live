import React from 'react';
import Ch from './chList';
type Channels = {
    channels: Channel[]
  }
  type Channel = {
    name:string,
    icon_url:string,
    handle:string,
  }
export default async function RecommendationCh(){
    const response = await fetch("https://api.tokuly.com/live/channel/recommendation",{method: "POST", cache: 'no-store'});
    const channels:Channels = await response.json();
    return (
        channels.channels.map((ch,index) =>(
            <Ch key={index} icon_url={ch.icon_url} name={ch.name} handle={ch.handle} />
        ))
    );
}
