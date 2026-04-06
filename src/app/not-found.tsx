import Link from "next/link";
import Image from "next/image";
import { Clapperboard, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border bg-background">
        <div className="mx-auto flex h-16 items-center justify-between px-4">
          <Link className="flex items-center" href="/">
            <Image
              src="/tokuly.png"
              width={50}
              height={50}
              className="mr-3 rounded-md"
              alt="Tokuly Logo"
            />
            <p className="font-bold">Tokuly Live</p>
          </Link>
          <Link
            href="https://tokuly.com/studio"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-foreground underline-offset-4 hover:underline"
          >
            配信を開始
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center p-4 sm:p-6">
        <Card className={cn("w-full max-w-lg border-none shadow-none")}>
          <CardHeader className="space-y-4 pb-2 text-center">
            <h1 className="text-balance text-xl font-semibold leading-none tracking-tight sm:text-2xl">
              ページが見つかりません
            </h1>
            <CardDescription className="text-pretty text-base">
              お探しの配信・動画は削除されたか、URL
              が間違っている可能性があります。トップに戻って新しいコンテンツをお楽しみください。
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-center sm:pt-4">
            <Button className="w-full gap-2 sm:w-auto" asChild>
              <Link href="/">
                <Home className="h-4 w-4 shrink-0" aria-hidden />
                トップへ戻る
              </Link>
            </Button>
            <Button variant="outline" className="w-full gap-2 sm:w-auto" asChild>
              <Link href="https://tokuly.com/studio" target="_blank" rel="noopener noreferrer">
                <Clapperboard className="h-4 w-4 shrink-0" aria-hidden />
                配信を始める
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}
