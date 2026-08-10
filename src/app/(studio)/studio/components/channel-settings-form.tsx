"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { StudioApiError, updateStudioChannel } from "@/requests/studio";
import type { StudioChannel } from "@/types/studio";
import { Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ChannelSettingsForm({
  channel,
  token,
}: {
  channel: StudioChannel;
  token: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [fields, setFields] = useState<Record<string, string[]>>({});
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    setMessage("");
    setFields({});
    const source = new FormData(event.currentTarget);
    const icon = source.get("icon");
    const banner = source.get("banner");
    try {
      await updateStudioChannel(
        channel.id,
        {
          name: String(source.get("name") ?? ""),
          handle: String(source.get("handle") ?? ""),
          self_intro: String(source.get("self_intro") ?? "") || null,
          gifts_enabled: source.get("gifts_enabled") === "on",
        },
        token
      );
      if ((icon instanceof File && icon.size) || (banner instanceof File && banner.size)) {
        const images = new FormData();
        if (icon instanceof File && icon.size) images.set("icon", icon);
        if (banner instanceof File && banner.size) images.set("banner", banner);
        await updateStudioChannel(channel.id, images, token);
      }
      setMessage("チャンネル設定を保存しました。");
      router.refresh();
    } catch (caught) {
      if (caught instanceof StudioApiError) setFields(caught.fields);
      setError(caught instanceof Error ? caught.message : "保存できませんでした。");
    } finally {
      setSaving(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-5">
      <section className="studio-card overflow-hidden">
        <div className="relative aspect-[4/1] min-h-36 bg-[var(--studio-subtle)]">
          {channel.banner_url && (
            <img src={channel.banner_url} alt="" className="h-full w-full object-cover" />
          )}
          <div className="absolute -bottom-12 left-6 h-24 w-24 overflow-hidden rounded-full border-4 border-[var(--studio-surface)] bg-[var(--studio-subtle)]">
            {channel.icon_url && (
              <img src={channel.icon_url} alt="" className="h-full w-full object-cover" />
            )}
          </div>
        </div>
        <div className="grid gap-4 px-6 pb-6 pt-16 sm:grid-cols-2">
          <div>
            <Label htmlFor="icon">アイコン</Label>
            <Input
              id="icon"
              name="icon"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="mt-2 h-auto py-2"
            />
          </div>
          <div>
            <Label htmlFor="banner">バナー</Label>
            <Input
              id="banner"
              name="banner"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="mt-2 h-auto py-2"
            />
          </div>
        </div>
      </section>
      <section className="studio-card space-y-5 p-6">
        <h2 className="font-bold">基本情報</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="name">チャンネル名</Label>
            <Input
              id="name"
              name="name"
              defaultValue={channel.name}
              required
              maxLength={32}
              className="mt-2"
            />
            {fields.name?.map((value) => (
              <p key={value} className="mt-1 text-xs font-semibold">
                {value}
              </p>
            ))}
          </div>
          <div>
            <Label htmlFor="handle">ハンドル</Label>
            <div className="relative mt-2">
              <span className="absolute left-3 top-2.5 text-sm text-[var(--studio-muted)]">@</span>
              <Input
                id="handle"
                name="handle"
                defaultValue={channel.handle}
                required
                maxLength={32}
                pattern="[a-z0-9-]+"
                className="pl-7"
              />
            </div>
            {fields.handle?.map((value) => (
              <p key={value} className="mt-1 text-xs font-semibold">
                {value}
              </p>
            ))}
          </div>
        </div>
        <div>
          <Label htmlFor="self_intro">チャンネル紹介</Label>
          <Textarea
            id="self_intro"
            name="self_intro"
            defaultValue={channel.self_introduction ?? ""}
            maxLength={600}
            className="mt-2 min-h-36"
          />
        </div>
        <label className="flex items-center justify-between rounded-lg bg-[var(--studio-subtle)] p-4">
          <div>
            <p className="font-semibold">ギフトを受け取る</p>
            <p className="text-xs text-[var(--studio-muted)]">
              チャンネルと新しい配信でギフトを有効にします
            </p>
          </div>
          <Switch name="gifts_enabled" defaultChecked={channel.gifts_enabled} />
        </label>
        {error && (
          <p role="alert" className="rounded-lg border border-[var(--studio-fg)] p-3 text-sm">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="flex items-center gap-2 text-sm font-semibold">
            <Check className="h-4 w-4" />
            {message}
          </p>
        )}
        <div className="flex justify-end">
          <Button disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}変更を保存
          </Button>
        </div>
      </section>
    </form>
  );
}
