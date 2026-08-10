import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { CONTENT_OG_HEIGHT, CONTENT_OG_WIDTH, renderContentOgImage } from "./content-og-image";

describe("content OG image rendering", () => {
  it("creates a compact 1200x630 JPEG using a centered cover crop", async () => {
    const source = await sharp({
      create: {
        width: 1_200,
        height: 1_200,
        channels: 3,
        background: "#00ff00",
      },
    })
      .composite([
        {
          input: {
            create: { width: 1_200, height: 300, channels: 3, background: "#ff0000" },
          },
          top: 0,
          left: 0,
        },
        {
          input: {
            create: { width: 1_200, height: 300, channels: 3, background: "#0000ff" },
          },
          top: 900,
          left: 0,
        },
      ])
      .png()
      .toBuffer();

    const output = await renderContentOgImage(source);
    const metadata = await sharp(output).metadata();
    const { data, info } = await sharp(output)
      .extract({ left: 600, top: 315, width: 1, height: 1 })
      .raw()
      .toBuffer({ resolveWithObject: true });

    expect(metadata.format).toBe("jpeg");
    expect(metadata.width).toBe(CONTENT_OG_WIDTH);
    expect(metadata.height).toBe(CONTENT_OG_HEIGHT);
    expect(output.byteLength).toBeLessThan(500_000);
    expect(info.channels).toBe(3);
    expect([...data]).toEqual([0, 255, 1]);
  });
});
