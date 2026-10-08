// Legal documents (privacy policy, terms, data list, purchases and ads, open-source licenses).
// The text lives in en.json and tr.json (same ids and section counts; `npm run build` checks it). Other languages
// show the English text. tools/make-legal-pages.mjs turns the same files into static pages for the app stores.
import en from './en.json';
import tr from './tr.json';
import config from './config.json';

export interface LegalDoc { id: string; title: string; summary: string; sections: { h: string; p: string[] }[] }

export const legalDocs = (lang: string): LegalDoc[] => (lang === 'tr' ? tr : en) as LegalDoc[];
export const hasOwnText = (lang: string) => lang === 'tr' || lang === 'en';
/** The developer's contact address; empty until Arda fills it in `config.json` (shown on the screen only when set). */
export const contactEmail = config.contactEmail;
export const updatedOn = config.updated;
