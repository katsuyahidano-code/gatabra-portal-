import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Table as TableIcon,
  ArrowRight,
  Info,
} from 'lucide-react';
import { PracticeSchedule, AttendanceRecord, PracticeType } from '../types';

interface MonthlyCalendarViewProps {
  schedules: PracticeSchedule[];
  attendanceRecords: AttendanceRecord[];
  todayStr: string;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  getTypeBadge?: (type: PracticeType) => { label: string; bg: string };
}

export const MonthlyCalendarView: React.FC<MonthlyCalendarViewProps> = ({
  schedules,
  attendanceRecords,
  todayStr,
  selectedDate,
  onSelectDate,
}) => {
  // Calendar viewing state: Year & Month (dynamically derived from todayStr)
  const [initY, initM] = todayStr
    ? todayStr.split('-').map(Number)
    : [new Date().getFullYear(), new Date().getMonth() + 1];
  const [currentYear, setCurrentYear] = useState<number>(initY || new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(initM || new Date().getMonth() + 1); // 1-12
  const [viewMode, setViewMode] = useState<'calendar' | 'table'>('calendar');

  // Month navigation
  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentYear((y) => y - 1);
      setCurrentMonth(12);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentYear((y) => y + 1);
      setCurrentMonth(1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleGoToday = () => {
    const [y, m] = todayStr.split('-').map(Number);
    setCurrentYear(y || new Date().getFullYear());
    setCurrentMonth(m || new Date().getMonth() + 1);
    onSelectDate(todayStr);
  };

  const monthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

  // Helper to determine if a schedule has valid start and end times (開始と終了のところに時間が入っている日)
  const isValidTime = (t?: string) => {
    if (!t) return false;
    const s = t.trim();
    return s !== '' && s !== '-' && s !== 'ー';
  };

  const hasScheduleTime = (sch?: PracticeSchedule) => {
    if (!sch || sch.type === 'off') return false;
    return isValidTime(sch.startTime) && isValidTime(sch.endTime);
  };

  // Helper to extract advisor status (松・飛: 〇・✕)
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

  // Filter schedules for current month
  const monthSchedules = schedules.filter((s) => s.date.startsWith(monthStr));

  // Generate calendar grid days
  // First day of month (0 = Sun, 1 = Mon, ..., 6 = Sat)
  const firstDayOfWeek = new Date(currentYear, currentMonth - 1, 1).getDay();
  const daysInCurrentMonth = new Date(currentYear, currentMonth, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonth - 1, 0).getDate();

  // Compute metrics for current month based on actual scheduled times
  const totalPracticeDays = monthSchedules.filter((s) => hasScheduleTime(s)).length;
  const totalOffDays = Math.max(0, daysInCurrentMonth - totalPracticeDays);

  // Compute total practice hours accurately
  const totalHours = monthSchedules.reduce((acc, sch) => {
    if (!hasScheduleTime(sch)) return acc;
    const [sh, sm] = sch.startTime.split(':').map(Number);
    const [eh, em] = sch.endTime.split(':').map(Number);
    if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return acc;
    const diff = (eh * 60 + em) - (sh * 60 + sm);
    return diff > 0 ? acc + diff / 60 : acc;
  }, 0);

  interface CalendarDay {
    dateStr: string;
    dayNumber: number;
    isCurrentMonth: boolean;
    dayOfWeek: number; // 0..6
    schedule?: PracticeSchedule;
    attendance: AttendanceRecord[];
  }

  const calendarDays: CalendarDay[] = [];

  // 1. Leading days from previous month
  const prevMonthNum = currentMonth === 1 ? 12 : currentMonth - 1;
  const prevYearNum = currentMonth === 1 ? currentYear - 1 : currentYear;
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const dateStr = `${prevYearNum}-${String(prevMonthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    calendarDays.push({
      dateStr,
      dayNumber: day,
      isCurrentMonth: false,
      dayOfWeek: new Date(prevYearNum, prevMonthNum - 1, day).getDay(),
      schedule: schedules.find((s) => s.date === dateStr),
      attendance: attendanceRecords.filter((a) => a.date === dateStr),
    });
  }

  // 2. Days of current month
  for (let day = 1; day <= daysInCurrentMonth; day++) {
    const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    calendarDays.push({
      dateStr,
      dayNumber: day,
      isCurrentMonth: true,
      dayOfWeek: new Date(currentYear, currentMonth - 1, day).getDay(),
      schedule: schedules.find((s) => s.date === dateStr),
      attendance: attendanceRecords.filter((a) => a.date === dateStr),
    });
  }

  // 3. Trailing days from next month to fill grid (multiples of 7)
  const remainingCells = (7 - (calendarDays.length % 7)) % 7;
  const nextMonthNum = currentMonth === 12 ? 1 : currentMonth + 1;
  const nextYearNum = currentMonth === 12 ? currentYear + 1 : currentYear;
  for (let day = 1; day <= remainingCells; day++) {
    const dateStr = `${nextYearNum}-${String(nextMonthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    calendarDays.push({
      dateStr,
      dayNumber: day,
      isCurrentMonth: false,
      dayOfWeek: new Date(nextYearNum, nextMonthNum - 1, day).getDay(),
      schedule: schedules.find((s) => s.date === dateStr),
      attendance: attendanceRecords.filter((a) => a.date === dateStr),
    });
  }

  const weekDayHeaders = [
    { label: '日', color: 'text-rose-600 bg-rose-50/50' },
    { label: '月', color: 'text-stone-700' },
    { label: '火', color: 'text-stone-700' },
    { label: '水', color: 'text-stone-700' },
    { label: '木', color: 'text-stone-700' },
    { label: '金', color: 'text-stone-700' },
    { label: '土', color: 'text-blue-600 bg-blue-50/50' },
  ];

  return (
    <div className="space-y-6">
      {/* Month Metrics Summary */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-2xs">
          <span className="text-xs font-semibold text-stone-500">
            {currentMonth}月の練習日数
          </span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-stone-900">{totalPracticeDays}</span>
            <span className="text-xs text-stone-500">日</span>
          </div>
          <p className="text-[11px] text-emerald-700 font-medium mt-1">開始・終了時間あり</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-2xs">
          <span className="text-xs font-semibold text-stone-500">休み（オフ）</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-rose-600">{totalOffDays}</span>
            <span className="text-xs text-stone-500">日</span>
          </div>
          <p className="text-[11px] text-stone-400 mt-1">時間設定なし・休養日</p>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-2xs">
          <span className="text-xs font-semibold text-stone-500">総練習時間（実働）</span>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-stone-900">
              {totalHours > 0 ? `${totalHours.toFixed(1)}` : '0'}
            </span>
            <span className="text-xs text-stone-500">時間</span>
          </div>
          <p className="text-[11px] text-stone-400 mt-1">実働時間合計</p>
        </div>
      </div>

      {/* Calendar Header Bar */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Navigation */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-white text-stone-700 rounded-lg transition-colors"
              title="前月へ"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-sm font-bold text-stone-900 min-w-[110px] text-center font-mono">
              {currentYear}年 {currentMonth}月
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-white text-stone-700 rounded-lg transition-colors"
              title="次月へ"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleGoToday}
            className="px-3 py-1.5 text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors"
          >
            今月へ戻る
          </button>
        </div>

        {/* View Mode Toggle & Guide */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-1.5 text-xs bg-emerald-50/70 text-emerald-950 border border-emerald-200 px-3 py-1.5 rounded-xl">
            <Info className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span>日付を押すと、その日の練習詳細・出欠にジャンプします</span>
          </div>

          <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl border border-stone-200">
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'calendar'
                  ? 'bg-white text-emerald-950 shadow-2xs font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 text-emerald-700" />
              <span>カレンダー</span>
            </button>

            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'table'
                  ? 'bg-white text-emerald-950 shadow-2xs font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5 text-emerald-700" />
              <span>一覧リスト</span>
            </button>
          </div>
        </div>
      </div>

      {/* VIEW 1: MONTHLY CALENDAR GRID */}
      {viewMode === 'calendar' && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
          {/* Weekday Header Row */}
          <div className="grid grid-cols-7 border-b border-stone-200 bg-stone-50/80 text-xs font-bold text-center">
            {weekDayHeaders.map((h, idx) => (
              <div
                key={idx}
                className={`py-2.5 px-1 border-r last:border-r-0 border-stone-200 ${h.color}`}
              >
                {h.label}
              </div>
            ))}
          </div>

          {/* Days Grid: USER REQUIREMENT - 時間が入っている日は時間を表示し、何もないところは「休み」、出欠席状況のみ表示 */}
          <div className="grid grid-cols-7 divide-x divide-y divide-stone-200">
            {calendarDays.map((cell) => {
              const isToday = cell.dateStr === todayStr;
              const isSelected = cell.dateStr === selectedDate;
              const sch = cell.schedule;
              const absent = cell.attendance.filter((a) => a.status === 'absent');
              const late = cell.attendance.filter((a) => a.status === 'late');
              const early = cell.attendance.filter((a) => a.status === 'early_leave');

              const hasTime = hasScheduleTime(sch);
              const advisor = getAdvisorStatus(sch);

              // Determine Day Number Color
              const dayColor = !cell.isCurrentMonth
                ? 'text-stone-300'
                : cell.dayOfWeek === 0
                ? 'text-rose-600'
                : cell.dayOfWeek === 6
                ? 'text-blue-600'
                : 'text-stone-900';

              return (
                <div
                  key={cell.dateStr}
                  onClick={() => onSelectDate(cell.dateStr)}
                  className={`min-h-[94px] sm:min-h-[105px] p-2 transition-all flex flex-col justify-between group cursor-pointer relative ${
                    !cell.isCurrentMonth
                      ? 'bg-stone-50/40 opacity-60 hover:opacity-100 hover:bg-stone-50'
                      : isToday
                      ? 'bg-emerald-50/40 ring-2 ring-inset ring-emerald-500'
                      : isSelected
                      ? 'bg-stone-50/80 ring-1 ring-inset ring-stone-300'
                      : 'bg-white hover:bg-emerald-50/20'
                  }`}
                >
                  {/* Top Bar: Date & Event badge (行事がある日だけ出力) & Today Badge */}
                  <div className="flex items-center justify-between gap-1 min-w-0">
                    <div className="flex items-center gap-1 min-w-0 flex-1">
                      <span className={`font-mono text-xs sm:text-sm font-bold shrink-0 ${dayColor}`}>
                        {cell.dayNumber}
                      </span>
                      {sch?.event && sch.event.trim() !== '' && (
                        <span
                          className="truncate text-[9px] sm:text-[10px] font-bold text-amber-900 bg-amber-100/90 px-1 py-0.2 rounded border border-amber-200/90 max-w-[65px] sm:max-w-[85px]"
                          title={sch.event}
                        >
                          {sch.event}
                        </span>
                      )}
                    </div>

                    {isToday && (
                      <span className="px-1.5 py-0.2 text-[9px] font-extrabold bg-emerald-600 text-white rounded-full shadow-2xs shrink-0">
                        今日
                      </span>
                    )}
                  </div>

                  {/* Middle: Practice Time (開始〜終了) OR 休み */}
                  <div className="my-1">
                    {hasTime && sch ? (
                      <div className="flex items-center justify-center gap-1 px-1.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-950 border border-emerald-200/80 font-mono text-[10px] sm:text-[11px] font-bold shadow-2xs">
                        <Clock className="w-3 h-3 text-emerald-700 shrink-0" />
                        <span className="truncate">
                          {sch.startTime}〜{sch.endTime}
                        </span>
                      </div>
                    ) : (
                      <div className="py-0.5 px-1.5 rounded-lg bg-stone-100 text-stone-500 text-[10px] sm:text-[11px] font-medium text-center border border-stone-200/70">
                        休み
                      </div>
                    )}
                  </div>

                  {/* Advisor Status: 松・飛の〇✕ */}
                  {advisor && (
                    <div className="flex items-center justify-center gap-1 text-[9px] sm:text-[10px] font-mono leading-none my-0.5">
                      {advisor.matsu && (
                        <span
                          className={`px-1 py-0.2 rounded font-bold ${
                            advisor.matsu === '〇'
                              ? 'text-emerald-700 bg-emerald-50 border border-emerald-200/70'
                              : 'text-rose-700 bg-rose-50 border border-rose-200/70'
                          }`}
                        >
                          松:{advisor.matsu}
                        </span>
                      )}
                      {advisor.tobi && (
                        <span
                          className={`px-1 py-0.2 rounded font-bold ${
                            advisor.tobi === '〇'
                              ? 'text-emerald-700 bg-emerald-50 border border-emerald-200/70'
                              : 'text-rose-700 bg-rose-50 border border-rose-200/70'
                          }`}
                        >
                          飛:{advisor.tobi}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Bottom: Attendance Status */}
                  <div className="pt-1 border-t border-stone-100/80 flex items-center justify-between text-[9px]">
                    {cell.attendance.length > 0 ? (
                      <div className="flex items-center gap-0.5 flex-wrap">
                        {absent.length > 0 && (
                          <span className="px-1 py-0.2 bg-rose-100 text-rose-700 font-bold rounded">
                            欠{absent.length}
                          </span>
                        )}
                        {late.length > 0 && (
                          <span className="px-1 py-0.2 bg-amber-100 text-amber-800 font-bold rounded">
                            遅{late.length}
                          </span>
                        )}
                        {early.length > 0 && (
                          <span className="px-1 py-0.2 bg-blue-100 text-blue-800 font-bold rounded">
                            早{early.length}
                          </span>
                        )}
                      </div>
                    ) : hasTime ? (
                      <span className="text-emerald-700 font-medium text-[9px]">
                        全員出席
                      </span>
                    ) : (
                      <span />
                    )}

                    <div className="text-emerald-800 opacity-0 group-hover:opacity-100 transition-opacity font-bold flex items-center gap-0.5 ml-auto text-[9px]">
                      <span>詳細</span>
                      <ArrowRight className="w-2.5 h-2.5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: MONTHLY TABLE VIEW */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-stone-100 flex items-center justify-between">
            <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-emerald-700" />
              <span>
                {currentYear}年 {currentMonth}月 練習予定一覧リスト
              </span>
            </h3>
            <span className="text-xs text-stone-500">
              タップするとその日の練習詳細にジャンプします
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-600 font-semibold border-b border-stone-200">
                <tr>
                  <th className="py-3 px-4">日付</th>
                  <th className="py-3 px-4">練習時間</th>
                  <th className="py-3 px-4">顧問</th>
                  <th className="py-3 px-4">出欠状況</th>
                  <th className="py-3 px-4 text-right">詳細</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {monthSchedules.map((sch) => {
                  const dayAttendance = attendanceRecords.filter((a) => a.date === sch.date);
                  const isToday = sch.date === todayStr;
                  const hasTime = hasScheduleTime(sch);
                  const advisor = getAdvisorStatus(sch);
                  const absent = dayAttendance.filter((a) => a.status === 'absent');
                  const late = dayAttendance.filter((a) => a.status === 'late');
                  const early = dayAttendance.filter((a) => a.status === 'early_leave');

                  return (
                    <tr
                      key={sch.id}
                      onClick={() => onSelectDate(sch.date)}
                      className={`hover:bg-emerald-50/40 cursor-pointer transition-colors ${
                        isToday ? 'bg-emerald-50/70 font-semibold' : ''
                      }`}
                    >
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-mono">{sch.date}</span>
                        <span
                          className={`ml-1 font-bold ${
                            sch.dayOfWeek === '日'
                              ? 'text-rose-600'
                              : sch.dayOfWeek === '土'
                              ? 'text-blue-600'
                              : 'text-stone-700'
                          }`}
                        >
                          ({sch.dayOfWeek})
                        </span>
                        {sch.event && sch.event.trim() !== '' && (
                          <span className="ml-1.5 px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded font-bold text-[10px] border border-amber-300">
                            {sch.event}
                          </span>
                        )}
                        {isToday && (
                          <span className="ml-2 px-1.5 py-0.2 bg-emerald-600 text-white font-bold rounded text-[10px]">
                            本日
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono">
                        {hasTime ? (
                          <span className="font-bold text-emerald-950 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-emerald-700" />
                            <span>{sch.startTime} 〜 {sch.endTime}</span>
                          </span>
                        ) : (
                          <span className="text-stone-500 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                            休み
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px]">
                        {advisor ? (
                          <div className="flex items-center gap-1.5">
                            {advisor.matsu && (
                              <span
                                className={`px-1.5 py-0.5 rounded font-bold ${
                                  advisor.matsu === '〇'
                                    ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                                    : 'text-rose-700 bg-rose-50 border border-rose-200'
                                }`}
                              >
                                松:{advisor.matsu}
                              </span>
                            )}
                            {advisor.tobi && (
                              <span
                                className={`px-1.5 py-0.5 rounded font-bold ${
                                  advisor.tobi === '〇'
                                    ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                                    : 'text-rose-700 bg-rose-50 border border-rose-200'
                                }`}
                              >
                                飛:{advisor.tobi}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-stone-300">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
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
                        ) : hasTime ? (
                          <span className="text-emerald-700 font-medium">全員出席</span>
                        ) : (
                          <span className="text-stone-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-emerald-800 font-bold hover:underline inline-flex items-center gap-0.5">
                          詳細 <ArrowRight className="w-3 h-3" />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
