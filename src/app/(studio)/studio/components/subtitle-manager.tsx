"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addStudioSubtitle, deleteStudioSubtitle, updateStudioSubtitle } from "@/requests/studio";
import type { StudioSubtitlesResponse } from "@/types/studio";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const languageOptions = [
  { code: "ja", label: "日本語" },
  { code: "en", label: "英語" },
  { code: "en-US", label: "英語（アメリカ）" },
  { code: "en-GB", label: "英語（イギリス）" },
  { code: "zh-CN", label: "中国語（簡体字）" },
  { code: "zh-TW", label: "中国語（繁体字）" },
  { code: "ko", label: "韓国語" },
  { code: "es", label: "スペイン語" },
  { code: "fr", label: "フランス語" },
  { code: "de", label: "ドイツ語" },
  { code: "pt-BR", label: "ポルトガル語（ブラジル）" },
  { code: "id", label: "インドネシア語" },
  { code: "th", label: "タイ語" },
  { code: "vi", label: "ベトナム語" },
  { code: "ru", label: "ロシア語" },
  { code: "ar", label: "アラビア語" },
  { code: "hi", label: "ヒンディー語" },
];

export default function SubtitleManager({
  streamId,
  token,
  initial,
}: {
  streamId: number;
  token: string;
  initial: StudioSubtitlesResponse;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [languageCode, setLanguageCode] = useState("");
  const [languagePreset, setLanguagePreset] = useState("");
  const [label, setLabel] = useState("");

  const resetAddForm = () => {
    setLanguageCode("");
    setLanguagePreset("");
    setLabel("");
    setError("");
  };

  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      await addStudioSubtitle(streamId, data, token);
      setAddOpen(false);
      resetAddForm();
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "字幕を追加できませんでした。");
    } finally {
      setBusy(false);
    }
  }

  async function edit(id: number, form: HTMLFormElement) {
    setBusy(true);
    setError("");
    const data = new FormData(form);
    try {
      await updateStudioSubtitle(
        streamId,
        id,
        {
          language_code: String(data.get("language_code")),
          label: String(data.get("label")),
        },
        token
      );
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "更新できませんでした。");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    if (!confirm("字幕を削除しますか？")) return;
    setBusy(true);
    setError("");
    try {
      await deleteStudioSubtitle(streamId, id, token);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "削除できませんでした。");
    } finally {
      setBusy(false);
    }
  }

  const selectLanguage = (code: string) => {
    setLanguagePreset(code);
    if (!code) return;
    const language = languageOptions.find((option) => option.code === code);
    if (!language) return;
    setLanguageCode(language.code);
    setLabel(language.label);
  };

  const inputLanguageCode = (code: string) => {
    setLanguageCode(code);
    const language = languageOptions.find(
      (option) => option.code.toLowerCase() === code.trim().toLowerCase()
    );
    setLanguagePreset(language?.code ?? "");
    if (language) setLabel(language.label);
  };

  return (
    <section className="studio-card min-w-0 max-w-full overflow-hidden p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-bold">字幕</h2>
        {initial.can_upload && (
          <Button
            type="button"
            size="sm"
            onClick={() => {
              resetAddForm();
              setAddOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            字幕を追加
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {initial.data.map((subtitle) => (
          <form
            key={subtitle.id}
            onSubmit={(event) => {
              event.preventDefault();
              void edit(subtitle.id, event.currentTarget);
            }}
            className="grid gap-2 rounded-lg bg-[var(--studio-subtle)] p-3 sm:grid-cols-[120px_minmax(0,1fr)_auto_auto]"
          >
            <Input
              aria-label="言語コード"
              name="language_code"
              defaultValue={subtitle.language_code}
              required
              maxLength={35}
            />
            <Input
              aria-label="表示名"
              name="label"
              defaultValue={subtitle.label}
              required
              maxLength={100}
            />
            <Button disabled={busy} variant="outline" size="sm">
              保存
            </Button>
            <Button
              type="button"
              disabled={busy}
              variant="ghost"
              size="icon"
              aria-label={`${subtitle.label}を削除`}
              onClick={() => void remove(subtitle.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </form>
        ))}
      </div>

      {!initial.can_upload && (
        <p className="mt-4 text-sm text-[var(--studio-muted)]">
          字幕は処理完了済みの動画または終了済みアーカイブに追加できます。
        </p>
      )}
      {error && !addOpen && (
        <p role="alert" className="mt-3 text-sm font-semibold">
          {error}
        </p>
      )}

      <Dialog
        open={addOpen}
        onOpenChange={(open) => {
          if (busy) return;
          setAddOpen(open);
          if (!open) resetAddForm();
        }}
      >
        <DialogContent className="studio-theme w-[calc(100%-2rem)] max-w-lg bg-[var(--studio-surface)] text-[var(--studio-fg)]">
          <form onSubmit={upload}>
            <DialogHeader>
              <DialogTitle>字幕を追加</DialogTitle>
              <DialogDescription>
                VTTまたはSRT形式の字幕ファイルと言語情報を設定します。
              </DialogDescription>
            </DialogHeader>

            <div className="mt-5 space-y-4">
              <div>
                <Label htmlFor="subtitle-language">言語コード</Label>
                <div className="mt-2 grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_220px]">
                  <Input
                    id="subtitle-language"
                    name="language_code"
                    value={languageCode}
                    onChange={(event) => inputLanguageCode(event.target.value)}
                    placeholder="ja / en-US"
                    required
                    maxLength={35}
                    className="min-w-0"
                  />
                  <select
                    id="subtitle-language-preset"
                    aria-label="言語の候補から選択"
                    value={languagePreset}
                    onChange={(event) => selectLanguage(event.target.value)}
                    className="h-10 min-w-0 w-full rounded-md border border-[var(--studio-border)] bg-[var(--studio-surface)] px-3 text-sm text-[var(--studio-fg)]"
                  >
                    <option value="">候補から選択</option>
                    {languageOptions.map((language) => (
                      <option key={language.code} value={language.code}>
                        {language.code} — {language.label}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="mt-1.5 text-xs text-[var(--studio-muted)]">
                  BCP 47形式で直接入力することもできます。
                </p>
              </div>

              <div>
                <Label htmlFor="subtitle-label">表示名</Label>
                <Input
                  id="subtitle-label"
                  name="label"
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  placeholder="日本語"
                  required
                  maxLength={100}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="subtitle-file">字幕ファイル</Label>
                <Input
                  id="subtitle-file"
                  name="subtitle"
                  type="file"
                  accept=".vtt,.srt"
                  required
                  className="mt-2 h-auto w-full min-w-0 max-w-full py-2"
                />
              </div>

              {error && (
                <p role="alert" className="rounded-lg border border-current p-3 text-sm">
                  {error}
                </p>
              )}
            </div>

            <DialogFooter className="mt-6 gap-2 sm:gap-0">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={busy}>
                  キャンセル
                </Button>
              </DialogClose>
              <Button disabled={busy}>
                {busy ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                字幕を追加
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
