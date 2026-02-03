import i18next from 'i18next';
import en from './en/common.json';
import fr from './fr/common.json';

function normalizeLocale(locale?: string | null): string {
    if (!locale) return 'en';
    return locale.split('-')[0].toLowerCase();
}

i18next.init({
    lng: 'en',
    fallbackLng: 'en',
    resources: {
        en: {
            translation: en
        },
        fr: {
            translation: fr
        }
    }
});

export function setLanguage(preferredLocale?: string | null): void {
    const languageToUse = normalizeLocale(preferredLocale);
    if (languageToUse && languageToUse !== i18next.language) {
        i18next.changeLanguage(languageToUse);
    }
}

export default i18next;
