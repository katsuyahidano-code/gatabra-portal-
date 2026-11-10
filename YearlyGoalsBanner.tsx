import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Calendar,
  Sparkles,
  RefreshCw,
  FileSpreadsheet,
  Edit3,
  ExternalLink,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  X,
} from 'lucide-react';
import { YearlyGoalsData } from '../types';
import { fetchSpreadsheetCSV, parseGoalsFromCSV, DEFAULT_YEARLY_GOALS } from '../utils/spreadsheetSync';

interface YearlyGoalsBannerProps {
  goalsData: YearlyGoalsData;
  onUpdateGoals: (newData: YearlyGoalsData) => void;
  todayDateStr?: string; // e.g. "2026-09-17"
}

export const YearlyGoalsBanner: React.FC<YearlyGoalsBannerProps> = ({
  goalsData,
  onUpdateGoals,
  todayDateStr,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Manual edit form state
  const [editGoal, setEditGoal] = useState(goalsData.yearlyGoal);
  const [editEv1Name, setEditEv1Name] = useState(goalsData.event1Name);
  const [editEv1Date, setEditEv1Date] = useState(goalsData.event1Date);
  const [editEv2Name, setEditEv2Name] = useState(goalsData.event2Name || '');
  const [editEv2Date, setEditEv2Date] = useState(goalsData.event2Date || '');
  const [sheetUrl, setSheetUrl] = useState(
    goalsData.spreadsheetUrl ||
      'https://docs.google.com/spreadsheets/d/1K8se6Rls9JsNKdNzLhEeeKaDYBjedWVZoGVpdNLKOdY/edit?gid=47287689#gid=47287689'
  );
  const [manualCSV, setManualCSV] = useState('');

  // Sync with prop updates
  useEffect(() => {
    setEditGoal(goalsData.yearlyGoal);
    setEditEv1Name(goalsData.event1Name);
    setEditEv1Date(goalsData.event1Date);
    setEditEv2Name(goalsData.event2Name || '');
    setEditEv2Date(goalsData.event2Date || '');
    if (goalsData.spreadsheetUrl) {
      setSheetUrl(goalsData.spreadsheetUrl);
    }
  }, [goalsData]);

  // Calculate days remaining from current date to target date (0 on the day of event)
  const calculateDaysRemaining = (targetDateStr?: string) => {
    if (!targetDateStr) return null;

    // Current date (現在の日付: 今日の午前0時)
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    let targetDate: Date | null = null;

    // 1. Try format YYYY[-/.年]MM[-/.月]DD[日]? (例: 2026/08/27, 2026-8-27, 2026年8月27日)
    const ymdMatch = targetDateStr.match(/(\d{4})[^\d](\d{1,2})[^\d](\d{1,2})/);
    if (ymdMatch) {
      targetDate = new Date(
        parseInt(ymdMatch[1], 10),
        parseInt(ymdMatch[2], 10) - 1,
        parseInt(ymdMatch[3], 10),
        0,
        0,
        0,
        0
      );
    } else {
      // 2. Try MM/DD or MM月DD日 (年省略の場合)
      const mdMatch = targetDateStr.match(/(\d{1,2})[^\d](\d{1,2})/);
      if (mdMatch) {
        const month = parseInt(mdMatch[1], 10) - 1;
        const day = parseInt(mdMatch[2], 10);
        const year = now.getFullYear();
        targetDate = new Date(year, month, day, 0, 0, 0, 0);
        // もし今年のその日付が既に30日以上過ぎていれば、来年の本番と推測
        if (targetDate.getTime() < today.getTime() - 30 * 24 * 60 * 60 * 1000) {
          targetDate = new Date(year + 1, month, day, 0, 0, 0, 0);
        }
      } else {
        // 3. Fallback standard parse
        const parsedMs = Date.parse(targetDateStr);
        if (!isNaN(parsedMs)) {
          const d = new Date(parsedMs);
          targetDate = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
        }
      }
    }

    if (!targetDate || isNaN(targetDate.getTime())) return null;

    const diffMs = targetDate.getTime() - today.getTime();
    // Round to nearest integer day count
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    return {
      days: diffDays,
      isToday: diffDays === 0,
      isPast: diffDays < 0,
    };
  };

  const event1Info = calculateDaysRemaining(goalsData.event1Date);
  const event2Info = calculateDaysRemaining(goalsData.event2Date);

  // Sync directly from the user's spreadsheet
  const handleSyncFromSpreadsheet = async () => {
    setIsSyncing(true);
    setErrorMessage(null);
    setSyncStatus('idle');

    try {
      const csvText = await fetchSpreadsheetCSV(sheetUrl);
      const parsed = parseGoalsFromCSV(csvText);

      if (!parsed) {
        throw new Error(
          'スプレッドシートから「今年度の目標」「本番の日付」が見つかりませんでした。DB_Goalsシートの列形式をご確認ください。'
        );
      }

      const updated: YearlyGoalsData = {
        ...parsed,
        spreadsheetUrl: sheetUrl,
        lastSyncedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      onUpdateGoals(updated);
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 4000);
    } catch (err: any) {
      console.warn('Goals spreadsheet sync failed:', err);
      setErrorMessage(
        err.message ||
          'スプレッドシートの取得に失敗しました。リンク共有設定が「リンクを知っている全員が閲覧可」になっているかご確認ください。'
      );
      setSyncStatus('error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Save manual edit
  const handleSaveManualEdit = () => {
    const updated: YearlyGoalsData = {
      yearlyGoal: editGoal.trim() || 'コンクール全道金賞',
      event1Name: editEv1Name.trim() || '吹奏楽コンクール',
      event1Date: editEv1Date.trim() || '2026/08/27',
      event2Name: editEv2Name.trim() || undefined,
      event2Date: editEv2Date.trim() || undefined,
      spreadsheetUrl: sheetUrl.trim(),
      lastSyncedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    onUpdateGoals(updated);
    setIsModalOpen(false);
    setSyncStatus('success');
    setTimeout(() => setSyncStatus('idle'), 3000);
  };

  // Import from manual CSV text
  const handleImportCSVText = () => {
    if (!manualCSV.trim()) return;
    const parsed = parseGoalsFromCSV(manualCSV);
    if (!parsed) {
      setErrorMessage('CSVの解析に失敗しました。ヘッダーとデータ行をご確認ください。');
      return;
    }
    onUpdateGoals({
      ...parsed,
      spreadsheetUrl: sheetUrl,
      lastSyncedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });
    setManualCSV('');
    setIsModalOpen(false);
    setSyncStatus('success');
    setTimeout(() => setSyncStatus('idle'), 3000);
  };

  return (
    <section
      id="yearly-goals-banner"
      aria-label="今年度の目標と本番カウントダウン"
      className="w-full bg-gradient-to-br from-emerald-900 via-emerald-850 to-teal-950 text-white rounded-3xl p-4 sm:p-5 shadow-sm border border-emerald-750/70 relative overflow-hidden"
    >
      {/* Decorative background brass/woodwind subtle glow */}
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-44 h-44 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 -mb-10 w-48 h-32 rounded-full bg-teal-400/10 blur-2xl pointer-events-none" />

      {/* Top Header Row inside Banner: Badge + Actions */}
      <div className="flex items-center justify-between gap-2 mb-2 sm:mb-2.5 relative z-10">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-700/80 border border-emerald-500/50 text-[11px] sm:text-xs font-bold tracking-wide text-emerald-100 shadow-2xs">
            <Trophy className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span>今年度の目標</span>
          </div>

          {goalsData.lastSyncedAt && (
            <span className="hidden sm:inline-block text-[10px] text-emerald-300/80">
              同期 {goalsData.lastSyncedAt}
            </span>
          )}
        </div>

        {/* Sync & Edit Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleSyncFromSpreadsheet}
            disabled={isSyncing}
            title="スプレッドシート（DB_Goals）から最新の目標を更新"
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-800/80 hover:bg-emerald-700/90 text-emerald-100 border border-emerald-600/50 text-[11px] font-semibold transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-amber-300' : ''}`} />
            <span className="hidden xs:inline">シート同期</span>
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            title="目標・本番の日付を手動設定またはスプレッドシート設定"
            className="p-1.5 rounded-xl bg-emerald-800/80 hover:bg-emerald-700/90 text-emerald-100 border border-emerald-600/50 transition-all"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ① 今年度の目標 (大きく力強く表示) */}
      <div className="relative z-10 mb-3 sm:mb-3.5">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-white drop-shadow-xs flex items-baseline gap-2">
          <span>{goalsData.yearlyGoal || 'コンクール全道金賞'}</span>
        </h2>
      </div>

      {/* Divider */}
      <div className="h-px w-full bg-emerald-700/60 my-2.5 sm:my-3" />

      {/* ② & ③ 本番カウントダウン エリア */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
        {/* Main Countdown (本番①: 最も近い本番) */}
        <div className="flex items-baseline flex-wrap gap-x-2 gap-y-1 bg-emerald-950/40 border border-emerald-700/40 rounded-2xl px-3.5 py-2 sm:px-4 sm:py-2.5 flex-1 shadow-2xs">
          <div className="flex items-center gap-1.5 text-emerald-200 text-xs sm:text-sm font-semibold">
            <Calendar className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span className="font-bold text-white text-sm sm:text-base tracking-tight">
              {goalsData.event1Name}
            </span>
            <span>まで</span>
          </div>

          <div className="flex items-baseline gap-1.5">
            <span className="text-xs sm:text-sm text-emerald-200 font-bold">あと</span>
            {event1Info ? (
              event1Info.days > 0 ? (
                <div className="flex items-baseline gap-1">
                  <span className="font-mono text-2xl sm:text-3xl font-black text-amber-300 tracking-tight drop-shadow-xs">
                    {event1Info.days}
                  </span>
                  <span className="text-sm sm:text-base font-bold text-white">日</span>
                </div>
              ) : event1Info.days === 0 ? (
                <div className="flex items-baseline gap-1.5">
                  <span className="font-mono text-2xl sm:text-3xl font-black text-amber-300 tracking-tight drop-shadow-xs">
                    0
                  </span>
                  <span className="text-sm sm:text-base font-bold text-white">日</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-400 text-emerald-950 font-black text-[11px] shadow-2xs animate-pulse">
                    本日 本番！
                  </span>
                </div>
              ) : (
                <div className="flex items-baseline gap-1">
                  <span className="font-mono text-xl sm:text-2xl font-bold text-stone-300">
                    0
                  </span>
                  <span className="text-xs sm:text-sm text-stone-300">日</span>
                  <span className="text-[11px] text-emerald-300/80 ml-1">
                    (終了)
                  </span>
                </div>
              )
            ) : (
              <span className="text-xs text-emerald-300">日付未定</span>
            )}
          </div>
        </div>

        {/* Sub Countdown (本番②: 2つめの本番 - USER SPEC: 文字を小さくして表示) */}
        {goalsData.event2Name && (
          <div className="flex items-center gap-2 bg-emerald-950/25 border border-emerald-700/30 rounded-xl px-3 py-1.5 text-xs sm:text-xs text-emerald-200 sm:self-center">
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
              <span className="font-semibold text-emerald-100">{goalsData.event2Name}</span>
              <span>まで</span>
            </div>

            <div className="flex items-baseline gap-1">
              <span className="text-[11px] text-emerald-300">あと</span>
              {event2Info ? (
                event2Info.days > 0 ? (
                  <div className="flex items-baseline gap-0.5">
                    <span className="font-mono text-base sm:text-lg font-bold text-amber-200">
                      {event2Info.days}
                    </span>
                    <span className="text-xs font-bold text-white">日</span>
                  </div>
                ) : event2Info.days === 0 ? (
                  <div className="flex items-baseline gap-0.5">
                    <span className="font-mono text-base sm:text-lg font-bold text-amber-300">
                      0
                    </span>
                    <span className="text-xs font-bold text-white">日 (本日)</span>
                  </div>
                ) : (
                  <div className="flex items-baseline gap-0.5">
                    <span className="font-mono text-sm font-bold text-stone-300">
                      0
                    </span>
                    <span className="text-[10px] text-stone-300">日</span>
                  </div>
                )
              ) : (
                <span className="text-[10px] text-emerald-400">未設定</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sync Status Feedback Toast */}
      {syncStatus === 'success' && (
        <div className="mt-2.5 flex items-center gap-1.5 text-xs text-emerald-200 bg-emerald-800/80 border border-emerald-500/40 px-3 py-1.5 rounded-xl">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
          <span>今年度の目標・本番日程を最新の状態に同期しました！</span>
        </div>
      )}

      {syncStatus === 'error' && (
        <div className="mt-2.5 flex items-center justify-between gap-2 text-xs text-amber-200 bg-amber-950/70 border border-amber-500/40 px-3 py-1.5 rounded-xl">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">{errorMessage || '同期に失敗しました'}</span>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="underline text-[11px] text-amber-300 whitespace-nowrap hover:text-white"
          >
            設定を確認
          </button>
        </div>
      )}

      {/* Edit / Spreadsheet Connection Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white text-stone-900 rounded-3xl border border-stone-200 shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Trophy className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-base">
                    今年度の目標・本番日程の設定
                  </h3>
                  <p className="text-xs text-stone-500">
                    スプレッドシート（DB_Goals）との連携または直接編集
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Google Spreadsheet Sync Box */}
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-950">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                  <span>Googleスプレッドシート（DB_Goals）連動</span>
                </div>
                <a
                  href={sheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[11px] text-emerald-700 hover:text-emerald-900 font-semibold"
                >
                  <span>シートを開く</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                  連携スプレッドシートURL (DB_Goalsシート)
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={sheetUrl}
                    onChange={(e) => setSheetUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/.../edit?gid=47287689"
                    className="flex-1 text-xs px-3 py-2 bg-white border border-emerald-300 rounded-xl font-mono text-stone-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    onClick={handleSyncFromSpreadsheet}
                    disabled={isSyncing}
                    className="px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-1 shrink-0"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>即時同期</span>
                  </button>
                </div>
                <p className="text-[10px] text-stone-500 mt-1">
                  ※ スプレッドシートの「共有」設定で「リンクを知っている全員が閲覧可」に設定されていると、自動的に同期されます。
                </p>
              </div>
            </div>

            {/* Direct Input Fields */}
            <div className="space-y-3 pt-1">
              <h4 className="text-xs font-bold text-stone-700">登録内容の直接確認・手動調整</h4>

              {/* ① 今年度の目標 */}
              <div>
                <label className="text-xs font-bold text-stone-800 block mb-1">
                  ① 今年度の目標
                </label>
                <input
                  type="text"
                  value={editGoal}
                  onChange={(e) => setEditGoal(e.target.value)}
                  placeholder="例: コンクール全道金賞"
                  className="w-full text-sm px-3.5 py-2 bg-stone-50 border border-stone-300 rounded-xl font-bold text-stone-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* ② 本番① */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-bold text-stone-800 block mb-1">
                    ② 本番①の名前（直近の本番）
                  </label>
                  <input
                    type="text"
                    value={editEv1Name}
                    onChange={(e) => setEditEv1Name(e.target.value)}
                    placeholder="例: 吹奏楽コンクール"
                    className="w-full text-xs px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-stone-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-800 block mb-1">
                    本番①の日付 (YYYY/MM/DD)
                  </label>
                  <input
                    type="text"
                    value={editEv1Date}
                    onChange={(e) => setEditEv1Date(e.target.value)}
                    placeholder="2026/08/27"
                    className="w-full text-xs px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl font-mono text-stone-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* ③ 本番② */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-bold text-stone-800 block mb-1">
                    ③ 本番②の名前（小さく表示）
                  </label>
                  <input
                    type="text"
                    value={editEv2Name}
                    onChange={(e) => setEditEv2Name(e.target.value)}
                    placeholder="例: 定期演奏会 (任意)"
                    className="w-full text-xs px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-stone-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-800 block mb-1">
                    本番②の日付 (YYYY/MM/DD)
                  </label>
                  <input
                    type="text"
                    value={editEv2Date}
                    onChange={(e) => setEditEv2Date(e.target.value)}
                    placeholder="2026/11/03"
                    className="w-full text-xs px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl font-mono text-stone-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* CSV Paste Fallback */}
            <details className="text-xs text-stone-600 bg-stone-50 rounded-xl p-3 border border-stone-200">
              <summary className="font-semibold cursor-pointer select-none text-stone-700">
                スプレッドシートからコピーしたCSVテキストを直接貼り付けて反映
              </summary>
              <div className="mt-2 space-y-2">
                <textarea
                  rows={3}
                  value={manualCSV}
                  onChange={(e) => setManualCSV(e.target.value)}
                  placeholder={`今年度の目標,本番①の名前,本番①の日付,本番②の名前,本番②の日付\nコンクール全道金賞,吹奏楽コンクール,2026/08/27,,`}
                  className="w-full p-2 text-[11px] font-mono bg-white border border-stone-300 rounded-lg"
                />
                <button
                  type="button"
                  onClick={handleImportCSVText}
                  className="px-3 py-1.5 bg-stone-800 text-white rounded-lg text-xs font-bold"
                >
                  CSVから反映
                </button>
              </div>
            </details>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl"
              >
                閉じる
              </button>
              <button
                type="button"
                onClick={handleSaveManualEdit}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs"
              >
                保存して適用
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
