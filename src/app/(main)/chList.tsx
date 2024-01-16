import Link from "next/link";

interface ChProps {
  icon_url: string;
  name: string;
  handle: string;
  game: string;
}

function Ch({ ch }: { ch: ChProps }) {
  return (
    <Link href={`/${ch.handle}`} className="flex items-start">
      <img
        alt={ch.name}
        src={ch.icon_url}
        className="rounded-full mr-3 h-12 w-12"
        alt="User"
      />
      <div>
        <p className="font-semibold line-clamp-1">{ch.name}</p>
        <span className="text-gray-500">{ch.game}</span>
      </div>
    </Link>
  );
}

export default Ch;
