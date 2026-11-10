import React from 'react';
import {
  Clock,
  ClipboardPenLine,
  ExternalLink,
} from 'lucide-react';
import { PracticeSchedule, AttendanceRecord } from '../types';

export type MainTab =
  | 'home'
  | 'loading'
  | 'instrument_ai'
  | 'music_terms_ai'
  | 'more'
  | 'scores'
  | 'attendance';

interface HeaderProps {
  onOpenAttendanceReport?: () => void;
  todaySchedule?: PracticeSchedule;
  todayAttendance?: AttendanceRecord[];
  onOpenAttendanceTab?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  todaySchedule,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-2xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        <div className="py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-4">
          {/* Brand Logo & Title (Left) */}
          <div className="flex items-center gap-2.5 min-w-0">
            {/* School Color: Elegant Forest/Emerald Green Emblem */}
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-emerald-700 to-emerald-900 text-emerald-100 flex items-center justify-center font-black text-sm sm:text-base shadow-xs shadow-emerald-900/20 shrink-0 border border-emerald-600/40">
              🎷
            </div>
            <div className="leading-tight truncate">
              <div className="flex items-center gap-1.5">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-stone-900 font-serif">
                  ガタブラポータル
                </h1>
                <span className="hidden xs:inline-block px-1.5 py-0.2 text-[10px] font-semibold bg-emerald-50 text-emerald-800 rounded-md border border-emerald-200">
                  吹奏楽部
                </span>
              </div>
              <p className="hidden md:block text-[11px] text-stone-400">
                活動予定・出欠・トラック積込・楽譜庫・AIクリニック
              </p>
            </div>
          </div>

          {/* Right Section: USER REQUIREMENT: 出欠報告ボタンを右上に配置 (出欠状況バッジは削除) */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Today schedule snippet on desktop */}
            {todaySchedule && (
              <div className="hidden lg:flex items-center gap-1 text-stone-600 text-[11px] bg-emerald-50/50 px-2.5 py-1 rounded-lg border border-emerald-100">
                <Clock className="w-3 h-3 text-emerald-700" />
                <span>
                  本日: {todaySchedule.startTime}〜{todaySchedule.endTime}
                </span>
              </div>
            )}

            {/* USER REQUIREMENT: 出欠報告ボタンは画面の最上部右上に配置し、指定のGoogleフォームへ遷移 */}
            <a
              id="header-attendance-report-btn"
              href="https://forms.gle/AX2eQ98ErY3q2wAS9"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs shadow-emerald-800/25 active:scale-95 transition-all shrink-0 border border-emerald-500/40"
              title="Googleフォームを開いて出欠（欠席・遅刻・早退）を報告する"
            >
              <ClipboardPenLine className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-100" />
              <span>出欠報告</span>
              <ExternalLink className="w-3 h-3 text-emerald-200" />
            </a>
          </div>
        </div>
      </div>
    </header>
  );
};
