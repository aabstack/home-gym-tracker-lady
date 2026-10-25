import { lazy, Suspense, useEffect } from 'react';
import {
  HashRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router';
import { TabBar } from './components/TabBar';
import { UiProvider } from './components/UiProvider';
import { UpdateToast } from './components/UpdateToast';
import { getActiveSession } from './data/repo';
import { TodayScreen } from './features/today/TodayScreen';
import { WarmupScreen } from './features/warmup/WarmupScreen';
import { SessionScreen } from './features/session/SessionScreen';
import { SummaryScreen } from './features/session/SummaryScreen';
import { HistoryScreen } from './features/history/HistoryScreen';
import { SessionDetailScreen } from './features/history/SessionDetailScreen';
import { SettingsScreen } from './features/settings/SettingsScreen';

// Recharts is the heaviest dependency; keep it out of the start-up bundle.
const ProgressScreen = lazy(() => import('./features/progress/ProgressScreen'));

function TabLayout() {
  return (
    <>
      <main className="pt-safe pb-[calc(5rem+env(safe-area-inset-bottom))]">
        <Outlet />
      </main>
      <TabBar />
    </>
  );
}

let launched = false;

/** On a cold start, jump straight back into an unfinished workout. */
function ResumeOnLaunch() {
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    if (launched) return;
    launched = true;
    if (location.pathname !== '/') return;
    void getActiveSession().then((s) => {
      if (!s) return;
      navigate(s.phase === 'warmup' ? '/warmup' : `/session/${s.id}`);
    });
  }, [navigate, location.pathname]);
  return null;
}

function Loading() {
  return <div className="p-6 text-muted">Loading…</div>;
}

export default function App() {
  return (
    <HashRouter>
      <UiProvider>
        <div className="mx-auto min-h-dvh max-w-[480px]">
          <ResumeOnLaunch />
          <UpdateToast />
          <Routes>
            <Route element={<TabLayout />}>
              <Route index element={<TodayScreen />} />
              <Route path="history" element={<HistoryScreen />} />
              <Route path="history/:id" element={<SessionDetailScreen />} />
              <Route
                path="progress"
                element={
                  <Suspense fallback={<Loading />}>
                    <ProgressScreen />
                  </Suspense>
                }
              />
              <Route path="settings" element={<SettingsScreen />} />
            </Route>
            <Route path="warmup" element={<WarmupScreen />} />
            <Route path="session/:id" element={<SessionScreen />} />
            <Route path="summary/:id" element={<SummaryScreen />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </UiProvider>
    </HashRouter>
  );
}
