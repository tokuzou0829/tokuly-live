import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  Apple,
  ArrowRight,
  Check,
  ChevronRight,
  Download,
  ExternalLink,
  Layers3,
  LockKeyhole,
  MonitorPlay,
  Radio,
  ShieldCheck,
  Sparkles,
  Waves,
} from "lucide-react";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Tokuly Studio — Tokuly Liveのための配信アプリ",
  description:
    "シーンづくりから配信開始まで、ひとつの場所で。macOS・Windows向けTokuly Live専用配信アプリ。",
  openGraph: {
    title: "Tokuly Studio — 配信したい、その瞬間を逃さない。",
    description: "Tokuly Liveへの配信を、ひとつの場所から。macOS・Windows向け。",
    type: "website",
  },
};

const macDownloadUrl = "/api/studio/desktop/download/mac";
const windowsDownloadUrl = "/api/studio/desktop/download/windows";
const repositoryUrl = "https://github.com/tokuzou0829/tokuly-studio-desktop";
const latestReleaseApi =
  "https://api.github.com/repos/tokuzou0829/tokuly-studio-desktop/releases/latest";

async function getLatestVersion() {
  try {
    const response = await fetch(latestReleaseApi, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      next: { revalidate: 300 },
    });

    if (!response.ok) return null;

    const release = (await response.json()) as { tag_name?: string };
    return release.tag_name ?? null;
  } catch {
    return null;
  }
}

const features = [
  {
    icon: Layers3,
    number: "01",
    title: "シーンを、自由に組み立てる",
    body: "画面、ウィンドウ、カメラ、画像、テキスト。必要な素材を重ねて、自分だけの配信画面をつくれます。",
    tone: "violet",
  },
  {
    icon: Waves,
    number: "02",
    title: "声もゲーム音も、ひと目で調整",
    body: "マイクとデスクトップ音声をリアルタイムで確認。配信中でも迷わず、ちょうどいい音へ。",
    tone: "cyan",
  },
  {
    icon: MonitorPlay,
    number: "03",
    title: "配信枠まで、アプリ内で完結",
    body: "タイトル、公開範囲、概要、ジャンル、サムネイルを設定。そのままTokuly Liveへ配信できます。",
    tone: "pink",
  },
];

export default async function TokulyStudioDesktopPage() {
  const latestVersion = await getLatestVersion();

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/studio/desktop" className={styles.brand} aria-label="Tokuly Studio トップ">
          <Image src="/studio-desktop/icon.png" width={36} height={36} alt="" />
          <span>Tokuly Studio</span>
        </Link>
        <nav className={styles.nav} aria-label="ページ内ナビゲーション">
          <a href="#features">できること</a>
          <a href="#how-to">はじめかた</a>
          <a href="#faq">よくある質問</a>
        </nav>
        <a className={styles.headerCta} href="#download">
          ダウンロード
          <ArrowRight size={14} aria-hidden="true" />
        </a>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>
            <span /> TOKULY LIVE DESKTOP APP
          </p>
          <h1>
            配信したい、その瞬間を
            <br />
            <span>逃さない。</span>
          </h1>
          <p className={styles.lead}>
            シーンづくりも、音声調整も、配信枠の設定も。
            <br className={styles.desktopBreak} />
            Tokuly Liveへの配信を、ひとつの場所から。
          </p>
          <div className={styles.heroActions}>
            <a className={styles.primaryCta} href={macDownloadUrl}>
              <Apple size={19} aria-hidden="true" />
              Mac版（DMG）
            </a>
            <a className={styles.secondaryCta} href={windowsDownloadUrl}>
              <Download size={18} aria-hidden="true" />
              Windows版（EXE）
            </a>
          </div>
          <span className={styles.downloadNote}>
            {latestVersion ? `Version ${latestVersion}` : "最新バージョン"} · クリックすると直接ダウンロードします
          </span>
        </div>

        <div className={styles.heroVisual}>
          <div className={styles.visualGlow} />
          <Image
            src="/studio-desktop/onboarding-studio.png"
            width={1536}
            height={1024}
            priority
            alt="Tokuly Studioを使った配信環境のイメージ"
          />
          <div className={styles.livePill}>
            <i /> LIVE READY
          </div>
        </div>
      </section>

      <section className={styles.trustBar} aria-label="Tokuly Studioの特徴">
        <div><strong>OBS</strong><span>配信エンジン</span></div>
        <div><strong>Mac + Windows</strong><span>主要なOSに対応</span></div>
        <div><strong>Open Source</strong><span>GPL-3.0</span></div>
        <div><strong>¥0</strong><span>無料でスタート</span></div>
      </section>

      <section className={styles.intro} id="features">
        <div className={styles.sectionHeading}>
          <p>配信に必要なものを全てまとめました。</p>
          <h2>配信に必要なものを、<br />ひとつに。</h2>
        </div>
        <p className={styles.sectionLead}>
          複数の画面や設定を行き来する必要はありません。
          Tokuly Studioなら、準備から本番までひとつの流れで進められます。
        </p>
      </section>

      <section className={styles.featureGrid}>
        {features.map(({ icon: Icon, number, title, body, tone }) => (
          <article className={`${styles.featureCard} ${styles[tone]}`} key={title}>
            <div className={styles.cardTop}>
              <span className={styles.featureIcon}><Icon size={22} strokeWidth={1.7} aria-hidden="true" /></span>
              <span>{number}</span>
            </div>
            <div className={styles.cardGraphic} aria-hidden="true">
              {number === "01" && <div className={styles.layersGraphic}><i /><i /><i /></div>}
              {number === "02" && (
                <div className={styles.audioGraphic}>
                  {[28, 58, 38, 82, 52, 72, 32, 62, 42, 74, 48, 26].map((height, index) => (
                    <i key={index} style={{ height: `${height}%` }} />
                  ))}
                </div>
              )}
              {number === "03" && (
                <div className={styles.streamGraphic}>
                  <span>配信タイトル</span>
                  <b><Radio size={15} aria-hidden="true" /> 配信を開始</b>
                </div>
              )}
            </div>
            <h3>{title}</h3>
            <p>{body}</p>
          </article>
        ))}
      </section>

      <section className={styles.productStage}>
        <div className={styles.stageCopy}>
          <p className={styles.kicker}>Tokuly Liveのために設計</p>
          <h2>ログインしたら、<br />もう配信はすぐそこ。</h2>
          <p>
            管理チャンネルと配信枠を選ぶだけで、自動で配信を設定。
            面倒なキーのコピー＆ペーストから解放されます。
          </p>
          <ul>
            <li><Check size={16} aria-hidden="true" /> Tokulyアカウントでログイン</li>
            <li><Check size={16} aria-hidden="true" /> 既存・新規の配信枠を選択</li>
            <li><Check size={16} aria-hidden="true" /> 配信のチャットに直接アクセス</li>
          </ul>
        </div>

        <div className={styles.appWindow} aria-label="Tokuly Studioの操作画面イメージ">
          <div className={styles.windowBar}>
            <span><i /><i /><i /></span><b>Tokuly Studio</b><em>● LIVE</em>
          </div>
          <div className={styles.windowBody}>
            <aside>
              <Image src="/studio-desktop/icon.png" width={34} height={34} alt="" />
              <i className={styles.activeTool} /><i /><i />
            </aside>
            <div className={styles.previewPane}>
              <div className={styles.previewScreen}>
                <div className={styles.previewTitle}>TOKULY NIGHT</div>
                <div className={styles.previewOrb} />
                <span>STREAM STARTING SOON</span>
              </div>
              <div className={styles.sceneTabs}><i /><i /><i /><button aria-label="シーンを追加">＋</button></div>
            </div>
            <div className={styles.controlPane}>
              <span>オーディオミキサー</span>
              <div className={styles.meter}><i /></div><div className={styles.meter}><i /></div>
              <span>ソース</span><p>画面キャプチャ</p><p>マイク</p>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.steps} id="how-to">
        <div className={styles.sectionHeading}>
          <p>START IN THREE STEPS</p><h2>3ステップで、配信へ。</h2>
        </div>
        <div className={styles.stepGrid}>
          <article>
            <span><Download size={20} aria-hidden="true" /></span><small>STEP 01</small>
            <h3>ダウンロード</h3><p>MacはDMG、WindowsはEXEを直接ダウンロードしてインストールします。</p>
          </article>
          <ChevronRight className={styles.stepArrow} aria-hidden="true" />
          <article>
            <span><LockKeyhole size={20} aria-hidden="true" /></span><small>STEP 02</small>
            <h3>Tokulyにログイン</h3><p>ブラウザで認証。パスワードをアプリに入力する必要はありません。</p>
          </article>
          <ChevronRight className={styles.stepArrow} aria-hidden="true" />
          <article>
            <span><Sparkles size={20} aria-hidden="true" /></span><small>STEP 03</small>
            <h3>配信をはじめる</h3><p>チャンネルと配信枠を選び、準備ができたら配信開始。</p>
          </article>
        </div>
      </section>

      <section className={styles.faq} id="faq">
        <div>
          <p className={styles.kicker}>FAQ</p><h2>よくある質問</h2>
          <p className={styles.faqIntro}>導入前に気になることをまとめました。</p>
        </div>
        <div className={styles.faqList}>
          <details open>
            <summary>対応しているOSは？</summary>
            <p>Apple Silicon搭載Mac向けDMGと、Windows向けEXEを配布しています。</p>
          </details>
          <details>
            <summary>利用料金はかかりますか？</summary>
            <p>Tokuly Studioは無料でダウンロードできます。GPL-3.0ライセンスのオープンソースソフトウェアです。</p>
          </details>
          <details>
            <summary>OBSの設定は使えますか？</summary>
            <p>既存のOBSプロファイルとシーンをTokuly Studio用にコピーして読み込めます。元のOBS設定は変更しません。</p>
          </details>
          <details>
            <summary>インストール時に警告が表示されます</summary>
            <p>現在のmacOS版は未署名・未公証です。警告が出た場合、設定のプライバシーとセキュリティーからアプリを許可してください。</p>
          </details>
        </div>
      </section>

      <section className={styles.finalCta} id="download">
        <div className={styles.ctaGlow} />
        <Image src="/studio-desktop/icon.png" width={88} height={88} alt="Tokuly Studio" />
        <p>さぁ、今すぐ配信を始めよう</p>
        <h2>次の配信を、<br />Tokuly Studioから。</h2>
        <div className={styles.finalDownloadActions}>
          <a className={styles.primaryCta} href={macDownloadUrl}>
            <Apple size={19} aria-hidden="true" />Mac版（DMG）<ArrowRight size={18} aria-hidden="true" />
          </a>
          <a className={styles.secondaryCta} href={windowsDownloadUrl}>
            <Download size={18} aria-hidden="true" />Windows版（EXE）<ArrowRight size={18} aria-hidden="true" />
          </a>
        </div>
        <span>{latestVersion ? `Version ${latestVersion}` : "最新バージョン"} · ファイルを直接ダウンロード</span>
      </section>

      <footer className={styles.footer}>
        <div className={styles.brand}>
          <Image src="/studio-desktop/icon.png" width={30} height={30} alt="" /><span>Tokuly Studio</span>
        </div>
        <p>Tokuly Live streaming software powered by OBS.</p>
        <div>
          <a href={repositoryUrl} target="_blank" rel="noreferrer">GitHub <ExternalLink size={12} aria-hidden="true" /></a>
          <a href="https://tokuly.com" target="_blank" rel="noreferrer">Tokuly Live <ExternalLink size={12} aria-hidden="true" /></a>
        </div>
      </footer>
    </main>
  );
}
