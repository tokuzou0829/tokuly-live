import { requireStudioContext } from "@/lib/studio-context";
import { getStudioStreams } from "@/requests/studio";
import ChatEmbedBuilder from "../components/chat-embed-builder";
export const metadata = { title: "チャット埋め込み" };
export default async function ChatEmbedPage() {
  const { token, channel } = await requireStudioContext();
  const streams = await getStudioStreams(channel.id, token, { type: "live", per_page: 100 });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="studio-title">チャット埋め込み</h1>
        <p className="mt-2 text-sm text-[var(--studio-muted)]">
          OBS用のチャットURLとカスタムCSSを作成し、リアルタイムで表示を確認できます。
        </p>
      </div>
      <ChatEmbedBuilder streams={streams.data} />
    </div>
  );
}
