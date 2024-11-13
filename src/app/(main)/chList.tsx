import Link from "next/link";
import type { Channels, ListChannel } from "@/types/channel";

export function ChList({
  channels,
  isCollapsed,
}: {
  channels: Channels;
  isCollapsed: boolean;
}) {
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
        <img
          alt={ch.name}
          src={ch.icon_url}
          className="rounded-full aspect-square object-cover h-9 w-9 mx-auto"
        />
      </Link>
    );
  }

  return (
    <Link href={`/${ch.handle}`} className="w-[100%]">
      <div className="w-[100%] hover:bg-slate-100 transition-all duration-300 p-[5] px-1 py-2 flex items-center rounded">
        <img
          alt={ch.name}
          src={ch.icon_url}
          className="rounded-full mr-3 h-9 w-9 aspect-square object-cover"
        />
        <div>
          <p className="font-semibold line-clamp-1">{ch.name}</p>
          <span className="text-gray-500 text-sm">{ch.game}</span>
        </div>
      </div>
    </Link>
  );
}

export default Ch;
