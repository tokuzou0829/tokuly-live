import Link from "next/link";
import type { Channels, ListChannel } from "@/types/channel";

export function ChList({ channels, isCollapsed }: { channels: Channels; isCollapsed: boolean }) {
  return (
    <div className="space-y-3">
      {!isCollapsed && <p className="px-4">おすすめチャンネル</p>}
      <div className="space-y-4 px-2">
        {channels.channels.map((ch, index) => (
          <Ch isCollapsed={isCollapsed} key={index} ch={ch} />
        ))}
      </div>
    </div>
  );
}

function Ch({ ch, isCollapsed }: { ch: ListChannel; isCollapsed: boolean }) {
  if (isCollapsed) {
    return (
      <Link className="block" href={`/${ch.handle}`}>
        {ch.now_stream ? (
          <div className="border-red-500 border-2 rounded-full p-[1px] aspect-square object-cover h-9 w-9 mx-auto delay-0 transition-none animate-none">
            <img
              alt={ch.name}
              src={ch.icon_url}
              className="rounded-full aspect-square object-cover transition-none"
            />
          </div>
        ) : (
          <img
            alt={ch.name}
            src={ch.icon_url}
            className="rounded-full aspect-square object-cover h-9 w-9 mx-auto transition-none"
          />
        )}
      </Link>
    );
  }

  return (
    <Link href={`/${ch.handle}`} className="w-[100%]">
      <div className="w-[100%] hover:bg-slate-100 transition-all duration-300 p-[5] px-1 py-2 flex items-center rounded">
        {ch.now_stream ? (
          <div className="border-red-500 border-2 rounded-full p-[1px] mr-3 shrink-0 animate-none delay-0 transition-none">
            <img
              alt={ch.name}
              src={ch.icon_url}
              className="rounded-full h-8 w-8 aspect-square object-cover transition-none"
            />
          </div>
        ) : (
          <img
            alt={ch.name}
            src={ch.icon_url}
            className="rounded-full h-8 w-8 aspect-square object-cover mr-3 shrink-0 transition-none"
          />
        )}
        <div>
          <p className="font-semibold line-clamp-1">{ch.name}</p>
          <span className="text-gray-500 text-sm">{ch.game}</span>
        </div>
      </div>
    </Link>
  );
}

export default Ch;
