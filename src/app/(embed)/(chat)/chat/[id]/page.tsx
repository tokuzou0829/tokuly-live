import React from "react";
import Chat from "./chat";
import { auth } from "@/auth";
import { onlineCheck, getLive } from "@/requests/live";

export const revalidate = 0;

export default async function Page({ params }: { params: { id: string } }) {
  const [session, _, live] = await Promise.all([
    auth(),
    onlineCheck({ id: params.id }),
    getLive({ id: params.id }),
  ]);

  return (
    <div className="w-[100%] h-[100%]">
      <Chat id={live.id} session={session} />
    </div>
  );
}
