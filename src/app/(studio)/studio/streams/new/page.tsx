import { requireStudioContext } from "@/lib/studio-context";
import CreateContentForm from "../../components/create-content-form";
export const metadata = { title: "ライブ配信を作成" };
export default async function NewStreamPage() {
  const { token, channel } = await requireStudioContext();
  return <CreateContentForm type="live" channelId={channel.id} token={token} />;
}
