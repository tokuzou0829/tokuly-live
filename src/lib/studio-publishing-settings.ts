import type { StudioPublishingSetting } from "@/types/studio";

export const studioPublishingSettings: ReadonlyArray<{
  value: StudioPublishingSetting;
  label: string;
}> = [
  { value: "public", label: "公開" },
  { value: "hidden_from_feed", label: "フィードに表示しない" },
  { value: "link", label: "リンク限定" },
  { value: "friend", label: "フレンド限定" },
];

export const studioPublishingSettingLabels = Object.fromEntries(
  studioPublishingSettings.map(({ value, label }) => [value, label])
) as Record<StudioPublishingSetting, string>;
