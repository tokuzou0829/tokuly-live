import Player from "@/app/(main)/live/[id]/player";
export default async function LivePage({ params }: { params: { id: string } }) {
return <Player id={params.id} className="h-[100%]" />
}