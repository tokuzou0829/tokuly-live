import Image from "next/image";
import Link from "next/link";
import AccountDropdownMenu from "@/app/(main)/menu";

export default function Header() {
  return (
    <header className="bg-white top-0 z-50 sticky border-b border-gtay-200">
      <div className="h-16 mx-auto px-4 flex itmes-center justify-between">
        <Link className="flex items-center" href="/">
          <Image
            src="/tokuly.png"
            width={50}
            height={50}
            className="rounded-md mr-3"
            alt="Tokuly Logo"
          />
          <p className="font-bold">Tokuly Live</p>
        </Link>
        <div className="flex gap-x-5 items-center">
          <Link href="/studio" className="text-sm">
            配信を開始
          </Link>
          <div style={{ marginRight: "10px", marginLeft: "auto" }}>
            <AccountDropdownMenu />
          </div>
        </div>
      </div>
    </header>
  );
}
