import { auth } from "@/auth";
import { getOwnedChannels } from "@/requests/owned-channels";
import { getWatchHistory } from "@/requests/playback";
import WatchHistoryManager from "./watch-history-manager";
import WatchHistoryChannelPrompt from "./watch-history-channel-prompt";

export const metadata = { title: "視聴履歴" };
export const dynamic = "force-dynamic";

export default async function WatchHistoryPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const session = await auth();
  const identity = session?.activePostingIdentity;
  const token = session?.user?.access_token;
  if (!token) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-2xl font-bold">視聴履歴</h1>
        <p className="mt-6 rounded-xl bg-slate-100 p-8 text-center text-muted-foreground">
          チャンネルにログインすると視聴履歴を保存できます。
        </p>
      </main>
    );
  }
  if (identity?.type !== "channel") {
    const channels = await getOwnedChannels(token);
    return (
      <main className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-2xl font-bold">視聴履歴</h1>
        <WatchHistoryChannelPrompt channels={channels} />
      </main>
    );
  }
  const page = Math.max(1, Number(searchParams.page) || 1);
  const result = await getWatchHistory(identity.channelId, token, { page, per_page: 20 });
  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <WatchHistoryManager
        result={result}
        channelId={identity.channelId}
        token={token}
        title={`${identity.name} の視聴履歴`}
      />
    </main>
  );
}
