import { NextResponse } from "next/server";

const latestReleaseApi =
  "https://api.github.com/repos/tokuzou0829/tokuly-studio-desktop/releases/latest";
const releasesPage = "https://github.com/tokuzou0829/tokuly-studio-desktop/releases/latest";

type ReleaseAsset = {
  name: string;
  browser_download_url: string;
};

type LatestRelease = {
  assets?: ReleaseAsset[];
};

export async function GET(_request: Request, context: { params: { platform: string } }) {
  const extension = context.params.platform === "mac"
    ? ".dmg"
    : context.params.platform === "windows"
      ? ".exe"
      : null;

  if (!extension) {
    return NextResponse.json({ error: "Unsupported platform" }, { status: 404 });
  }

  try {
    const response = await fetch(latestReleaseApi, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return NextResponse.redirect(releasesPage);
    }

    const release = (await response.json()) as LatestRelease;
    const asset = release.assets?.find(({ name }) => name.toLowerCase().endsWith(extension));

    return NextResponse.redirect(asset?.browser_download_url ?? releasesPage);
  } catch {
    return NextResponse.redirect(releasesPage);
  }
}
