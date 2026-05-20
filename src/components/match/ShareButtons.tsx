'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/lib/i18n';

interface KakaoShare {
  sendDefault: (opts: unknown) => void;
}
interface KakaoSDK {
  isInitialized: () => boolean;
  init: (key: string) => void;
  Share?: KakaoShare;
}
declare global {
  interface Window {
    Kakao?: KakaoSDK;
  }
}

interface Props {
  /** Short label shown above the buttons — e.g. "친구한테 보내기". */
  title?: string;
  /** Override the text used for share messages. Defaults to a sensible one. */
  shareText?: string;
  /** Layout density. Hero = compact, footer = spacious. */
  variant?: 'hero' | 'footer';
}

/**
 * A small share widget tailored for Korean users.
 *
 * Button order (KR-audience priority):
 *   1. 카카오톡       — Kakao JS SDK, loaded in root layout.
 *   2. 링크 복사      — works everywhere; the base primitive.
 *   3. 더보기 (native) — `navigator.share`, mobile only.
 *   4. 문자 (SMS)     — `sms:` URI; mobile only (desktop hides it).
 *   5. 인스타그램     — no official web share API, so clicking copies the
 *                       link + shows a toast telling the user to paste into
 *                       their story or DM. This is the standard pattern for
 *                       Korean quiz/result sites.
 *   6. X (Twitter)    — web intent URL.
 */
export default function ShareButtons({ title, shareText, variant = 'hero' }: Props) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [instaHintShown, setInstaHintShown] = useState(false);
  // Start as false to match SSR; upgrade after mount to avoid hydration drift.
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [shareUrl, setShareUrl] = useState('https://bujasaju.vercel.app');

  const text = shareText || t.shareDefaultText;

  useEffect(() => {
    setShareUrl(window.location.href);
    setCanNativeShare(typeof navigator.share === 'function');
    // SMS only makes sense on phones. Use a coarse UA sniff — good enough
    // for deciding whether to show the button.
    setIsMobile(/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent));

    // Initialize Kakao SDK as soon as it's available. The script is loaded
    // in root layout with strategy="afterInteractive", so it may not be
    // ready on the first tick — poll briefly then give up.
    const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
    if (!key) return;
    let tries = 0;
    const id = window.setInterval(() => {
      tries += 1;
      const k = window.Kakao;
      if (k) {
        if (!k.isInitialized()) k.init(key);
        window.clearInterval(id);
      } else if (tries > 40) {
        window.clearInterval(id);
      }
    }, 100);
    return () => window.clearInterval(id);
  }, []);

  const copyToClipboard = async (value: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = value;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        return true;
      } catch {
        return false;
      }
    }
  };

  const handleCopy = async () => {
    const ok = await copyToClipboard(shareUrl);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator === 'undefined' || !navigator.share) return;
    try {
      await navigator.share({ title: t.siteTagline, text, url: shareUrl });
    } catch {
      // User cancelled — no-op
    }
  };

  const handleKakao = async () => {
    const k = window.Kakao;
    if (!k?.Share) {
      // SDK not ready yet — degrade gracefully by copying the link
      await copyToClipboard(`${text} ${shareUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      return;
    }
    k.Share.sendDefault({
      objectType: 'feed',
      content: {
        title: t.siteTagline,
        description: text,
        imageUrl: 'https://bujasaju.com/opengraph-image',
        link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
      },
      buttons: [
        {
          title: t.shareDefaultText,
          link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
        },
      ],
    });
  };

  const handleInstagram = async () => {
    // Instagram has no public web share URL, so we do the next best thing:
    // copy the link and tell the user to paste it into their story/DM.
    await copyToClipboard(`${text} ${shareUrl}`);
    setInstaHintShown(true);
    setTimeout(() => setInstaHintShown(false), 3200);
  };

  const twitterHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    text,
  )}&url=${encodeURIComponent(shareUrl)}`;
  const smsHref = `sms:?body=${encodeURIComponent(`${text} ${shareUrl}`)}`;

  const containerClass =
    variant === 'hero'
      ? 'flex flex-col items-center gap-2'
      : 'flex flex-col items-center gap-3 py-6';

  return (
    <div className={containerClass}>
      {title && (
        <div className="text-xs font-medium text-gray-500">{title}</div>
      )}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {/* 카카오톡 */}
        <button
          type="button"
          onClick={handleKakao}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#3a1d1d] rounded-full transition-opacity shadow-sm hover:opacity-90"
          style={{ background: '#FEE500' }}
          aria-label={t.shareKakao}
        >
          <svg aria-hidden viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
            <path d="M12 3C6.48 3 2 6.58 2 10.99c0 2.84 1.87 5.33 4.7 6.76-.2.71-.74 2.62-.85 3.03-.13.51.19.5.4.36.16-.11 2.6-1.77 3.65-2.49.69.1 1.4.15 2.1.15 5.52 0 10-3.58 10-7.99S17.52 3 12 3z" />
          </svg>
          <span>{t.shareKakao}</span>
        </button>

        {/* 링크 복사 */}
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-full transition-colors shadow-sm"
          aria-label={t.shareCopyLink}
        >
          <span aria-hidden>{copied ? '✓' : '🔗'}</span>
          <span>{copied ? t.shareCopied : t.shareCopyLink}</span>
        </button>

        {/* 네이티브 공유 (모바일) */}
        {canNativeShare && (
          <button
            type="button"
            onClick={handleNativeShare}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-full transition-colors shadow-sm"
            aria-label={t.shareMore}
          >
            <span aria-hidden>📤</span>
            <span>{t.shareMore}</span>
          </button>
        )}

        {/* 문자 (SMS) — 모바일 전용 */}
        {isMobile && (
          <a
            href={smsHref}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-green-500 hover:bg-green-600 rounded-full transition-colors shadow-sm"
            aria-label={t.shareSms}
          >
            <span aria-hidden>💬</span>
            <span>{t.shareSms}</span>
          </a>
        )}

        {/* 인스타그램 — 링크 복사 + 안내 */}
        <button
          type="button"
          onClick={handleInstagram}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white rounded-full transition-opacity shadow-sm hover:opacity-90"
          style={{
            background:
              'linear-gradient(45deg, #F58529 0%, #DD2A7B 45%, #8134AF 75%, #515BD4 100%)',
          }}
          aria-label={t.shareInstagram}
        >
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
          </svg>
          <span>{t.shareInstagram}</span>
        </button>

        {/* X / Twitter */}
        <a
          href={twitterHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-black hover:bg-gray-800 rounded-full transition-colors shadow-sm"
          aria-label="X"
        >
          <span aria-hidden className="font-bold">𝕏</span>
          <span>X</span>
        </a>
      </div>

      {/* Instagram paste hint toast */}
      {instaHintShown && (
        <div className="text-[11px] text-gray-600 bg-gray-50 border border-gray-200 rounded-md px-3 py-1.5 mt-1">
          {t.shareInstagramHint}
        </div>
      )}

    </div>
  );
}
