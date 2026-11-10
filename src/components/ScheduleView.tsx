import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Music,
  CheckCircle2,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Users,
  Timer,
  Info,
  CalendarRange,
  ListTodo,
  GraduationCap,
  RefreshCw,
} from 'lucide-react';
import { PracticeSchedule, AttendanceRecord, ScheduleViewTab, PracticeType } from '../types';
import { SpreadsheetSyncModal } from './SpreadsheetSyncModal';
import { MonthlyCalendarView } from './MonthlyCalendarView';
import { getTodayStr, getDayOfWeekName } from '../utils/dateUtils';
import {
  parseSchedulesFromCSV,
  exportToCSV,
  DEFAULT_SCHEDULE_SPREADSHEET_URL,
} from '../utils/spreadsheetSync';

interface ScheduleViewProps {
  schedules: PracticeSchedule[];
  attendanceRecords: AttendanceRecord[];
  onUpdateSchedules: (schedules: PracticeSchedule[]) => void;
  onSelectDate?: (date: string) => void;
  onOpenAttendanceTab?: () => void;
  attendanceSyncStatus?: {
    isSyncing: boolean;
    lastSyncedAt: string | null;
    error: string | null;
  };
  onRefreshAttendance?: () => void;
  scheduleSyncStatus?: {
    isSyncing: boolean;
    lastSyncedAt: string | null;
    error: string | null;
    count: number;
  };
  onRefreshSchedule?: () => void;
  scheduleSpreadsheetUrl?: string;
  onSaveScheduleSpreadsheetUrl?: (url: string) => void;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  schedules,
  attendanceRecords,
  onUpdateSchedules,
  onOpenAttendanceTab,
  attendanceSyncStatus,
  onRefreshAttendance,
  scheduleSyncStatus,
  onRefreshSchedule,
  scheduleSpreadsheetUrl,
  onSaveScheduleSpreadsheetUrl,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<ScheduleViewTab>('daily');
  const todayStr = getTodayStr(); // Real current date (YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  // Find schedule for selected date (with graceful fallback so selectedDate is always preserved)
  const currentDailySchedule: PracticeSchedule =
    schedules.find((s) => s.date === selectedDate) || {
      id: `sched-${selectedDate}`,
      date: selectedDate,
      dayOfWeek: getDayOfWeekName(selectedDate),
      title: selectedDate === todayStr ? '本日の活動予定' : `${selectedDate} の予定`,
      type: 'free',
      startTime: 'ー',
      endTime: 'ー',
      location: '音楽室',
      supervisors: ['松：ー', '飛：ー'],
      advisors: { matsu: 'ー', tobi: 'ー' },
      notes: 'この日の個別予定は未登録です（スプレッドシートから反映または手動で確認できます）',
      pieces: [],
      timetable: [],
    };

  // Helper for attendance on a specific date
  const getAttendanceForDate = (date: string) => {
    return attendanceRecords.filter((a) => a.date === date);
  };

  // Type label helper
  const getTypeBadge = (type: PracticeType) => {
    switch (type) {
      case 'tutti':
        return { label: '全体合奏', bg: 'bg-amber-100 text-amber-900 border-amber-300' };
      case 'part':
        return { label: 'パート練習', bg: 'bg-emerald-100 text-emerald-900 border-emerald-300' };
      case 'section':
        return { label: 'セクション練習', bg: 'bg-sky-100 text-sky-900 border-sky-300' };
      case 'hall':
        return { label: 'ホール遠征・外部', bg: 'bg-purple-100 text-purple-900 border-purple-300' };
      case 'free':
        return { label: '自主練習', bg: 'bg-stone-100 text-stone-700 border-stone-300' };
      case 'off':
        return { label: '部活動オフ', bg: 'bg-rose-50 text-rose-700 border-rose-200' };
      default:
        return { label: '練習', bg: 'bg-stone-100 text-stone-700 border-stone-300' };
    }
  };

  // Advisor status helper (松・飛: 〇・✕)
  const getAdvisorStatus = (sch?: PracticeSchedule) => {
    if (!sch) return null;
    let matsuVal = sch.advisors?.matsu;
    let tobiVal = sch.advisors?.tobi;

    // Fallback if advisors object is not explicitly set but supervisors array exists
    if (matsuVal === undefined && sch.supervisors) {
      matsuVal = sch.supervisors.includes('松') ? '○' : undefined;
    }
    if (tobiVal === undefined && sch.supervisors) {
      tobiVal = sch.supervisors.includes('飛') ? '○' : undefined;
    }

    if (matsuVal === undefined && tobiVal === undefined) return null;

    const normalizeMark = (val?: string) => {
      if (!val) return undefined;
      const s = val.trim();
      if (s === '○' || s === '◯' || s === '〇' || s.toLowerCase() === 'o' || s === '1') {
        return '〇';
      }
      if (s === '×' || s === '✕' || s.toLowerCase() === 'x' || s === '0') {
        return '✕';
      }
      return val;
    };

    return {
      matsu: normalizeMark(matsuVal),
      tobi: normalizeMark(tobiVal),
    };
  };

  // Change date (prev / next day)
  const handleDayStep = (delta: number) => {
    const base = selectedDate || todayStr;
    const [y, m, d] = base.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d + delta);
    const nextY = dateObj.getFullYear();
    const nextM = String(dateObj.getMonth() + 1).padStart(2, '0');
    const nextD = String(dateObj.getDate()).padStart(2, '0');
    setSelectedDate(`${nextY}-${nextM}-${nextD}`);
  };

  // Shift week by delta days (e.g. -7 for previous week, +7 for next week)
  const handleWeekShift = (deltaDays: number) => {
    const base = selectedDate || todayStr;
    const [y, m, d] = base.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d + deltaDays);
    const nextY = dateObj.getFullYear();
    const nextM = String(dateObj.getMonth() + 1).padStart(2, '0');
    const nextD = String(dateObj.getDate()).padStart(2, '0');
    setSelectedDate(`${nextY}-${nextM}-${nextD}`);
  };

  // Handle schedule import from CSV
  const handleImportSchedules = (csvText: string) => {
    const parsed = parseSchedulesFromCSV(csvText);
    if (parsed.length > 0) {
      // Merge with existing by date
      const updated = [...schedules];
      for (const item of parsed) {
        const idx = updated.findIndex((s) => s.date === item.date);
        if (idx >= 0) {
          updated[idx] = { ...updated[idx], ...item };
        } else {
          updated.push(item);
        }
      }
      onUpdateSchedules(updated.sort((a, b) => a.date.localeCompare(b.date)));
    } else {
      throw new Error(
        '有効な練習予定データ（日付等）が見つかりませんでした。スプレッドシートのシート名（タブ）が合っているかご確認ください。'
      );
    }
  };

  // Handle export to CSV
  const handleExportCSV = () => {
    const headers = [
      '日付',
      '曜日',
      '練習内容',
      '形態',
      '開始時間',
      '終了時間',
      '練習場所',
      '指揮・指導者',
      '練習曲目',
      '連絡事項',
    ];
    const rows = schedules.map((s) => [
      s.date,
      s.dayOfWeek,
      s.title,
      s.type,
      s.startTime,
      s.endTime,
      s.location,
      s.conductor,
      s.pieces.join(' / '),
      s.notes,
    ]);
    exportToCSV('ガタブラ_練習日程一覧.csv', headers, rows);
  };

  // Weekly group: calculate Monday-to-Sunday 1-week slice containing selectedDate (その日の練習詳細の日付が含まれる週)
  const targetDateStr = selectedDate || todayStr;
  const [targetY, targetM, targetD] = targetDateStr.split('-').map(Number);
  const targetDateObj = new Date(targetY, targetM - 1, targetD);
  const dayOfWeekNum = targetDateObj.getDay(); // 0 is Sun, 1 is Mon, ..., 6 is Sat
  const diffToMon = dayOfWeekNum === 0 ? -6 : 1 - dayOfWeekNum;
  const mondayDate = new Date(targetY, targetM - 1, targetD + diffToMon);

  const dayNames = ['日', '月', '火', '水', '木', '金', '土'] as const;
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mondayDate.getFullYear(), mondayDate.getMonth(), mondayDate.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const curDateStr = `${yyyy}-${mm}-${dd}`;
    const dayName = dayNames[d.getDay()];

    const sch = schedules.find((s) => s.date === curDateStr);
    const isPast = curDateStr < todayStr;
    const isToday = curDateStr === todayStr;
    const isSelected = curDateStr === selectedDate;

    return {
      date: curDateStr,
      dayOfWeek: dayName,
      sch,
      isPast,
      isToday,
      isSelected,
    };
  });

  const sundayDate = new Date(mondayDate.getFullYear(), mondayDate.getMonth(), mondayDate.getDate() + 6);
  const weekStartStr = `${mondayDate.getFullYear()}年${mondayDate.getMonth() + 1}月${mondayDate.getDate()}日(月)`;
  const weekEndStr = `${sundayDate.getMonth() + 1}月${sundayDate.getDate()}日(日)`;
  const isCurrentWeek = weekDays.some((w) => w.isToday);

  // Monthly stats
  const totalPracticeDays = schedules.filter((s) => s.type !== 'off').length;
  const totalOffDays = schedules.filter((s) => s.type === 'off').length;
  const tuttiDays = schedules.filter((s) => s.type === 'tutti' || s.type === 'hall').length;

  return (
    <div className="space-y-6">
      {/* Action Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-stone-200 shadow-xs">
        {/* 3 Subtabs */}
        <div className="flex items-center gap-1.5 p-1 bg-stone-100/80 rounded-xl border border-stone-200/60 overflow-x-auto no-scrollbar max-w-full">
          <button
            onClick={() => setActiveSubTab('daily')}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap shrink-0 ${
              activeSubTab === 'daily'
                ? 'bg-white text-emerald-950 shadow-xs border border-emerald-100'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <ListTodo className="w-4 h-4 text-emerald-700" />
            <span>その日の練習詳細</span>
          </button>
          <button
            onClick={() => setActiveSubTab('weekly')}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap shrink-0 ${
              activeSubTab === 'weekly'
                ? 'bg-white text-emerald-950 shadow-xs border border-emerald-100'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <CalendarRange className="w-4 h-4 text-emerald-700" />
            <span>週間予定</span>
          </button>
          <button
            onClick={() => setActiveSubTab('monthly')}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap shrink-0 ${
              activeSubTab === 'monthly'
                ? 'bg-white text-emerald-950 shadow-xs border border-emerald-100'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Calendar className="w-4 h-4 text-emerald-700" />
            <span>月間カレンダー</span>
          </button>
        </div>

        {/* Action buttons: Spreadsheet sync & auto-sync status */}
        <div className="flex flex-wrap items-center gap-2">
          {scheduleSyncStatus?.isSyncing ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-700" />
              <span>日程を自動読込中...</span>
            </span>
          ) : scheduleSyncStatus?.error ? (
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-rose-50 text-rose-800 border border-rose-300"
              title={scheduleSyncStatus.error}
            >
              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
              <span>自動読込エラー</span>
            </span>
          ) : scheduleSyncStatus?.lastSyncedAt ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-900 border border-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
              <span>日程 自動読込済 ({scheduleSyncStatus.lastSyncedAt} / {schedules.length}日分)</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-stone-50 text-stone-600 border border-stone-200">
              <Calendar className="w-3.5 h-3.5 text-stone-500" />
              <span>登録日程: {schedules.length}日分</span>
            </span>
          )}

          {onRefreshSchedule && (
            <button
              onClick={onRefreshSchedule}
              disabled={scheduleSyncStatus?.isSyncing}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 text-white rounded-xl transition-all shadow-xs disabled:opacity-50"
              title="スプレッドシートから最新の練習日程を今すぐ再取得"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-emerald-200 ${
                  scheduleSyncStatus?.isSyncing ? 'animate-spin' : ''
                }`}
              />
              <span>{scheduleSyncStatus?.isSyncing ? '取得中...' : '日程を再読込'}</span>
            </button>
          )}

          <button
            onClick={() => setIsSyncModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-stone-100 text-stone-700 border border-stone-200 rounded-xl hover:bg-stone-200 transition-colors shadow-2xs"
            title="練習日程スプレッドシート連携URL設定・手動貼付"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
            <span>連携設定</span>
          </button>
        </div>
      </div>

      {/* SUBTAB 1: その日の練習詳細 */}
      {activeSubTab === 'daily' && currentDailySchedule && (
        <div className="space-y-6">
          {/* Day Selector bar - School Color Deep Green */}
          <div className="flex items-center justify-between bg-gradient-to-r from-emerald-950 via-emerald-900 to-stone-900 text-white p-4 rounded-2xl shadow-sm border border-emerald-800/50">
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleDayStep(-1)}
                className="p-2 rounded-xl bg-emerald-900/80 hover:bg-emerald-800 text-emerald-100 transition-colors border border-emerald-700/40"
                title="前日へ"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl sm:text-2xl font-black font-serif tracking-tight text-white">
                    {currentDailySchedule.date} ({currentDailySchedule.dayOfWeek})
                  </span>
                  {currentDailySchedule.date === todayStr && (
                    <span className="px-2 py-0.5 text-xs font-bold bg-emerald-500 text-white rounded-full shadow-2xs">
                      本日
                    </span>
                  )}
                </div>
                <p className="text-xs text-emerald-200/80 mt-0.5">
                  吹奏楽部 活動予定詳細
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                className="px-2.5 py-1.5 text-xs font-semibold bg-emerald-900/90 text-white border border-emerald-700 rounded-lg cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-400"
                title="日付を選択"
              />
              <button
                onClick={() => setSelectedDate(todayStr)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                  selectedDate === todayStr
                    ? 'bg-emerald-600 text-white border-emerald-400'
                    : 'bg-emerald-800 hover:bg-emerald-700 text-emerald-100 border-emerald-600/60'
                }`}
              >
                今日
              </button>
              <button
                onClick={() => handleDayStep(1)}
                className="p-2 rounded-xl bg-emerald-900/80 hover:bg-emerald-800 text-emerald-100 transition-colors border border-emerald-700/40"
                title="翌日へ"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main Detail Card */}
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
            {/* Header info */}
            <div className="p-5 sm:p-6 border-b border-stone-100 bg-gradient-to-r from-emerald-50/40 via-stone-50 to-white">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5 flex-wrap">
                  {/* ① 行事（シートの「行事」列の内容を出力。空欄の場合は通常練習） */}
                  <span
                    className={`px-3 py-1 text-xs font-bold rounded-lg border shadow-2xs ${
                      currentDailySchedule.event
                        ? 'bg-amber-100 text-amber-900 border-amber-300'
                        : getTypeBadge(currentDailySchedule.type).bg
                    }`}
                  >
                    {currentDailySchedule.event?.trim() || '通常練習'}
                  </span>

                  {/* ② 時間（シートの「開始」と「終了」の時間を表示） */}
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-800 bg-white px-2.5 py-1 rounded-lg border border-stone-200 shadow-2xs">
                    <Clock className="w-3.5 h-3.5 text-emerald-700" />
                    <span>
                      {currentDailySchedule.startTime} 〜 {currentDailySchedule.endTime}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 text-xs text-stone-600 flex-wrap">
                  {/* ③ 使用可能教室（シートの「使用可能教室」に表示されている内容） */}
                  <div
                    className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-stone-200 shadow-2xs"
                    title="使用可能教室"
                  >
                    <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span className="font-semibold text-stone-800">
                      {currentDailySchedule.availableRooms || currentDailySchedule.location || '教室指定なし'}
                    </span>
                  </div>

                  {/* ④ 講習（シートの「1年講習」「2年講習」「3年講習」で○がある学年を表示） */}
                  <div
                    className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-stone-200 shadow-2xs"
                    title="講習実施学年"
                  >
                    <GraduationCap className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span className="font-semibold text-stone-800">
                      講習：
                      {currentDailySchedule.trainingGrades && currentDailySchedule.trainingGrades.length > 0
                        ? currentDailySchedule.trainingGrades.join('、')
                        : 'なし'}
                    </span>
                  </div>

                  {/* 顧問 (USER REQUIREMENT: 「担当」のところを「顧問」に変更し、松、飛の〇✕を表示) */}
                  {(() => {
                    const adv = getAdvisorStatus(currentDailySchedule);
                    if (!adv) return null;
                    return (
                      <div
                        className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-stone-200 shadow-2xs text-stone-800 font-semibold"
                        title="顧問の出欠状況"
                      >
                        <User className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <span>顧問：</span>
                        <span className="font-mono flex items-center gap-1.5">
                          {adv.matsu && (
                            <span
                              className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                                adv.matsu === '〇'
                                  ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                                  : 'text-rose-700 bg-rose-50 border border-rose-200'
                              }`}
                            >
                              松:{adv.matsu}
                            </span>
                          )}
                          {adv.tobi && (
                            <span
                              className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                                adv.tobi === '〇'
                                  ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                                  : 'text-rose-700 bg-rose-50 border border-rose-200'
                              }`}
                            >
                              飛:{adv.tobi}
                            </span>
                          )}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
                {currentDailySchedule.event || currentDailySchedule.title || '放課後練習'}
              </h2>
            </div>

            <div className="p-5 sm:p-6 space-y-6">
              {/* USER REQUIREMENT: 本日の重点目標と連絡事項はタイムテーブルの上に配置 */}
              {/* USER REQUIREMENT: スマホ画面対応のため上下に並べる（重点目標 → 連絡事項の順） */}
              <div className="space-y-4">
                {/* 1. 本日の重点目標 */}
                {currentDailySchedule.goals && currentDailySchedule.goals.length > 0 && (
                  <div className="p-4 bg-gradient-to-r from-emerald-50/80 to-emerald-50/40 rounded-2xl border border-emerald-200 shadow-2xs">
                    <h4 className="text-xs font-bold text-emerald-900 mb-2.5 flex items-center gap-2">
                      <div className="p-1 rounded-md bg-emerald-700 text-white">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-sm font-bold text-emerald-950">本日の重点目標</span>
                    </h4>
                    <ul className="space-y-2 text-xs sm:text-sm text-emerald-950 pl-1">
                      {currentDailySchedule.goals.map((g, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-emerald-700 font-extrabold mt-0.5">•</span>
                          <span className="leading-snug">{g}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 2. 連絡事項・持ち物 */}
                {currentDailySchedule.notes && (
                  <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 shadow-2xs">
                    <h4 className="text-xs font-bold text-stone-800 mb-2.5 flex items-center gap-2">
                      <div className="p-1 rounded-md bg-stone-700 text-white">
                        <Info className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-sm font-bold text-stone-900">連絡事項・持ち物</span>
                    </h4>
                    <p className="text-xs sm:text-sm text-stone-700 leading-relaxed whitespace-pre-line pl-1">
                      {currentDailySchedule.notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Timeline (Detailed Schedule) - USER REQUIREMENT: 重点目標・連絡事項の「下」に配置 */}
              {currentDailySchedule.timeline && currentDailySchedule.timeline.length > 0 ? (
                <div className="pt-2">
                  <h3 className="text-sm font-bold text-stone-900 mb-3 flex items-center gap-2">
                    <div className="p-1 rounded-md bg-emerald-100 text-emerald-800">
                      <Timer className="w-4 h-4 text-emerald-700" />
                    </div>
                    <span>本日のタイムテーブル・進行表</span>
                  </h3>

                  <div className="space-y-2.5">
                    {currentDailySchedule.timeline.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-stone-50 hover:bg-emerald-50/40 rounded-xl border border-stone-200/80 transition-colors gap-2"
                      >
                        <div className="flex items-start sm:items-center gap-3">
                          <span className="px-2.5 py-1 text-xs font-mono font-bold bg-white text-emerald-950 rounded-md border border-stone-200 shrink-0 shadow-2xs">
                            {item.time}
                          </span>
                          <span className="text-sm font-semibold text-stone-900">
                            {item.activity}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-stone-500 pl-2 sm:pl-0 flex-wrap">
                          {item.location && item.location !== '-' && (
                            <span className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-stone-200">
                              <MapPin className="w-3 h-3 text-emerald-700" />
                              {item.location}
                            </span>
                          )}
                          {item.leader && (
                            <span className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-stone-200 text-stone-700 font-medium">
                              <User className="w-3 h-3 text-stone-400" />
                              {item.leader}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : currentDailySchedule.type !== 'off' ? (
                <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-500">
                  タイムテーブルは通常の日程（放課後音出し・基礎合奏・パート練習）に従います。
                </div>
              ) : null}
            </div>

            {/* USER REQUIREMENT ②: 出欠状況の反映（その日の練習詳細の下部） */}
            <div className="border-t border-stone-200 bg-stone-50/80 p-5 sm:p-6">
              {(() => {
                const dayAttendance = getAttendanceForDate(currentDailySchedule.date);
                const absent = dayAttendance.filter((a) => a.status === 'absent');
                const late = dayAttendance.filter((a) => a.status === 'late');
                const early = dayAttendance.filter((a) => a.status === 'early_leave');

                return (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 bg-emerald-100 text-emerald-900 rounded-lg shrink-0">
                          <Users className="w-4 h-4 text-emerald-700" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-stone-900">
                              {currentDailySchedule.date === todayStr ? '本日の出欠状況' : `${currentDailySchedule.date} の出欠状況`}（Googleフォーム集計連動）
                            </h4>
                            {attendanceSyncStatus?.isSyncing ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                                <RefreshCw className="w-3 h-3 animate-spin text-amber-700" />
                                フォーム最新データ読込中...
                              </span>
                            ) : attendanceSyncStatus?.lastSyncedAt ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                                <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                                自動読込済 ({attendanceSyncStatus.lastSyncedAt} 更新)
                              </span>
                            ) : null}
                          </div>
                          <p className="text-xs text-stone-500">
                            アプリを開いた際にGoogleフォーム最新回答を自動読込して反映します
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {onRefreshAttendance && (
                          <button
                            onClick={onRefreshAttendance}
                            disabled={attendanceSyncStatus?.isSyncing}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-semibold shadow-2xs transition-colors disabled:opacity-60"
                            title="Googleフォーム最新の出欠を再読込"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 text-emerald-700 ${attendanceSyncStatus?.isSyncing ? 'animate-spin' : ''}`} />
                            <span>{attendanceSyncStatus?.isSyncing ? '読込中...' : '出欠を再読込'}</span>
                          </button>
                        )}
                        {onOpenAttendanceTab && (
                          <button
                            onClick={onOpenAttendanceTab}
                            className="text-xs text-amber-700 hover:text-amber-800 font-semibold hover:underline"
                          >
                            出欠台帳を開く &rarr;
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Quick counters */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 bg-white rounded-xl border border-stone-200 text-center shadow-2xs">
                        <span className="text-[11px] font-semibold text-stone-500 block">欠席</span>
                        <span
                          className={`text-lg font-black ${
                            absent.length > 0 ? 'text-rose-600' : 'text-stone-700'
                          }`}
                        >
                          {absent.length} 名
                        </span>
                      </div>
                      <div className="p-3 bg-white rounded-xl border border-stone-200 text-center shadow-2xs">
                        <span className="text-[11px] font-semibold text-stone-500 block">遅刻</span>
                        <span
                          className={`text-lg font-black ${
                            late.length > 0 ? 'text-amber-600' : 'text-stone-700'
                          }`}
                        >
                          {late.length} 名
                        </span>
                      </div>
                      <div className="p-3 bg-white rounded-xl border border-stone-200 text-center shadow-2xs">
                        <span className="text-[11px] font-semibold text-stone-500 block">早退</span>
                        <span
                          className={`text-lg font-black ${
                            early.length > 0 ? 'text-blue-600' : 'text-stone-700'
                          }`}
                        >
                          {early.length} 名
                        </span>
                      </div>
                    </div>

                    {/* Member details list for this day */}
                    {dayAttendance.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        {dayAttendance.map((rec) => (
                          <div
                            key={rec.id}
                            className="bg-white p-3 rounded-xl border border-stone-200 shadow-2xs text-xs"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                                    rec.status === 'absent'
                                      ? 'bg-rose-100 text-rose-800'
                                      : rec.status === 'late'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-blue-100 text-blue-800'
                                  }`}
                                >
                                  {rec.status === 'absent'
                                    ? '欠席'
                                    : rec.status === 'late'
                                    ? '遅刻'
                                    : '早退'}
                                </span>
                                <span className="font-bold text-stone-900">{rec.studentName}</span>
                                <span className="text-stone-500">
                                  ({rec.grade}{rec.classGroup ? ` ${rec.classGroup}` : ''} / {rec.part})
                                </span>
                              </div>
                              <p className="text-stone-600">
                                <span className="text-stone-400">理由:</span> {rec.reason}
                              </p>
                              {rec.notes && (
                                <p className="text-stone-500 text-[11px]">
                                  <span className="text-stone-400">連絡:</span> {rec.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200/60 text-xs text-emerald-800 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>本日の欠席・遅刻・早退の届出はありません（全員出席予定です）。</span>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: その週の大まかな日程（月曜スタート〜日曜終わり、過去日は薄いグレー塗りつぶし） */}
      {activeSubTab === 'weekly' && (
        <div className="space-y-4">
          {/* Week Info & Navigation Header */}
          <div className="bg-white border border-stone-200 p-4 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
                <CalendarRange className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-stone-900 text-sm sm:text-base">
                    吹奏楽部 週間予定（月曜〜日曜の1週間）
                  </h3>
                  <span className="px-2.5 py-0.5 text-xs font-mono font-bold bg-stone-100 text-stone-800 rounded-lg border border-stone-200">
                    {weekStartStr} 〜 {weekEndStr}
                  </span>
                </div>
                <p className="text-xs text-stone-500 mt-0.5">
                  「その日の練習詳細」で選択中の日付（{selectedDate}）が含まれる週を表示中。タップすると該当日の詳細へ移動します。
                </p>
              </div>
            </div>

            {/* Week Steppers & Back to Current Week */}
            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              <button
                onClick={() => handleWeekShift(-7)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl border border-stone-300/80 transition-colors"
                title="前の週（7日前）へ"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>前週</span>
              </button>

              {!isCurrentWeek && (
                <button
                  onClick={() => setSelectedDate(todayStr)}
                  className="px-3 py-1.5 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded-xl border border-emerald-300 transition-colors"
                >
                  今週へ
                </button>
              )}

              <button
                onClick={() => handleWeekShift(7)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl border border-stone-300/80 transition-colors"
                title="次の週（7日後）へ"
              >
                <span>次週</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* USER REQUIREMENT: 月曜スタートで日曜終わりの1週間を表示。過ぎた日は薄いグレーで塗りつぶし */}
          <div className="space-y-3">
            {weekDays.map((day) => {
              const sch = day.sch;
              const dayAttendance = getAttendanceForDate(day.date);
              const absent = dayAttendance.filter((a) => a.status === 'absent');
              const late = dayAttendance.filter((a) => a.status === 'late');
              const early = dayAttendance.filter((a) => a.status === 'early_leave');

              // 過ぎた日は薄いグレーで塗りつぶし
              const cardBg = day.isPast
                ? 'bg-stone-100/90 border-stone-300/80 text-stone-600 hover:bg-stone-200/50'
                : day.isToday
                ? 'bg-emerald-50/40 border-emerald-500 ring-2 ring-emerald-500/30 shadow-xs'
                : day.isSelected
                ? 'bg-white border-emerald-400 ring-2 ring-emerald-400/20 shadow-xs'
                : 'bg-white border-stone-200 hover:border-emerald-500 hover:shadow-xs';

              return (
                <div
                  key={day.date}
                  onClick={() => {
                    setSelectedDate(day.date);
                    setActiveSubTab('daily');
                  }}
                  className={`rounded-2xl border transition-all cursor-pointer p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 group relative ${cardBg}`}
                >
                  {/* Left Column: Date, Day, Badges */}
                  <div className="flex items-start sm:items-center gap-3.5 min-w-[130px]">
                    <div
                      className={`text-center px-3 py-2 rounded-xl border font-mono shrink-0 ${
                        day.isPast
                          ? 'bg-stone-200/90 border-stone-300 text-stone-500'
                          : day.isToday
                          ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                          : day.dayOfWeek === '日'
                          ? 'bg-rose-50 border-rose-200 text-rose-700'
                          : day.dayOfWeek === '土'
                          ? 'bg-blue-50 border-blue-200 text-blue-700'
                          : 'bg-stone-50 border-stone-200 text-stone-900'
                      }`}
                    >
                      <div className="text-xs font-semibold leading-none">
                        {day.date.slice(5, 7)}月
                      </div>
                      <div className="text-xl font-black leading-tight mt-0.5">
                        {day.date.slice(8, 10)}
                      </div>
                      <div className="text-[11px] font-bold">({day.dayOfWeek})</div>
                    </div>

                    {/* Mobile top meta */}
                    <div className="space-y-1 sm:hidden flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {day.isPast && (
                          <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-stone-200 text-stone-600 rounded border border-stone-300">
                            終了
                          </span>
                        )}
                        {day.isToday && (
                          <span className="px-2 py-0.5 text-[10px] font-extrabold bg-emerald-600 text-white rounded-full shadow-2xs">
                            本日
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded border ${
                            day.isPast
                              ? 'bg-stone-200/80 text-stone-600 border-stone-300'
                              : sch?.event
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : sch
                              ? getTypeBadge(sch.type).bg
                              : 'bg-stone-100 text-stone-600 border-stone-300'
                          }`}
                        >
                          {sch?.event?.trim() || (sch?.type === 'off' ? '部活動オフ' : '通常練習')}
                        </span>
                      </div>
                      <div
                        className={`text-xs font-mono font-bold flex items-center gap-1 ${
                          day.isPast ? 'text-stone-500' : 'text-emerald-950'
                        }`}
                      >
                        <Clock className={`w-3.5 h-3.5 ${day.isPast ? 'text-stone-400' : 'text-emerald-700'}`} />
                        <span>
                          {sch?.type === 'off'
                            ? '休養日'
                            : sch?.startTime && sch?.endTime
                            ? `${sch.startTime} 〜 ${sch.endTime}`
                            : sch?.startTime || '時間未定'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Middle Column: Details (DB_Schedule_2026 format: Event, Times, Rooms, Training, Goals, Notes) */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    {/* Desktop header row */}
                    <div className="hidden sm:flex items-center gap-2 flex-wrap">
                      {day.isPast && (
                        <span className="px-2 py-0.5 text-[10px] font-semibold bg-stone-200 text-stone-600 rounded border border-stone-300">
                          終了
                        </span>
                      )}
                      {day.isToday && (
                        <span className="px-2 py-0.5 text-[10px] font-extrabold bg-emerald-600 text-white rounded-full shadow-2xs">
                          本日
                        </span>
                      )}
                      {day.isSelected && !day.isToday && !day.isPast && (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-900 rounded border border-emerald-300">
                          選択中
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded border ${
                          day.isPast
                            ? 'bg-stone-200/80 text-stone-600 border-stone-300'
                            : sch?.event
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : sch
                            ? getTypeBadge(sch.type).bg
                            : 'bg-stone-100 text-stone-600 border-stone-300'
                        }`}
                      >
                        {sch?.event?.trim() || (sch?.type === 'off' ? '部活動オフ' : '通常練習')}
                      </span>
                      <span
                        className={`text-xs font-mono font-bold flex items-center gap-1 ${
                          day.isPast ? 'text-stone-500' : 'text-emerald-950'
                        }`}
                      >
                        <Clock className={`w-3.5 h-3.5 ${day.isPast ? 'text-stone-400' : 'text-emerald-700'}`} />
                        <span>
                          {sch?.type === 'off'
                            ? '休養日'
                            : sch?.startTime && sch?.endTime
                            ? `${sch.startTime} 〜 ${sch.endTime}`
                            : sch?.startTime || '時間未定'}
                        </span>
                      </span>
                    </div>

                    <h4
                      className={`font-bold text-sm sm:text-base transition-colors ${
                        day.isPast
                          ? 'text-stone-700'
                          : 'text-stone-900 group-hover:text-emerald-800'
                      }`}
                    >
                      {sch?.event || sch?.title || (sch?.type === 'off' ? '部活動オフ' : '放課後練習')}
                    </h4>

                    {/* Meta items: Available rooms, Training grades, Supervisors */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                      <div
                        className={`flex items-center gap-1 font-medium ${
                          day.isPast ? 'text-stone-500' : 'text-stone-700'
                        }`}
                      >
                        <MapPin className={`w-3.5 h-3.5 shrink-0 ${day.isPast ? 'text-stone-400' : 'text-emerald-700'}`} />
                        <span>
                          教室: {sch?.availableRooms || sch?.location || (sch?.type === 'off' ? 'なし' : '教室指定なし')}
                        </span>
                      </div>

                      <div
                        className={`flex items-center gap-1 font-medium ${
                          day.isPast ? 'text-stone-500' : 'text-stone-700'
                        }`}
                      >
                        <GraduationCap className={`w-3.5 h-3.5 shrink-0 ${day.isPast ? 'text-stone-400' : 'text-emerald-700'}`} />
                        <span>
                          講習: {sch?.trainingGrades && sch.trainingGrades.length > 0 ? sch.trainingGrades.join('、') : 'なし'}
                        </span>
                      </div>

                      {(() => {
                        const adv = getAdvisorStatus(sch);
                        if (!adv) return null;
                        return (
                          <div
                            className={`flex items-center gap-1 font-medium ${
                              day.isPast ? 'text-stone-400' : 'text-stone-700'
                            }`}
                          >
                            <User className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                            <span>顧問:</span>
                            <span className="font-mono flex items-center gap-1">
                              {adv.matsu && (
                                <span
                                  className={`px-1 py-0.2 rounded text-[11px] font-bold ${
                                    adv.matsu === '〇'
                                      ? 'text-emerald-700 bg-emerald-50 border border-emerald-200/80'
                                      : 'text-rose-700 bg-rose-50 border border-rose-200/80'
                                  }`}
                                >
                                  松:{adv.matsu}
                                </span>
                              )}
                              {adv.tobi && (
                                <span
                                  className={`px-1 py-0.2 rounded text-[11px] font-bold ${
                                    adv.tobi === '〇'
                                      ? 'text-emerald-700 bg-emerald-50 border border-emerald-200/80'
                                      : 'text-rose-700 bg-rose-50 border border-rose-200/80'
                                  }`}
                                >
                                  飛:{adv.tobi}
                                </span>
                              )}
                            </span>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Goal or notes summary if present */}
                    {(sch?.weeklyGoal || sch?.notes) && (
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-0.5 text-xs">
                        {sch?.weeklyGoal && (
                          <div
                            className={`flex items-center gap-1.5 ${
                              day.isPast ? 'text-stone-500' : 'text-emerald-950 font-medium'
                            }`}
                          >
                            <CheckCircle2 className={`w-3 h-3 shrink-0 ${day.isPast ? 'text-stone-400' : 'text-emerald-600'}`} />
                            <span className="truncate max-w-xs sm:max-w-md">目標: {sch.weeklyGoal}</span>
                          </div>
                        )}
                        {sch?.notes && (
                          <div className={`flex items-center gap-1.5 ${day.isPast ? 'text-stone-400' : 'text-stone-600'}`}>
                            <Info className="w-3 h-3 text-stone-400 shrink-0" />
                            <span className="truncate max-w-xs sm:max-w-md">連絡: {sch.notes}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Attendance Status & Jump prompt */}
                  <div className="flex items-center justify-between sm:flex-col sm:items-end sm:justify-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-200/60 min-w-[120px]">
                    {/* Attendance summary pill */}
                    <div>
                      {dayAttendance.length > 0 ? (
                        <div className="flex items-center gap-1">
                          {absent.length > 0 && (
                            <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 font-bold rounded text-[10px]">
                              欠{absent.length}
                            </span>
                          )}
                          {late.length > 0 && (
                            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 font-semibold rounded text-[10px]">
                              遅{late.length}
                            </span>
                          )}
                          {early.length > 0 && (
                            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 font-semibold rounded text-[10px]">
                              早{early.length}
                            </span>
                          )}
                        </div>
                      ) : sch?.type !== 'off' ? (
                        <span
                          className={`font-medium text-[11px] px-2 py-0.5 rounded-full border ${
                            day.isPast
                              ? 'bg-stone-200/70 text-stone-600 border-stone-300'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          全員出席
                        </span>
                      ) : (
                        <span className="text-stone-400 text-[11px]">休養日</span>
                      )}
                    </div>

                    {/* Jump arrow */}
                    <div
                      className={`flex items-center gap-1 text-xs font-bold transition-transform ${
                        day.isPast
                          ? 'text-stone-500 group-hover:text-stone-700'
                          : 'text-emerald-800 group-hover:translate-x-1'
                      }`}
                    >
                      <span>詳細を見る</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUBTAB 3: その月の練習日と練習時間（月間カレンダー） */}
      {activeSubTab === 'monthly' && (
        <MonthlyCalendarView
          schedules={schedules}
          attendanceRecords={attendanceRecords}
          todayStr={todayStr}
          selectedDate={selectedDate}
          onSelectDate={(date) => {
            setSelectedDate(date);
            setActiveSubTab('daily');
          }}
          getTypeBadge={getTypeBadge}
        />
      )}

      {/* Spreadsheet Sync Modal */}
      <SpreadsheetSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        title="練習予定スプレッドシート（DB_Schedule_2026）の反映"
        dataTypeName="練習予定データ"
        defaultUrl={scheduleSpreadsheetUrl || DEFAULT_SCHEDULE_SPREADSHEET_URL}
        onUrlSave={onSaveScheduleSpreadsheetUrl}
        onImportCSV={handleImportSchedules}
        onExportCSV={handleExportCSV}
        sampleHeaders={[
          '日付',
          '曜日',
          '開始',
          '終了',
          '行事',
          '練習詳細',
          '今週の重点目標',
          '連絡事項',
          '使用可能教室',
          '1年講習',
          '2年講習',
          '3年講習',
          '松',
          '飛',
        ]}
        sampleRows={[
          [
            '2026/9/17',
            '木',
            '15:40',
            '18:30',
            '',
            '15:40 ミーティング\n15:50 個人基礎\n16:00 セクション練習\n17:00 レク\n18:30 ミーティング',
            'ユニゾンを合わせる',
            '風邪引かない',
            '音楽室、会議室',
            '○',
            '○',
            '×',
            '○',
            '○',
          ],
        ]}
      />
    </div>
  );
};
