import { useState } from 'react';
import {
  Compass,
  CheckSquare,
  ShieldAlert,
  MapPin,
  Coins,
  Bot,
  Languages,
  FolderLock,
  WifiOff,
} from 'lucide-react';
import { TripPlanner } from './components/trips/TripPlanner';
import { PackingChecklist } from './components/packing/PackingChecklist';
import { DocumentVault } from './components/vault/DocumentVault';
import { NearbyEssentials } from './components/nearby/NearbyEssentials';
import { TranslationTool } from './components/translation/TranslationTool';
import { TravelAssistant } from './components/assistant/TravelAssistant';
import { ExpenseManager } from './components/expenses/ExpenseManager';
import { SosPanel } from './components/sos/SosPanel';
import { OfflineHub } from './components/offline/OfflineHub';

export type ActiveTab =
  | 'trips'
  | 'packing'
  | 'vault'
  | 'nearby'
  | 'sos'
  | 'expenses'
  | 'assistant'
  | 'translation'
  | 'offline';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('trips');

  const navItems = [
    { id: 'trips' as ActiveTab, label: 'Trip Planner', icon: Compass, badge: 'T-001' },
    { id: 'packing' as ActiveTab, label: 'Packing', icon: CheckSquare, badge: 'T-002' },
    { id: 'vault' as ActiveTab, label: 'Doc Vault', icon: FolderLock, badge: 'T-003' },
    { id: 'nearby' as ActiveTab, label: 'Nearby', icon: MapPin, badge: 'T-004' },
    { id: 'sos' as ActiveTab, label: 'SOS Alert', icon: ShieldAlert, badge: 'T-005' },
    { id: 'expenses' as ActiveTab, label: 'Expenses', icon: Coins, badge: 'T-006' },
    { id: 'assistant' as ActiveTab, label: 'AI Assistant', icon: Bot, badge: 'T-007' },
    { id: 'translation' as ActiveTab, label: 'Translate', icon: Languages, badge: 'T-008' },
    { id: 'offline' as ActiveTab, label: 'Offline Hub', icon: WifiOff, badge: 'T-009' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-sky-500 selection:text-white">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg text-white tracking-tight">
                  Traveller Companion
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Offline-Ready PWA
                </span>
              </div>
              <p className="text-xs text-slate-400">Zero-Cloud Travel Assistant</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-900 border border-slate-800 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              IndexedDB Local Storage
            </span>
          </div>
        </div>

        {/* Feature Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-800/60 overflow-x-auto no-scrollbar">
          <nav className="flex space-x-1 py-2" aria-label="Feature Tabs">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'trips' && <TripPlanner />}

        {activeTab === 'packing' && <PackingChecklist />}

        {activeTab === 'vault' && <DocumentVault />}

        {activeTab === 'nearby' && <NearbyEssentials />}

        {activeTab === 'sos' && <SosPanel />}

        {activeTab === 'expenses' && <ExpenseManager />}

        {activeTab === 'assistant' && <TravelAssistant />}

        {activeTab === 'translation' && <TranslationTool />}

        {activeTab === 'offline' && <OfflineHub />}
      </main>
    </div>
  );
}
