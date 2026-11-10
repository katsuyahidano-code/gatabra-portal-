import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  FileSpreadsheet,
  Plus,
  Filter,
  Clock,
  Calendar,
  AlertCircle,
  Search,
  CheckCircle2,
  Trash2,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { AttendanceRecord, AttendanceStatus } from '../types';
import { SpreadsheetSyncModal } from './SpreadsheetSyncModal';
import {
  parseAttendanceFromCSV,
  exportToCSV,
  fetchSpreadsheetCSV,
  DEFAULT_ATTENDANCE_SPREADSHEET_URL,
} from '../utils/spreadsheetSync';
import { getTodayStr, getWeekRange, getDayOfWeekName } from '../utils/dateUtils';

interface AttendanceViewProps {
  records: AttendanceRecord[];
  onUpdateRecords: (records: AttendanceRecord[]) => void;
  selectedDateFilter?: string;
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({
  records,
  onUpdateRecords,
}) => {
  const todayStr = getTodayStr();
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'all' | 'custom'>('all');
  const [customDate, setCustomDate] = useState(todayStr);
  const [statusFilter, setStatusFilter] = useState<'all' | AttendanceStatus>('all');
  const [partFilter, setPartFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Persistent attendance URL (Spreadsheet or GAS Web App)
  const [sheetUrl, setSheetUrl] = useState<string>(() => {
    return localStorage.getItem('gatabra_attendance_url') || DEFAULT_ATTENDANCE_SPREADSHEET_URL;
  });
  const [isAutoSyncing, setIsAutoSyncing] = useState(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Quick / Automated attendance sync
  const handleQuickSync = useCallback(
    async (silent = false) => {
      if (!sheetUrl.trim()) return;
      if (!silent) setIsAutoSyncing(true);

      try {
        const csv = await fetchSpreadsheetCSV(sheetUrl.trim());
        const parsed = parseAttendanceFromCSV(csv);
        if (parsed.length > 0) {
          // Merge preserving manual records added in-app
          const manualOnly = records.filter((r) => r.reportedVia === 'app_manual');
          const combined = [...manualOnly, ...parsed];
          const uniqueMap = new Map<string, AttendanceRecord>();
          for (const rec of combined) {
            const key = `${rec.date}_${rec.studentName}`;
            if (!uniqueMap.has(key)) {
              uniqueMap.set(key, rec);
            }
          }
          const finalRecords = Array.from(uniqueMap.values()).sort((a, b) =>
            b.timestamp.localeCompare(a.timestamp)
          );
          onUpdateRecords(finalRecords);
          const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          setLastSyncedTime(time);
          if (!silent) {
            setSyncFeedback({
              message: `最新の出欠データ（${parsed.length}件）を取得しました！`,
              type: 'success',
            });
            setTimeout(() => setSyncFeedback(null), 3500);
          }
        }
      } catch (err: any) {
        if (!silent) {
          console.warn('Attendance sync error:', err);
          setSyncFeedback({
            message: err.message || '出欠データの同期に失敗しました',
            type: 'error',
          });
          setTimeout(() => setSyncFeedback(null), 5000);
        }
      } finally {
        if (!silent) setIsAutoSyncing(false);
      }
    },
    [sheetUrl, records, onUpdateRecords]
  );

  // Auto-sync once on component mount (no periodic background timers to keep app lightweight)
  useEffect(() => {
    handleQuickSync(true);
  }, [handleQuickSync]);

  const [newRecord, setNewRecord] = useState<Partial<AttendanceRecord>>({
    date: todayStr,
    studentName: '',
    part: 'Trumpet',
    grade: '2年',
    status: 'absent',
    timeInfo: '',
    reason: '',
    reportedVia: 'app_manual',
  });

  // Filter logic
  const filteredRecords = records.filter((r) => {
    // Date filter
    if (dateFilter === 'today' && r.date !== todayStr) return false;
    if (dateFilter === 'custom' && r.date !== customDate) return false;
    if (dateFilter === 'week') {
      const { mondayStr, sundayStr } = getWeekRange(todayStr);
      if (r.date < mondayStr || r.date > sundayStr) return false;
    }

    // Status filter
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;

    // Part filter
    if (partFilter !== 'all' && r.part !== partFilter) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        r.studentName.toLowerCase().includes(q) ||
        r.part.toLowerCase().includes(q) ||
        r.reason.toLowerCase().includes(q);
      if (!match) return false;
    }

    return true;
  });

  // Today specific breakdown
  const todayRecords = records.filter((r) => r.date === todayStr);
  const absentCount = todayRecords.filter((r) => r.status === 'absent').length;
  const lateCount = todayRecords.filter((r) => r.status === 'late').length;
  const earlyCount = todayRecords.filter((r) => r.status === 'early_leave').length;

  // Parts list for selector (dynamic from records + standard band sections)
  const standardParts = [
    'トランペット',
    'フルート',
    'クラリネット',
    'サックス',
    'トロンボーン',
    'ホルン',
    'ユーフォニアム',
    'チューバ',
    'パーカッション',
    'ダブルリード',
    'コントラバス',
  ];
  const parts = Array.from(new Set([...standardParts, ...records.map((r) => r.part).filter(Boolean)]));

  const handleImportCSV = (csvText: string) => {
    const parsed = parseAttendanceFromCSV(csvText);
    if (parsed.length > 0) {
      onUpdateRecords(parsed);
    } else {
      throw new Error(
        '有効な出欠データ（タイムスタンプ・氏名等）が見つかりませんでした。Googleフォームの回答シート（Raw_Form_Responses）のURLをご確認ください。'
      );
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'タイムスタンプ',
      '対象日',
      '氏名',
      'パート',
      '学年',
      '出欠区分',
      '遅刻早退時刻',
      '理由',
      '登録種別',
    ];
    const rows = records.map((r) => [
      r.timestamp,
      r.date,
      r.studentName,
      r.part,
      r.grade,
      r.status === 'absent'
        ? '欠席'
        : r.status === 'late'
        ? '遅刻'
        : r.status === 'early_leave'
        ? '早退'
        : '出席',
      r.timeInfo || '',
      r.reason,
      r.reportedVia,
    ]);
    exportToCSV('ガタブラ_Googleフォーム出欠集計一覧.csv', headers, rows);
  };

  const handleDelete = (id: string) => {
    onUpdateRecords(records.filter((r) => r.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Fast Summary */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                <Users className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-stone-900 tracking-tight">
                出欠状況・届出一覧
              </h2>
            </div>
            <p className="text-xs text-stone-500 mt-1">
              Googleフォームに部員が入力した欠席・遅刻・早退回答を一元管理し、練習予定とリアルタイム連動します。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <button
              onClick={() => handleQuickSync(false)}
              disabled={isAutoSyncing}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-emerald-800 hover:bg-emerald-900 active:bg-emerald-950 text-white rounded-xl transition-all shadow-xs disabled:opacity-50"
              title="スプレッドシートやGASから最新の出欠を再取得"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAutoSyncing ? 'animate-spin' : ''}`} />
              <span>{isAutoSyncing ? '出欠同期中...' : '最新出欠を更新'}</span>
            </button>

            <a
              href="https://forms.gle/AX2eQ98ErY3q2wAS9"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-white text-emerald-800 border border-emerald-300 hover:bg-emerald-50 rounded-xl transition-colors shadow-2xs"
              title="Googleフォームを開いて回答する"
            >
              <span>出欠フォーム</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              onClick={() => setIsSyncModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-stone-100 text-stone-700 border border-stone-200 rounded-xl hover:bg-stone-200 transition-colors shadow-2xs"
              title="連携URLやGAS自動同期の設定"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span>連携設定・貼付</span>
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>個別登録</span>
            </button>
          </div>
        </div>

        {/* Sync Feedback Toast */}
        {syncFeedback && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 transition-all ${
              syncFeedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-rose-50 border-rose-300 text-rose-900'
            }`}
          >
            <div className="flex items-center gap-2">
              {syncFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span className="font-medium">{syncFeedback.message}</span>
            </div>
            <button
              onClick={() => setSyncFeedback(null)}
              className="text-[11px] underline opacity-70 hover:opacity-100"
            >
              閉じる
            </button>
          </div>
        )}

        {/* Counters for Today */}
        <div className="p-4 bg-emerald-50/50 border border-emerald-200/70 rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-700" />
              <span className="text-xs font-bold text-emerald-950">
                本日 {todayStr} ({getDayOfWeekName(todayStr)}) の出欠サマリー
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-emerald-800 font-medium">
              {lastSyncedTime && <span>最終自動同期: {lastSyncedTime}</span>}
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="自動同期稼働中"></span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[11px] text-stone-500 font-semibold block">欠席</span>
                <span className="text-2xl font-black text-rose-600">{absentCount} 名</span>
              </div>
              <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                <AlertCircle className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[11px] text-stone-500 font-semibold block">遅刻（合流予定）</span>
                <span className="text-2xl font-black text-amber-600">{lateCount} 名</span>
              </div>
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-stone-200 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[11px] text-stone-500 font-semibold block">早退</span>
                <span className="text-2xl font-black text-blue-600">{earlyCount} 名</span>
              </div>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Users className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Date range filter buttons */}
          <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setDateFilter('today')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                dateFilter === 'today'
                  ? 'bg-white text-stone-900 shadow-xs font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              本日
            </button>
            <button
              onClick={() => setDateFilter('week')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                dateFilter === 'week'
                  ? 'bg-white text-stone-900 shadow-xs font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              今週
            </button>
            <button
              onClick={() => setDateFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                dateFilter === 'all'
                  ? 'bg-white text-stone-900 shadow-xs font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              全期間
            </button>
            <button
              onClick={() => setDateFilter('custom')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                dateFilter === 'custom'
                  ? 'bg-white text-stone-900 shadow-xs font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              日付指定
            </button>
          </div>

          {dateFilter === 'custom' && (
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="text-xs p-1.5 border rounded-xl border-stone-300"
            />
          )}

          {/* Search box */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="部員名・パート・理由で検索"
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
          </div>
        </div>

        {/* Dropdowns for Part and Status */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-stone-100 text-xs">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-stone-400" />
            <span className="text-stone-500 font-medium">区分:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="p-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs"
            >
              <option value="all">すべて</option>
              <option value="absent">欠席のみ</option>
              <option value="late">遅刻のみ</option>
              <option value="early_leave">早退のみ</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-stone-500 font-medium">パート:</span>
            <select
              value={partFilter}
              onChange={(e) => setPartFilter(e.target.value)}
              className="p-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs"
            >
              <option value="all">全パート</option>
              {parts.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="ml-auto text-stone-500 text-xs">
            表示中: <span className="font-bold text-stone-800">{filteredRecords.length}</span> 件
          </div>
        </div>
      </div>

      {/* Records Grid */}
      {filteredRecords.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRecords.map((r) => (
            <div
              key={r.id}
              className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs hover:border-amber-300 transition-all space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                      r.status === 'absent'
                        ? 'bg-rose-100 text-rose-800 border-rose-300'
                        : r.status === 'late'
                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                        : 'bg-blue-100 text-blue-800 border-blue-300'
                    }`}
                  >
                    {r.status === 'absent'
                      ? '欠席'
                      : r.status === 'late'
                      ? '遅刻'
                      : '早退'}
                  </span>

                  <div>
                    <h4 className="text-sm font-bold text-stone-900">
                      {r.studentName}
                    </h4>
                    <p className="text-xs text-stone-500">
                      {r.grade}{r.classGroup ? ` ${r.classGroup}` : ''} / {r.part}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-stone-500 bg-stone-100 px-2 py-0.5 rounded">
                    {r.date}
                  </span>
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="text-stone-300 hover:text-rose-600 p-1 transition-colors"
                    title="削除"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {r.timeInfo && (
                <div className="flex items-center gap-1.5 text-xs text-amber-800 bg-amber-50/80 px-2.5 py-1 rounded-lg border border-amber-200/60 font-medium">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>合流・退出予定時刻: {r.timeInfo}</span>
                </div>
              )}

              <div className="text-xs text-stone-600 bg-stone-50 p-2.5 rounded-xl border border-stone-100 space-y-1">
                <div>
                  <span className="font-semibold text-stone-700">理由:</span> {r.reason}
                </div>
                {r.notes && (
                  <div className="text-stone-500 text-[11px]">
                    <span className="font-semibold text-stone-600">連絡事項:</span> {r.notes}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-[11px] text-stone-400 pt-1">
                <span>
                  届出経路: {r.reportedVia === 'google_form' ? 'Googleフォーム' : '手動登録'}
                </span>
                <span>送信: {r.timestamp}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center text-stone-500 space-y-2">
          <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-2" />
          <h4 className="font-bold text-stone-800 text-sm">該当する出欠届出はありません</h4>
          <p className="text-xs text-stone-400">
            選択した条件（日付・区分・パート）に一致する欠席や遅刻の届出はありません。
          </p>
        </div>
      )}

      {/* Sync modal */}
      <SpreadsheetSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        title="Googleフォーム出欠集約シート（Raw_Form_Responses）連携"
        dataTypeName="出欠回答データ"
        defaultUrl={sheetUrl}
        onUrlSave={(newUrl) => {
          setSheetUrl(newUrl);
          localStorage.setItem('gatabra_attendance_url', newUrl);
        }}
        onImportCSV={handleImportCSV}
        onExportCSV={handleExportCSV}
        sampleHeaders={[
          'タイムスタンプ',
          '学年',
          '組',
          'パート',
          '名前を選択して',
          '欠席等の該当日',
          '遅刻・欠席・早退',
          '理由など',
          'その他、連絡事項などがあれば入力してください',
        ]}
        sampleRows={[
          [
            '2026/09/28 14:18:35',
            '1年',
            '2組',
            'クラリネット',
            '瀧谷 真緒',
            '2026/09/28',
            '欠席',
            '左母指CM関節炎と伸筋腱炎が悪化したため',
            '',
          ],
          [
            '2026/09/28 15:06:27',
            '2年',
            '3組',
            'パーカッション',
            '樫村 斐月',
            '2026/09/28',
            '欠席',
            '微熱と頭痛',
            '',
          ],
          [
            '2026/09/20 08:22:20',
            '2年',
            '4組',
            'トランペット',
            '山岡 柚輝',
            '2026/09/16',
            '遅刻',
            '自主研修の話し合い',
            '',
          ],
        ]}
      />

      {/* Manual Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-stone-200 p-6 space-y-4">
            <h3 className="text-lg font-bold text-stone-900">出欠届出の手動追加</h3>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">対象日</label>
                  <input
                    type="date"
                    value={newRecord.date}
                    onChange={(e) => setNewRecord({ ...newRecord, date: e.target.value })}
                    className="w-full p-2 border rounded-xl border-stone-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">出欠区分</label>
                  <select
                    value={newRecord.status}
                    onChange={(e) =>
                      setNewRecord({ ...newRecord, status: e.target.value as AttendanceStatus })
                    }
                    className="w-full p-2 border rounded-xl border-stone-300"
                  >
                    <option value="absent">欠席</option>
                    <option value="late">遅刻</option>
                    <option value="early_leave">早退</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">部員氏名</label>
                  <input
                    type="text"
                    value={newRecord.studentName}
                    onChange={(e) => setNewRecord({ ...newRecord, studentName: e.target.value })}
                    placeholder="山田 太郎"
                    className="w-full p-2 border rounded-xl border-stone-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">学年</label>
                  <select
                    value={newRecord.grade}
                    onChange={(e) => setNewRecord({ ...newRecord, grade: e.target.value as any })}
                    className="w-full p-2 border rounded-xl border-stone-300"
                  >
                    <option value="1年">1年</option>
                    <option value="2年">2年</option>
                    <option value="3年">3年</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">パート</label>
                <select
                  value={newRecord.part}
                  onChange={(e) => setNewRecord({ ...newRecord, part: e.target.value })}
                  className="w-full p-2 border rounded-xl border-stone-300"
                >
                  {parts.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              {(newRecord.status === 'late' || newRecord.status === 'early_leave') && (
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    合流・退出予定時刻
                  </label>
                  <input
                    type="text"
                    value={newRecord.timeInfo}
                    onChange={(e) => setNewRecord({ ...newRecord, timeInfo: e.target.value })}
                    placeholder="例: 17:00 合流予定"
                    className="w-full p-2 border rounded-xl border-stone-300"
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold text-stone-700 mb-1">理由</label>
                <textarea
                  rows={2}
                  value={newRecord.reason}
                  onChange={(e) => setNewRecord({ ...newRecord, reason: e.target.value })}
                  placeholder="例: 補習授業、通院、体調不良など"
                  className="w-full p-2 border rounded-xl border-stone-300"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl"
              >
                キャンセル
              </button>
              <button
                onClick={() => {
                  if (!newRecord.studentName?.trim()) return;
                  const recordToAdd: AttendanceRecord = {
                    id: `att-${Date.now()}`,
                    timestamp: new Date().toLocaleString('ja-JP'),
                    date: newRecord.date || todayStr,
                    studentName: newRecord.studentName.trim(),
                    part: newRecord.part || '部員',
                    grade: newRecord.grade || '2年',
                    status: newRecord.status || 'absent',
                    timeInfo: newRecord.timeInfo,
                    reason: newRecord.reason || '所用',
                    reportedVia: 'app_manual',
                  };
                  onUpdateRecords([recordToAdd, ...records]);
                  setIsAddModalOpen(false);
                }}
                className="px-4 py-2 text-xs font-semibold bg-stone-900 hover:bg-stone-800 text-white rounded-xl"
              >
                登録する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
