import { NavLink } from 'react-router';
import { useI18n } from '../i18n/i18n';
import type { StringKey } from '../i18n/strings.en';
import { Icon, type IconName } from './Icon';

const TABS: { to: string; label: StringKey; icon: IconName }[] = [
  { to: '/', label: 'tab.today', icon: 'today' },
  { to: '/history', label: 'tab.history', icon: 'history' },
  { to: '/progress', label: 'tab.progress', icon: 'chart' },
  { to: '/body', label: 'tab.body', icon: 'body' },
  { to: '/settings', label: 'tab.settings', icon: 'settings' },
];

export function TabBar() {
  const { t } = useI18n();
  return (
    <nav
      aria-label={t('tab.main')}
      className="pb-safe fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[480px] border-t border-line bg-surface"
    >
      <ul className="grid grid-cols-5">
        {TABS.map((tab) => (
          <li key={tab.to}>
            <NavLink
              to={tab.to}
              end={tab.to === '/'}
              className={({ isActive }) =>
                `flex min-h-16 flex-col items-center justify-center gap-0.5 px-0.5 text-center text-label leading-tight ${isActive ? 'font-semibold text-accent' : 'text-muted'}`
              }
            >
              <Icon name={tab.icon} />
              {t(tab.label)}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
