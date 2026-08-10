import { requireStudioContext } from "@/lib/studio-context";
import VideoUploadWizard from "../../components/video-upload-wizard";
export const metadata = { title: "動画をアップロード" };
export default async function NewVideoPage() {
  const { token, channel } = await requireStudioContext();
  return <VideoUploadWizard channelId={channel.id} token={token} />;
}
