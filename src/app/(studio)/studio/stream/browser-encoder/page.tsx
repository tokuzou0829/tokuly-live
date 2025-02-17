"use server";
import { auth, signIn } from "@/auth";
import WebEncoder from "./webEncoder";
import { notFound } from "next/navigation";
import { getLive } from "@/requests/live";
export default async function EncoderLayout({ searchParams }: { searchParams: { stream_name: string } }) {
    const session = await auth();
    const ch_pass_req = await fetch('https://api.tokuly.com/v1/live/channel/main', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session?.user?.access_token}`,
          },
        });
    const ch_pass = await ch_pass_req.json();
    if(ch_pass.result != 'ok'){
        notFound();
    }
    const stream = await getLive({ id: searchParams.stream_name });

    return (
      <>
        <WebEncoder ch_pass={ch_pass.channel_password} streamTitle={stream.title} session={session} id={stream.id} />
      </>
    );
  }
  