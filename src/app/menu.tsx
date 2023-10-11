"use client";
import { signIn, signOut } from "next-auth/react";
import { usePathname } from 'next/navigation'
import { Button } from "@/components/ui/button";
import NextAuth, { type DefaultSession } from "next-auth";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
interface Session {
  user: {
    id: string;
    createdAt: string;
    kids: boolean;
    prefectureId: null | number;
    updatedAt: string;
    image:string;
  } & DefaultSession["user"];
}
type Props = {
  session:Session | null
}
export default function AccountDropdownMenu(props:Props) {
    const {session} = props;
    const pathname = usePathname();
    return (
        <>
              {session?.user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="relative h-8 w-8 rounded-full mr-[10px]"
                      style={{marginLeft: '10px',marginTop: '10px'}}
                    >
                      <div>
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={session.user.image} />
                        <AvatarFallback>{session.user.name}</AvatarFallback>
                      </Avatar>
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {session.user.name}
                        </p>
                        <p className="text-muted-foreground text-xs leading-none">
                          {session.user.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuItem><a href="https://tokuly.com/studio">配信する</a></DropdownMenuItem>
                      <DropdownMenuItem>チャンネルに移動</DropdownMenuItem>
                      <DropdownMenuItem><a href="https://tokuly.com/">tokulyに移動</a></DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => signOut({ callbackUrl: "/" })}
                      className="cursor-pointer	"
                    >
                    サインアウト
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <button
                  className="header-signup mr-[10px]"
                  onClick={() => signIn("cognito", { callbackUrl: pathname })}
                >
                 <p style={{textAlign: 'center',width: '100%',}}>ログイン</p>
                </button>
              )}
            </>
        )
}