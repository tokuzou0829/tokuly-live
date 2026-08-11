import type { ClipResource } from "@/types/clip";
import { Scissors } from "lucide-react";
import ClipCard from "./clip-card";

export default function HomeRecommendedClips({ clips }: { clips: ClipResource[] }) {
  if (clips.length === 0) return null;

  return (
    <section
      className="w-full bg-slate-100 py-5 sm:py-6"
      aria-labelledby="recommended-clips-heading"
    >
      <div className="mb-6 flex items-center gap-2 px-5 sm:px-7 lg:px-9">
        <span className="flex items-center justify-center text-slate-700">
          <Scissors className="h-7 w-7" aria-hidden="true" />
        </span>
        <div>
          <h2 id="recommended-clips-heading" className="text-[20px] font-bold leading-tight">
            おすすめクリップ
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">配信者の最高のシーンをチェック</p>
        </div>
      </div>
      <div className="flex w-full gap-3 overflow-x-auto px-4 pb-2 sm:gap-4 sm:px-6 lg:px-8">
        {clips.map((clip) => (
          <div key={clip.clip_key} className="w-[270px] shrink-0 sm:w-[310px]">
            <ClipCard clip={clip} compact />
          </div>
        ))}
      </div>
    </section>
  );
}
