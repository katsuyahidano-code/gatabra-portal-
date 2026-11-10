import React from 'react';
import {
  Home,
  Truck,
  Sparkles,
  BookOpen,
  MoreHorizontal,
} from 'lucide-react';

export type BottomNavTab =
  | 'home'
  | 'loading'
  | 'instrument_ai'
  | 'music_terms_ai'
  | 'more'
  | 'scores'
  | 'attendance';

export const GEMINI_INSTRUMENT_GEM_URL =
  'https://gemini.google.com/gem/1nnyMBgwcuuyPO0BCtD6qfMabuVwlW8nc?usp=sharing';

export const GEMINI_MUSIC_TERMS_GEM_URL =
  'https://gemini.google.com/gem/1Z5-J2SscuQl7nXg5OQcHxF-7dEBgMVzy?usp=sharing';

interface BottomNavProps {
  activeTab: BottomNavTab;
  onSelectTab: (tab: BottomNavTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onSelectTab }) => {
  const navItems = [
    {
      id: 'home' as const,
      label: 'ホーム',
      icon: Home,
    },
    {
      id: 'loading' as const,
      label: 'トラック積込',
      icon: Truck,
    },
    {
      id: 'instrument_ai' as const,
      label: '楽器相談室',
      icon: Sparkles,
      highlight: true,
      href: GEMINI_INSTRUMENT_GEM_URL,
    },
    {
      id: 'music_terms_ai' as const,
      label: '音楽用語辞典',
      icon: BookOpen,
      highlight: true,
      href: GEMINI_MUSIC_TERMS_GEM_URL,
    },
    {
      id: 'more' as const,
      label: 'その他',
      icon: MoreHorizontal,
      // 'scores' or 'attendance' are sub-views accessible via 'more'
      activeMatch: ['more', 'scores', 'attendance'],
    },
  ];

  return (
    <nav
      id="bottom-nav-bar"
      aria-label="メインナビゲーション"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200 shadow-lg pb-[env(safe-area-inset-bottom,0px)]"
    >
      <div className="max-w-lg md:max-w-xl mx-auto px-1 sm:px-2">
        <div className="grid grid-cols-5 h-16 items-center">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isSelected = item.activeMatch
              ? item.activeMatch.includes(activeTab)
              : activeTab === item.id;

            if (item.href) {
              return (
                <a
                  key={item.id}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative flex flex-col items-center justify-center h-full w-full py-1 transition-all group text-stone-600 hover:text-emerald-800"
                  title="楽器相談室（GeminiカスタムGem）を新しいタブで開く"
                >
                  <div className="p-1 rounded-xl transition-all group-hover:bg-emerald-50">
                    <Icon className="w-5 h-5 text-emerald-700 transition-transform group-hover:scale-110" />
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-semibold tracking-tight whitespace-nowrap mt-0.5 leading-none text-stone-600 group-hover:text-emerald-900 flex items-center gap-0.5">
                    {item.label}
                  </span>
                </a>
              );
            }

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`relative flex flex-col items-center justify-center h-full w-full py-1 transition-all group ${
                  isSelected ? 'text-emerald-800' : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                {/* Active Indicator Top Pill */}
                {isSelected && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-emerald-600 rounded-b-full shadow-2xs" />
                )}

                {/* Icon with container */}
                <div
                  className={`p-1 rounded-xl transition-all ${
                    isSelected
                      ? 'bg-emerald-100/80 text-emerald-800'
                      : item.highlight
                      ? 'group-hover:bg-stone-100'
                      : 'group-hover:bg-stone-100'
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 transition-transform ${
                      isSelected ? 'scale-110 text-emerald-800' : ''
                    } ${item.highlight && !isSelected ? 'text-emerald-700' : ''}`}
                  />
                </div>

                {/* Label */}
                <span
                  className={`text-[10px] sm:text-[11px] font-semibold tracking-tight whitespace-nowrap mt-0.5 leading-none ${
                    isSelected ? 'font-bold text-emerald-900' : 'text-stone-600'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
