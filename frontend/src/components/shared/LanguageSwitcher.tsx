import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import { UI_LANGUAGE_STORAGE_KEY } from '@/i18n'
import styles from './LanguageSwitcher.module.css'

const LANGUAGES = [
  { code: 'en', labelKey: 'language.en' },
  { code: 'zh', labelKey: 'language.zh' },
] as const

interface LanguageSwitcherProps {
  className?: string
}

export default function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const { t, i18n } = useTranslation('common')
  const current = i18n.resolvedLanguage?.startsWith('zh') ? 'zh' : 'en'

  const setLanguage = (code: string) => {
    void i18n.changeLanguage(code)
    try {
      localStorage.setItem(UI_LANGUAGE_STORAGE_KEY, code)
    } catch {
      /* ignore quota errors */
    }
  }

  return (
    <div className={clsx(styles.root, className)}>
      <label className={styles.label}>{t('language.label')}</label>
      <p className={styles.helper}>{t('language.helper')}</p>
      <div className={styles.segmented} role="group" aria-label={t('language.label')}>
        {LANGUAGES.map(({ code, labelKey }) => (
          <button
            key={code}
            type="button"
            className={clsx(styles.btn, current === code && styles.btnActive)}
            onClick={() => setLanguage(code)}
            aria-pressed={current === code}
          >
            {t(labelKey)}
          </button>
        ))}
      </div>
    </div>
  )
}
