import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { GiftHistory } from "./gift-history";

export const revalidate = 0;

export const metadata = {
  title: "ギフト履歴",
  description: "送信したライブギフトの履歴と返却状況を確認できます。",
};

export default async function GiftsPage() {
  const session = await auth();
  const token = session?.user?.access_token;
  if (!session?.user || !token) {
    redirect("/api/auth/signin?callbackUrl=%2Fgifts");
  }

  return <GiftHistory token={token} />;
}
