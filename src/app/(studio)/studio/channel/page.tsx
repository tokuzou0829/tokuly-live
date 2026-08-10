import { requireStudioContext } from "@/lib/studio-context";
import { getStudioChannel } from "@/requests/studio";
import ChannelSettingsForm from "../components/channel-settings-form";
export const metadata = { title: "チャンネル設定" };
export default async function ChannelPage() {
  const { token, channel: selected } = await requireStudioContext();
  const channel = await getStudioChannel(selected.id, token);
  return (
    <div className="space-y-6">
      <h1 className="studio-title">チャンネル設定</h1>
      <ChannelSettingsForm channel={channel} token={token} />
    </div>
  );
}
