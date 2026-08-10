import Live from "./Live";
import { getLive } from "@/requests/live";
import { buildContentMetadata } from "@/lib/content-metadata";

export const revalidate = 0;

export async function generateMetadata({ params }: { params: { id: string } }) {
  const live = await getLive({ id: params.id });
  return buildContentMetadata(live, "live");
}
export default async function LivePage({ params }: { params: { id: string } }) {
  await getLive({ id: params.id });

  return <Live id={params.id} />;
}
