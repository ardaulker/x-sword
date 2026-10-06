// Dil bayrakları: basitleştirilmiş SVG, her sistemde aynı görünür (emoji bayraklar Windows'ta harf olur).
import type { ReactElement } from 'react';
import type { Lang } from '../i18n';

const STAR = '17,7.2 18.2,9 20.3,9.4 18.8,10.9 19.2,13 17,12 14.8,13 15.2,10.9 13.7,9.4 15.8,9';

const FLAGS: Record<Lang, ReactElement> = {
  tr: (
    <>
      <rect width="30" height="20" fill="#E30A17" />
      <circle cx="11" cy="10" r="5" fill="#fff" />
      <circle cx="12.4" cy="10" r="4" fill="#E30A17" />
      <polygon points={STAR} fill="#fff" />
    </>
  ),
  en: (
    <>
      <rect width="30" height="20" fill="#012169" />
      <path d="M0 0 L30 20 M30 0 L0 20" stroke="#fff" strokeWidth="4" />
      <path d="M0 0 L30 20 M30 0 L0 20" stroke="#C8102E" strokeWidth="1.6" />
      <path d="M15 0 V20 M0 10 H30" stroke="#fff" strokeWidth="6" />
      <path d="M15 0 V20 M0 10 H30" stroke="#C8102E" strokeWidth="3.4" />
    </>
  ),
  de: (
    <>
      <rect width="30" height="6.67" fill="#000" />
      <rect y="6.67" width="30" height="6.67" fill="#DD0000" />
      <rect y="13.33" width="30" height="6.67" fill="#FFCE00" />
    </>
  ),
  fr: (
    <>
      <rect width="10" height="20" fill="#0055A4" />
      <rect x="10" width="10" height="20" fill="#fff" />
      <rect x="20" width="10" height="20" fill="#EF4135" />
    </>
  ),
  es: (
    <>
      <rect width="30" height="20" fill="#AA151B" />
      <rect y="5" width="30" height="10" fill="#F1BF00" />
    </>
  ),
  it: (
    <>
      <rect width="10" height="20" fill="#009246" />
      <rect x="10" width="10" height="20" fill="#fff" />
      <rect x="20" width="10" height="20" fill="#CE2B37" />
    </>
  ),
  pt: (
    <>
      <rect width="12" height="20" fill="#006600" />
      <rect x="12" width="18" height="20" fill="#FF0000" />
      <circle cx="12" cy="10" r="4" fill="#FFCC00" stroke="#fff" strokeWidth="0.8" />
      <circle cx="12" cy="10" r="1.8" fill="#FF0000" />
    </>
  ),
};

export function Flag({ lang, width = 36 }: { lang: Lang; width?: number }) {
  return (
    <svg width={width} height={(width * 2) / 3} viewBox="0 0 30 20" aria-hidden="true" style={{ borderRadius: 3, display: 'block' }}>
      {FLAGS[lang]}
    </svg>
  );
}
