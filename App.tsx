import React, { useState, useEffect, useCallback } from 'react';
import {
  INITIAL_SCHEDULES,
  INITIAL_ATTENDANCE,
  INITIAL_LOADING_ITEMS,
  INITIAL_SCORES,
} from './data/initialData';
import {
  PracticeSchedule,
  AttendanceRecord,
  LoadingItem,
  MusicScore,
  YearlyGoalsData,
} from './types';
import {
  DEFAULT_YEARLY_GOALS,
  fetchSpreadsheetCSV,
  parseGoalsFromCSV,
  parseSchedulesFromCSV,
  parseAttendanceFromCSV,
  parseLoadingItemsFromCSV,
  DEFAULT_SCHEDULE_SPREADSHEET_URL,
  DEFAULT_ATTENDANCE_SPREADSHEET_URL,
  DEFAULT_TRUCK_SPREADSHEET_URL,
} from './utils/spreadsheetSync';
import { Header, MainTab } from './components/Header';
import { BottomNav, BottomNavTab } from './components/BottomNav';
import { ScheduleView } from './components/ScheduleView';
import { AttendanceView } from './components/AttendanceView';
import { LoadingListView } from './components/LoadingListView';
import { InstrumentAdvisor } from './components/InstrumentAdvisor';
import { MusicTermsAdvisor } from './components/MusicTermsAdvisor';
import { ScoreInventoryView } from './components/ScoreInventoryView';
import { MoreMenuView } from './components/MoreMenuView';
import { AttendanceReportModal } from './components/AttendanceReportModal';
import { YearlyGoalsBanner } from './components/YearlyGoalsBanner';
import { getTodayStr } from './utils/dateUtils';
import { ChevronLeft, RotateCcw } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<BottomNavTab>('home');
  const [isAttendanceReportModalOpen, setIsAttendanceReportModalOpen] = useState(false);

  // Yearly goals & event countdowns state with localStorage
  const [yearlyGoals, setYearlyGoals] = useState<YearlyGoalsData>(() => {
    const saved = localStorage.getItem('gatabra_yearly_goals');
    return saved ? JSON.parse(saved) : DEFAULT_YEARLY_GOALS;
  });

  // Schedules state with localStorage (smart fallback and migration to full year)
  const [schedules, setSchedules] = useState<PracticeSchedule[]>(() => {
    const saved =
      localStorage.getItem('gatabra_schedules_v3') ||
      localStorage.getItem('gatabra_schedules_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Check if stored records contains full schedule (Nov 2026 data present)
          const hasNov = parsed.some((s: any) => s.date === '2026-11-10');
          if (!hasNov || parsed.length < 300) {
            const merged = [...INITIAL_SCHEDULES];
            for (const item of parsed) {
              const idx = merged.findIndex((s) => s.date === item.date);
              if (idx >= 0) {
                merged[idx] = { ...merged[idx], ...item };
              } else {
                merged.push(item);
              }
            }
            return merged.sort((a, b) => a.date.localeCompare(b.date));
          }
          return parsed;
        }
      } catch (e) {}
    }
    return INITIAL_SCHEDULES;
  });

  // Attendance state with localStorage (smart fallback and migration)
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() => {
    const saved =
      localStorage.getItem('gatabra_attendance_v3') ||
      localStorage.getItem('gatabra_attendance_v2');
    if (saved) {
      try {
        const records = JSON.parse(saved);
        if (Array.isArray(records) && records.length > 0) {
          // If stored records do not contain latest October 2026 data, merge with pre-seeded INITIAL_ATTENDANCE
          const hasOctober = records.some((r: any) => r.date === '2026-10-02');
          if (!hasOctober) {
            const combined = [...INITIAL_ATTENDANCE, ...records];
            const uniqueMap = new Map<string, AttendanceRecord>();
            for (const rec of combined) {
              const key = `${rec.date}_${rec.studentName}`;
              if (!uniqueMap.has(key)) {
                uniqueMap.set(key, rec);
              }
            }
            return Array.from(uniqueMap.values()).sort((a, b) =>
              b.timestamp.localeCompare(a.timestamp)
            );
          }
          return records;
        }
      } catch (e) {}
    }
    return INITIAL_ATTENDANCE;
  });

  // Loading items state with localStorage (upgraded to v2 for DB_Truck schema)
  const [loadingItems, setLoadingItems] = useState<LoadingItem[]>(() => {
    const saved =
      localStorage.getItem('gatabra_loading_v2') || localStorage.getItem('gatabra_loading');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Only use saved if it's the 11-item DB_Truck format and doesn't contain old fictional items (load-17)
        if (
          Array.isArray(parsed) &&
          parsed.length <= 15 &&
          parsed.some((it: any) => it.instrumentName === 'ティンパニ' || it.instrumentName === 'バスドラ')
        ) {
          return parsed;
        }
      } catch (e) {}
    }
    return INITIAL_LOADING_ITEMS;
  });

  // Scores state with localStorage
  const [musicScores, setMusicScores] = useState<MusicScore[]>(() => {
    const saved = localStorage.getItem('gatabra_scores');
    return saved ? JSON.parse(saved) : INITIAL_SCORES;
  });

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('gatabra_schedules_v3', JSON.stringify(schedules));
    localStorage.setItem('gatabra_schedules_v2', JSON.stringify(schedules));
  }, [schedules]);

  useEffect(() => {
    localStorage.setItem('gatabra_attendance_v3', JSON.stringify(attendanceRecords));
    localStorage.setItem('gatabra_attendance_v2', JSON.stringify(attendanceRecords));
  }, [attendanceRecords]);

  useEffect(() => {
    localStorage.setItem('gatabra_loading_v2', JSON.stringify(loadingItems));
  }, [loadingItems]);

  useEffect(() => {
    localStorage.setItem('gatabra_scores', JSON.stringify(musicScores));
  }, [musicScores]);

  useEffect(() => {
    localStorage.setItem('gatabra_yearly_goals', JSON.stringify(yearlyGoals));
  }, [yearlyGoals]);

  // Truck spreadsheet URL state
  const [truckSpreadsheetUrl, setTruckSpreadsheetUrl] = useState<string>(() => {
    return localStorage.getItem('gatabra_truck_url') || DEFAULT_TRUCK_SPREADSHEET_URL;
  });

  const handleSaveTruckUrl = (newUrl: string) => {
    setTruckSpreadsheetUrl(newUrl);
    localStorage.setItem('gatabra_truck_url', newUrl);
  };

  // Truck auto-sync status tracking
  const [truckSyncStatus, setTruckSyncStatus] = useState<{
    isSyncing: boolean;
    lastSyncedAt: string | null;
    error: string | null;
    count: number;
  }>({
    isSyncing: false,
    lastSyncedAt: null,
    error: null,
    count: loadingItems.length,
  });

  // Attendance auto-sync status tracking
  const [attendanceSyncStatus, setAttendanceSyncStatus] = useState<{
    isSyncing: boolean;
    lastSyncedAt: string | null;
    error: string | null;
  }>({
    isSyncing: false,
    lastSyncedAt: null,
    error: null,
  });

  // Schedule spreadsheet URL state
  const [scheduleSpreadsheetUrl, setScheduleSpreadsheetUrl] = useState<string>(() => {
    return (
      localStorage.getItem('gatabra_schedule_url') || DEFAULT_SCHEDULE_SPREADSHEET_URL
    );
  });

  const handleSaveScheduleUrl = (newUrl: string) => {
    setScheduleSpreadsheetUrl(newUrl);
    localStorage.setItem('gatabra_schedule_url', newUrl);
  };

  // Schedule auto-sync status tracking
  const [scheduleSyncStatus, setScheduleSyncStatus] = useState<{
    isSyncing: boolean;
    lastSyncedAt: string | null;
    error: string | null;
    count: number;
  }>({
    isSyncing: false,
    lastSyncedAt: null,
    error: null,
    count: schedules.length,
  });

  // Attempt initial background sync for yearly goals if spreadsheet is accessible
  useEffect(() => {
    const autoSyncGoals = async () => {
      try {
        const url =
          yearlyGoals.spreadsheetUrl ||
          'https://docs.google.com/spreadsheets/d/1K8se6Rls9JsNKdNzLhEeeKaDYBjedWVZoGVpdNLKOdY/edit?gid=47287689#gid=47287689';
        const csv = await fetchSpreadsheetCSV(url);
        const parsed = parseGoalsFromCSV(csv);
        if (parsed) {
          setYearlyGoals((prev) => ({
            ...prev,
            ...parsed,
            lastSyncedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }));
        }
      } catch (e) {
        console.log('Background goals sync skipped (using local goals data)');
      }
    };
    autoSyncGoals();
  }, []);

  // Automatically load schedules from spreadsheet when opening the app
  const autoSyncSchedules = useCallback(async (silent = false) => {
    try {
      setScheduleSyncStatus((prev) => ({ ...prev, isSyncing: true, error: null }));
      const targetUrl =
        localStorage.getItem('gatabra_schedule_url') || DEFAULT_SCHEDULE_SPREADSHEET_URL;
      const csv = await fetchSpreadsheetCSV(targetUrl);
      const parsed = parseSchedulesFromCSV(csv);
      if (parsed.length > 0) {
        setSchedules((prev) => {
          // If parsed data contains full annual schedule (>= 300 days), use parsed directly as authoritative
          if (parsed.length >= 300) {
            return parsed.sort((a, b) => a.date.localeCompare(b.date));
          }
          const updated = [...prev];
          for (const item of parsed) {
            const idx = updated.findIndex((s) => s.date === item.date);
            if (idx >= 0) {
              updated[idx] = { ...updated[idx], ...item };
            } else {
              updated.push(item);
            }
          }
          return updated.sort((a, b) => a.date.localeCompare(b.date));
        });
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setScheduleSyncStatus({
          isSyncing: false,
          lastSyncedAt: timeStr,
          error: null,
          count: parsed.length,
        });
      } else {
        setScheduleSyncStatus((prev) => ({
          ...prev,
          isSyncing: false,
          error: 'スプレッドシートから有効な日程データを読み取れませんでした',
        }));
      }
    } catch (e: any) {
      console.warn('App open schedule sync error:', e);
      setScheduleSyncStatus((prev) => ({
        ...prev,
        isSyncing: false,
        error: e.message || '練習日程の自動取得に失敗しました',
      }));
    }
  }, []);

  // Automatically load attendance records from Google Form spreadsheet when opening the app
  const autoSyncAttendance = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setAttendanceSyncStatus((prev) => ({ ...prev, isSyncing: true, error: null }));
      }
      const targetUrl =
        localStorage.getItem('gatabra_attendance_url') || DEFAULT_ATTENDANCE_SPREADSHEET_URL;
      const csv = await fetchSpreadsheetCSV(targetUrl);
      const parsed = parseAttendanceFromCSV(csv);
      if (parsed.length > 0) {
        setAttendanceRecords((prev) => {
          // Preserve manual records entered directly in the app
          const manualOnly = prev.filter((r) => r.reportedVia === 'app_manual');
          const combined = [...manualOnly, ...parsed];
          const uniqueMap = new Map<string, AttendanceRecord>();
          for (const rec of combined) {
            const key = `${rec.date}_${rec.studentName}`;
            if (!uniqueMap.has(key)) {
              uniqueMap.set(key, rec);
            }
          }
          return Array.from(uniqueMap.values()).sort((a, b) =>
            b.timestamp.localeCompare(a.timestamp)
          );
        });
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setAttendanceSyncStatus({
          isSyncing: false,
          lastSyncedAt: timeStr,
          error: null,
        });
      } else {
        if (!silent) {
          setAttendanceSyncStatus((prev) => ({ ...prev, isSyncing: false }));
        }
      }
    } catch (e: any) {
      console.warn('App open attendance sync error:', e);
      if (!silent) {
        setAttendanceSyncStatus((prev) => ({
          ...prev,
          isSyncing: false,
          error: e.message || '出欠データの取得に失敗しました',
        }));
      }
    }
  }, []);

  // Automatically load truck loading items from DB_Truck spreadsheet
  const autoSyncTruck = useCallback(async (silent = false) => {
    try {
      setTruckSyncStatus((prev) => ({ ...prev, isSyncing: true, error: null }));
      const targetUrl =
        localStorage.getItem('gatabra_truck_url') || DEFAULT_TRUCK_SPREADSHEET_URL;
      const csv = await fetchSpreadsheetCSV(targetUrl);
      const parsed = parseLoadingItemsFromCSV(csv);
      if (parsed.length > 0) {
        setLoadingItems((prev) => {
          // If we have existing checkmarks recorded locally on the phone, keep local check status unless spreadsheet marked true
          return parsed.map((newItem) => {
            const existing = prev.find((p) => p.instrumentName === newItem.instrumentName);
            if (existing) {
              return {
                ...newItem,
                loadedOutbound: newItem.loadedOutbound || existing.loadedOutbound || false,
                loadedInbound: newItem.loadedInbound || existing.loadedInbound || false,
                loaded: newItem.loaded || existing.loaded || false,
              };
            }
            return newItem;
          });
        });
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setTruckSyncStatus({
          isSyncing: false,
          lastSyncedAt: timeStr,
          error: null,
          count: parsed.length,
        });
      } else {
        if (!silent) {
          setTruckSyncStatus((prev) => ({
            ...prev,
            isSyncing: false,
            error: 'DB_Truckから有効な楽器データを読み取れませんでした',
          }));
        }
      }
    } catch (e: any) {
      console.warn('App open truck sync error:', e);
      if (!silent) {
        setTruckSyncStatus((prev) => ({
          ...prev,
          isSyncing: false,
          error: e.message || 'トラック積込リストの自動取得に失敗しました',
        }));
      }
    }
  }, []);

  // Trigger auto-sync for schedules, attendance, and truck loading when app opens & on return to tab
  useEffect(() => {
    autoSyncSchedules(false);
    autoSyncAttendance(false);
    autoSyncTruck(false);

    let lastCheck = Date.now();
    const handleRevisit = () => {
      // If user comes back to the tab after > 90 seconds, auto-refresh smoothly
      if (Date.now() - lastCheck > 90000) {
        lastCheck = Date.now();
        autoSyncSchedules(true);
        autoSyncAttendance(true);
        autoSyncTruck(true);
      }
    };

    window.addEventListener('focus', handleRevisit);
    const handleVisChange = () => {
      if (document.visibilityState === 'visible') {
        handleRevisit();
      }
    };
    document.addEventListener('visibilitychange', handleVisChange);

    return () => {
      window.removeEventListener('focus', handleRevisit);
      document.removeEventListener('visibilitychange', handleVisChange);
    };
  }, [autoSyncSchedules, autoSyncAttendance, autoSyncTruck]);

  // Today's dynamic date & schedule
  const todayStr = getTodayStr();
  const todaySchedule = schedules.find((s) => s.date === todayStr);
  const todayAttendance = attendanceRecords.filter((a) => a.date === todayStr);

  // Handle new attendance record from modal
  const handleAddNewAttendance = (record: AttendanceRecord) => {
    setAttendanceRecords((prev) => [record, ...prev]);
  };

  // Reset sample data helper
  const handleResetSampleData = () => {
    if (
      window.confirm(
        '初期サンプルデータ（練習日程・出欠・トラック積込・所持楽譜・目標）に戻しますか？'
      )
    ) {
      setSchedules(INITIAL_SCHEDULES);
      setAttendanceRecords(INITIAL_ATTENDANCE);
      setLoadingItems(INITIAL_LOADING_ITEMS);
      setMusicScores(INITIAL_SCORES);
      setYearlyGoals(DEFAULT_YEARLY_GOALS);
      localStorage.clear();
    }
  };

  return (
    <div className="min-h-screen bg-stone-100/70 text-stone-900 flex flex-col font-sans selection:bg-amber-200">
      {/* App Header (出欠報告ボタンは画面最上部左に配置) */}
      <Header
        onOpenAttendanceReport={() => setIsAttendanceReportModalOpen(true)}
        todaySchedule={todaySchedule}
        todayAttendance={todayAttendance}
        onOpenAttendanceTab={() => setActiveTab('attendance')}
      />

      {/* Main Container - Optimized for mobile width & bottom bar spacing */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 pb-24 sm:pb-28">
        {/* 1. ホーム (練習予定: 日・週・月カレンダー) */}
        {activeTab === 'home' && (
          <div className="space-y-4 sm:space-y-5">
            {/* USER REQUIREMENT: ガタブラポータルの下、その日の練習詳細の上のところに、今年度の目標 ＆ 本番カウントダウン */}
            <YearlyGoalsBanner
              goalsData={yearlyGoals}
              onUpdateGoals={setYearlyGoals}
            />

            <ScheduleView
              schedules={schedules}
              attendanceRecords={attendanceRecords}
              onUpdateSchedules={setSchedules}
              onOpenAttendanceTab={() => setActiveTab('attendance')}
              attendanceSyncStatus={attendanceSyncStatus}
              onRefreshAttendance={() => autoSyncAttendance(false)}
              scheduleSyncStatus={scheduleSyncStatus}
              onRefreshSchedule={() => autoSyncSchedules(false)}
              scheduleSpreadsheetUrl={scheduleSpreadsheetUrl}
              onSaveScheduleSpreadsheetUrl={handleSaveScheduleUrl}
            />
          </div>
        )}

        {/* 2. トラック積込 */}
        {activeTab === 'loading' && (
          <LoadingListView
            items={loadingItems}
            onUpdateItems={setLoadingItems}
            syncStatus={truckSyncStatus}
            onRefresh={() => autoSyncTruck(false)}
            spreadsheetUrl={truckSpreadsheetUrl}
            onSaveSpreadsheetUrl={handleSaveTruckUrl}
          />
        )}

        {/* 3. 楽器相談室 */}
        {activeTab === 'instrument_ai' && <InstrumentAdvisor />}

        {/* 4. 音楽用語辞典 */}
        {activeTab === 'music_terms_ai' && <MusicTermsAdvisor />}

        {/* 5. その他 (各種機能ハブ) */}
        {activeTab === 'more' && (
          <MoreMenuView
            onOpenScores={() => setActiveTab('scores')}
            onOpenAttendance={() => setActiveTab('attendance')}
            onResetData={handleResetSampleData}
            scoreCount={musicScores.length}
            attendanceCount={attendanceRecords.length}
          />
        )}

        {/* サブビュー: 所持楽譜 (その他の中から開く) */}
        {activeTab === 'scores' && (
          <div className="space-y-4">
            {/* Back button to 'その他' */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setActiveTab('more')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-200 hover:border-stone-300 text-stone-700 rounded-xl text-xs font-semibold shadow-2xs transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-stone-500" />
                <span>その他メニューに戻る</span>
              </button>
              <span className="text-xs text-stone-400">その他 &gt; 所持楽譜</span>
            </div>

            <ScoreInventoryView
              scores={musicScores}
              onUpdateScores={setMusicScores}
            />
          </div>
        )}

        {/* サブビュー: 出欠台帳 (出欠詳細) */}
        {activeTab === 'attendance' && (
          <div className="space-y-4">
            {/* Back button to 'ホーム' or 'その他' */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setActiveTab('home')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-200 hover:border-stone-300 text-stone-700 rounded-xl text-xs font-semibold shadow-2xs transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-stone-500" />
                <span>練習予定（ホーム）に戻る</span>
              </button>
              <span className="text-xs text-stone-400">出欠台帳・提出状況</span>
            </div>

            <AttendanceView
              records={attendanceRecords}
              onUpdateRecords={setAttendanceRecords}
            />
          </div>
        )}
      </main>

      {/* USER REQUIREMENT: 下部タブバー (ホーム / トラック積込 / 楽器相談室 / 音楽用語辞典 / その他) */}
      <BottomNav
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
      />

      {/* USER REQUIREMENT: 画面最上部左の出欠報告ボタンから起動するモーダル */}
      <AttendanceReportModal
        isOpen={isAttendanceReportModalOpen}
        onClose={() => setIsAttendanceReportModalOpen(false)}
        onSubmitRecord={handleAddNewAttendance}
        todayRecords={todayAttendance}
        onOpenFullList={() => setActiveTab('attendance')}
      />
    </div>
  );
}
