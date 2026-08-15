import { describe, expect, it } from "vitest";
import {
  studioPublishingSettingLabels,
  studioPublishingSettings,
} from "./studio-publishing-settings";

describe("studio publishing settings", () => {
  it("provides the editor labels for every publishing setting", () => {
    expect(studioPublishingSettingLabels).toEqual({
      public: "公開",
      hidden_from_feed: "フィードに表示しない",
      link: "リンク限定",
      friend: "フレンド/リンク限定(フレンドのフィードにのみ表示)",
    });
    expect(studioPublishingSettings).toHaveLength(4);
  });
});
