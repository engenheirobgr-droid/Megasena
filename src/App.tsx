/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, lazy, Suspense } from 'react';
import {
  BarChart3,
  LayoutGrid,
  Target,
  Wallet,
  Timer,
  Menu,
  Loader2,
  LogIn,
  LogOut,
  Download,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import type { Page } from './types';
import { useAuth } from './contexts/AuthContext';

const StatsPage = lazy(() => import('./pages/Stats'));
const GamesPage = lazy(() => import('./pages/Games'));
const SimulatorPage = lazy(() => import('./pages/Simulator'));
const FinancePage = lazy(() => import('./pages/Finance'));
const TimePage = lazy(() => import('./pages/Time'));

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

const PageLoader = () => (
  <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
    <Loader2 className="w-8 h-8 text-primary animate-spin" />
    <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant animate-pulse">
      Carregando analise...
    </span>
  </div>
);

export default function App() {
  const [activePage, setActivePage] = useState<Page>('stats');
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const { user, loading, firebaseReady, signInAnonymous, signOutUser } = useAuth();

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsInstalled(Boolean(standalone));

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  const navItems = [
    { id: 'stats', label: 'Stats', icon: BarChart3 },
    { id: 'games', label: 'Games', icon: LayoutGrid },
    { id: 'simulator', label: 'Simulator', icon: Target },
    { id: 'finance', label: 'Finance', icon: Wallet },
    { id: 'time', label: 'Time', icon: Timer },
  ] as const;

  const renderPage = () => {
    switch (activePage) {
      case 'stats':
        return <StatsPage />;
      case 'games':
        return <GamesPage />;
      case 'simulator':
        return <SimulatorPage />;
      case 'finance':
        return <FinancePage />;
      case 'time':
        return <TimePage />;
      default:
        return <StatsPage />;
    }
  };

  return (
    <div className="flex min-h-screen bg-background text-on-surface font-inter selection:bg-primary/20">
      <aside className="hidden lg:flex w-72 bg-surface-container border-r border-outline-variant/30 flex-col p-8 fixed h-full z-50">
        <div className="flex items-center gap-3 font-bold text-xl text-primary mb-12">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Target className="w-5 h-5 text-on-primary" />
          </div>
          Lotto Pro
        </div>

        <div className="flex-1 space-y-2">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActivePage(id)}
              className={cn(
                'w-full flex items-center gap-4 px-4 py-3 rounded-xl font-medium transition-all group',
                activePage === id
                  ? 'bg-primary-container text-primary'
                  : 'text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface',
              )}
            >
              <Icon className={cn('w-5 h-5 transition-transform', activePage === id && 'scale-110')} />
              {label}
            </button>
          ))}
        </div>

        <button className="flex items-center gap-4 px-4 py-3 rounded-xl font-medium text-on-surface-variant hover:bg-surface-container-highest transition-all mt-auto">
          <Menu className="w-5 h-5" />
          Settings
        </button>
      </aside>

      <div className="flex-1 lg:ml-72 flex flex-col">
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md px-6 py-6 flex justify-between items-center">
          <div className="flex items-center gap-4 lg:hidden">
            <Menu className="text-primary cursor-pointer w-6 h-6" />
            <h1 className="text-xl font-bold text-primary tracking-tight">Lotto Pro</h1>
          </div>

          <div className="hidden lg:flex bg-surface-container border border-outline-variant/50 px-5 py-3 rounded-xl w-80 text-on-surface-variant/60 text-sm font-medium items-center gap-3">
            <BarChart3 className="w-4 h-4" />
            Search analytics...
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <div className="text-sm font-bold">
                {loading ? 'Carregando...' : user ? (user.isAnonymous ? 'Visitante anonimo' : 'Usuario') : 'Visitante'}
              </div>
              <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                {firebaseReady ? (user ? 'Sessao ativa' : 'Entrar sem cadastro') : 'Firebase nao configurado'}
              </div>
            </div>
            {user?.photoURL ? (
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white bg-surface-container shadow-lg">
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Perfil'}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full border-2 border-white bg-surface-container shadow-lg" />
            )}
            <button
              onClick={user ? signOutUser : signInAnonymous}
              disabled={!firebaseReady || loading}
              className={cn(
                'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all',
                firebaseReady ? 'bg-primary text-on-primary hover:opacity-90' : 'bg-surface-dim text-on-surface-variant cursor-not-allowed',
              )}
            >
              {user ? <LogOut className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
              {user ? 'Sair' : 'Entrar anonimo'}
            </button>
            {!isInstalled && deferredPrompt ? (
              <button
                onClick={handleInstallClick}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-widest bg-green-600 text-white hover:opacity-90 transition-all"
              >
                <Download className="w-4 h-4" />
                Instalar app
              </button>
            ) : null}
          </div>
        </header>

        <main className="flex-1 pb-32">
          <Suspense fallback={<PageLoader />}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activePage}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="px-6"
              >
                {renderPage()}
              </motion.div>
            </AnimatePresence>
          </Suspense>
        </main>
      </div>

      <nav className="fixed lg:hidden bottom-6 left-1/2 -translate-x-1/2 z-50 bg-background/90 backdrop-blur-xl border border-outline-variant/20 flex justify-around items-center px-6 py-3 rounded-2xl shadow-2xl w-[90%] max-w-sm">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActivePage(id)}
            className={cn(
              'flex flex-col items-center justify-center p-2 rounded-xl transition-all relative',
              activePage === id ? 'text-primary bg-primary-container' : 'text-on-surface-variant',
            )}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[8px] font-bold uppercase tracking-widest mt-1">{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
