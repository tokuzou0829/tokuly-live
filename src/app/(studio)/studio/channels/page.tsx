import { auth } from "@/auth";
import { requireStudioContext } from "@/lib/studio-context";
import StudioChannelsView from "../components/studio-channels-view";

export const metadata = { title: "チャンネル一覧" };

export default async function StudioChannelsPage() {
  const [{ token, channels, channel }, session] = await Promise.all([
    requireStudioContext(),
    auth(),
  ]);
  return (
    <StudioChannelsView
      token={token}
      channels={channels}
      channel={channel}
      defaultIconUrl={session?.user?.image ?? null}
    />
  );
}
