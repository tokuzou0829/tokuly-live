"use server";

import { auth } from "@/auth";
import { STUDIO_CHANNEL_COOKIE } from "@/lib/studio-context";
import { getStudioChannels } from "@/requests/studio";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function selectStudioChannel(formData: FormData) {
  const id = Number(formData.get("channel_id"));
  const selected = await activateStudioChannel(id);
  if (!selected) return;
  redirect("/studio");
}

export async function activateStudioChannel(id: number): Promise<boolean> {
  const session = await auth();
  const token = session?.user?.access_token;
  if (!token) redirect("/api/auth/signin?callbackUrl=/studio");
  const channels = await getStudioChannels(token);
  if (!channels.some((channel) => channel.id === id)) return false;
  cookies().set(STUDIO_CHANNEL_COOKIE, String(id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/studio",
    maxAge: 60 * 60 * 24 * 365,
  });
  return true;
}
