import { auth } from "@/auth";
import { getStudioChannels } from "@/requests/studio";
import type { StudioChannel } from "@/types/studio";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const STUDIO_CHANNEL_COOKIE = "tokuly_studio_channel_id";

export type StudioContext = {
  token: string;
  channels: StudioChannel[];
  channel: StudioChannel;
};

export async function requireStudioContext(): Promise<StudioContext> {
  const session = await auth();
  const token = session?.user?.access_token;
  if (!token) redirect("/api/auth/signin?callbackUrl=/studio");

  const channels = await getStudioChannels(token);
  if (channels.length === 0) redirect("https://tokuly.com/studio");

  const stored = Number(cookies().get(STUDIO_CHANNEL_COOKIE)?.value);
  const channel = channels.find((item) => item.id === stored) ?? channels[0];
  return { token, channels, channel };
}

