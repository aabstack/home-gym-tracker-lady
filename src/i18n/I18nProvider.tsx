import { useEffect, useMemo, type ReactNode } from 'react';
import { useSettings } from '../data/settings';
import { detectLang, I18nContext, makeI18n } from './i18n';

/** Provides the chosen language (Settings → Language, else the phone's) and sets page direction. */
export function I18nProvider({ children }: { children: ReactNode }) {
  const settings = useSettings();
  const lang = settings.language ?? detectLang();
  const value = useMemo(() => makeI18n(lang), [lang]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = value.dir;
  }, [lang, value.dir]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
