import commonEn from '@/locales/en/common.json'
import commonZh from '@/locales/zh/common.json'
import authEn from '@/locales/en/auth.json'
import authZh from '@/locales/zh/auth.json'
import landingEn from '@/locales/en/landing.json'
import landingZh from '@/locales/zh/landing.json'
import chatEn from '@/locales/en/chat.json'
import chatZh from '@/locales/zh/chat.json'
import sharedEn from '@/locales/en/shared.json'
import sharedZh from '@/locales/zh/shared.json'
import commandsEn from '@/locales/en/commands.json'
import commandsZh from '@/locales/zh/commands.json'
import modalsEn from '@/locales/en/modals.json'
import modalsZh from '@/locales/zh/modals.json'
import panelsEn from '@/locales/en/panels.json'
import panelsZh from '@/locales/zh/panels.json'
import settingsEn from '@/locales/en/settings.json'
import settingsZh from '@/locales/zh/settings.json'
import dreamWeaverEn from '@/locales/en/dreamWeaver.json'
import dreamWeaverZh from '@/locales/zh/dreamWeaver.json'
import errorsEn from '@/locales/en/errors.json'
import errorsZh from '@/locales/zh/errors.json'

export const I18N_NAMESPACES = [
  'common',
  'auth',
  'landing',
  'chat',
  'shared',
  'commands',
  'modals',
  'panels',
  'settings',
  'dreamWeaver',
  'errors',
] as const

export type I18nNamespace = (typeof I18N_NAMESPACES)[number]

export const resources = {
  en: {
    common: commonEn,
    auth: authEn,
    landing: landingEn,
    chat: chatEn,
    shared: sharedEn,
    commands: commandsEn,
    modals: modalsEn,
    panels: panelsEn,
    settings: settingsEn,
    dreamWeaver: dreamWeaverEn,
    errors: errorsEn,
  },
  zh: {
    common: commonZh,
    auth: authZh,
    landing: landingZh,
    chat: chatZh,
    shared: sharedZh,
    commands: commandsZh,
    modals: modalsZh,
    panels: panelsZh,
    settings: settingsZh,
    dreamWeaver: dreamWeaverZh,
    errors: errorsZh,
  },
} as const
