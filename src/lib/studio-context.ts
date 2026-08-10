import { auth } from "@/auth";
import { getStudioChannels } from "@/requests/studio";
import type { StudioChannel } from "@/types/studio";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const STUDIO_CHANNEL_COOKIE = "tokuly_studio_channel_id";

export type StudioContext = {
  token: string;
  channels: StudioChannel[];
  channel: StudioChannel | null;
};

export async function getStudioContext(): Promise<StudioContext> {
  const session = await auth();
  const token = session?.user?.access_token;
  if (!token) redirect("/api/auth/signin?callbackUrl=/studio");

  const channels = await getStudioChannels(token);
  const stored = Number(cookies().get(STUDIO_CHANNEL_COOKIE)?.value);
  const channel = channels.find((item) => item.id === stored) ?? channels[0] ?? null;
  return { token, channels, channel };
}

export async function requireStudioContext(): Promise<StudioContext & { channel: StudioChannel }> {
  const context = await getStudioContext();
  if (!context.channel) redirect("/studio");
  return { ...context, channel: context.channel };
}
