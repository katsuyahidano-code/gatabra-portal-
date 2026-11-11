import React, { useState } from 'react';
import {
  Truck,
  CheckCircle2,
  Circle,
  FileSpreadsheet,
  Plus,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Trash2,
  ShieldAlert,
  RefreshCw,
  Info,
  ExternalLink,
  ArrowRight,
  ArrowLeft,
  Check,
} from 'lucide-react';
import { LoadingItem } from '../types';
import { SpreadsheetSyncModal } from './SpreadsheetSyncModal';
import {
  parseLoadingItemsFromCSV,
  exportToCSV,
  DEFAULT_TRUCK_SPREADSHEET_URL,
} from '../utils/spreadsheetSync';

interface LoadingListViewProps {
  items: LoadingItem[];
  onUpdateItems: (items: LoadingItem[]) => void;
  syncStatus?: {
    isSyncing: boolean;
    lastSyncedAt: string | null;
    error: string | null;
    count: number;
  };
  onRefresh?: () => void;
  spreadsheetUrl?: string;
  onSaveSpreadsheetUrl?: (url: string) => void;
}

export const LoadingListView: React.FC<LoadingListViewProps> = ({
  items,
  onUpdateItems,
  syncStatus,
  onRefresh,
  spreadsheetUrl = DEFAULT_TRUCK_SPREADSHEET_URL,
  onSaveSpreadsheetUrl,
}) => {
  // 'outbound' (行き), 'inbound' (帰り), 'all' (全一覧)
  const [activeDirection, setActiveDirection] = useState<'outbound' | 'inbound' | 'all'>('outbound');
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newItem, setNewItem] = useState<Partial<LoadingItem>>({
    truckId: 'truck-1',
    instrumentName: '',
    category: 'equipment',
    part: '全体',
    quantity: 1,
    caseType: '専用ケース',
    locationInTruck: 'トラック荷台',
    handler: '係',
    cautions: '',
    loaded: false,
    loadedOutbound: false,
    loadedInbound: false,
  });

  // Sorted items
  const sortedItems = [...items].sort((a, b) => a.order - b.order);

  // Check counts depending on direction
  const getIsChecked = (it: LoadingItem): boolean => {
    if (activeDirection === 'outbound') return !!it.loadedOutbound;
    if (activeDirection === 'inbound') return !!it.loadedInbound;
    return !!it.loadedOutbound && !!it.loadedInbound;
  };

  const totalLoaded = sortedItems.filter((it) => getIsChecked(it)).length;
  const totalCount = sortedItems.length;
  const progressPercent = totalCount > 0 ? Math.round((totalLoaded / totalCount) * 100) : 0;

  // Toggle item checkmark
  const handleToggleCheck = (id: string) => {
    onUpdateItems(
      items.map((it) => {
        if (it.id !== id) return it;
        if (activeDirection === 'outbound') {
          const next = !it.loadedOutbound;
          return { ...it, loadedOutbound: next, loaded: next };
        } else if (activeDirection === 'inbound') {
          const next = !it.loadedInbound;
          return { ...it, loadedInbound: next, loaded: next };
        } else {
          // In 'all' view, toggle both
          const next = !(it.loadedOutbound && it.loadedInbound);
          return { ...it, loadedOutbound: next, loadedInbound: next, loaded: next };
        }
      })
    );
  };

  // Move item up / down in order
  const handleMove = (index: number, direction: 'up' | 'down') => {
    const list = [...sortedItems];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    const current = list[index];
    const neighbor = list[targetIndex];
    const tempOrder = current.order;
    current.order = neighbor.order;
    neighbor.order = tempOrder;

    const updated = items.map((it) => {
      if (it.id === current.id) return { ...it, order: current.order };
      if (it.id === neighbor.id) return { ...it, order: neighbor.order };
      return it;
    });
    onUpdateItems(updated);
  };

  // Reset checklist for current direction
  const handleResetChecklist = () => {
    const directionName =
      activeDirection === 'outbound' ? '行き（往路）' : activeDirection === 'inbound' ? '帰り（復路）' : 'すべて';
    if (window.confirm(`【${directionName}】のチェックをすべて解除してリセットしますか？`)) {
      onUpdateItems(
        items.map((it) => {
          if (activeDirection === 'outbound') {
            return { ...it, loadedOutbound: false, loaded: false };
          } else if (activeDirection === 'inbound') {
            return { ...it, loadedInbound: false, loaded: false };
          } else {
            return { ...it, loadedOutbound: false, loadedInbound: false, loaded: false };
          }
        })
      );
    }
  };

  // Delete item
  const handleDelete = (id: string) => {
    if (window.confirm('この機材をリストから削除しますか？')) {
      onUpdateItems(items.filter((it) => it.id !== id));
    }
  };

  // Import from CSV
  const handleImportCSV = (csvText: string) => {
    const parsed = parseLoadingItemsFromCSV(csvText);
    if (parsed.length > 0) {
      onUpdateItems(parsed);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      '順序',
      '楽器・機材名',
      '備考',
      '行き（チェックボックス）',
      '帰り（チェックボックス）',
    ];
    const rows = sortedItems.map((it) => [
      it.order,
      it.instrumentName,
      it.cautions || '',
      it.loadedOutbound ? 'TRUE' : 'FALSE',
      it.loadedInbound ? 'TRUE' : 'FALSE',
    ]);
    exportToCSV('DB_Truck_トラック積込リスト.csv', headers, rows);
  };

  return (
    <div className="space-y-5">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                <Truck className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
                  <span>トラック楽器積込リスト</span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    DB_Truck連携
                  </span>
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  遠征やコンクールでの楽器・機材の積込順（DB_Truckシート）を管理します。
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={syncStatus?.isSyncing}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-700 text-white rounded-xl hover:bg-emerald-800 disabled:opacity-50 transition-colors shadow-2xs"
                title="Googleスプレッドシートの最新データを取得"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncStatus?.isSyncing ? 'animate-spin' : ''}`} />
                <span>リストを再読込</span>
              </button>
            )}

            <button
              onClick={() => setIsSyncModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-stone-100 text-stone-700 border border-stone-200 rounded-xl hover:bg-stone-200 transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-stone-600" />
              <span>連携設定</span>
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>機材を追加</span>
            </button>
          </div>
        </div>

        {/* Sync Status Badge */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-100 text-xs">
          <div className="flex items-center gap-1.5">
            {syncStatus?.isSyncing ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                <RefreshCw className="w-3 h-3 animate-spin" />
                スプレッドシート(DB_Truck)から読込中...
              </span>
            ) : syncStatus?.error ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-medium">
                <ShieldAlert className="w-3 h-3" />
                取得エラー（ローカルデータを表示中）
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                <Check className="w-3 h-3" />
                DB_Truck 自動同期済 ({syncStatus?.lastSyncedAt || '最新'} / {items.length}品)
              </span>
            )}
          </div>

          <a
            href={spreadsheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-stone-500 hover:text-emerald-700 underline"
          >
            <span>スプレッドシート(DB_Truck)を開く</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Trip Direction Switcher (行き / 帰り / 全一覧) & Progress */}
        <div className="p-3.5 sm:p-4 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Tabs */}
            <div className="inline-flex p-1 bg-white rounded-xl border border-stone-200 text-xs font-semibold shadow-2xs">
              <button
                onClick={() => setActiveDirection('outbound')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                  activeDirection === 'outbound'
                    ? 'bg-amber-600 text-white shadow-xs font-bold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>行き（往路）</span>
              </button>
              <button
                onClick={() => setActiveDirection('inbound')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                  activeDirection === 'inbound'
                    ? 'bg-amber-600 text-white shadow-xs font-bold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>帰り（復路）</span>
              </button>
              <button
                onClick={() => setActiveDirection('all')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  activeDirection === 'all'
                    ? 'bg-amber-600 text-white shadow-xs font-bold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                全件一覧
              </button>
            </div>

            {/* Progress Count & Reset */}
            <div className="flex items-center justify-between sm:justify-end gap-3">
              <span className="text-xs font-semibold text-stone-600">
                {activeDirection === 'outbound' ? '行き積込:' : activeDirection === 'inbound' ? '帰り積込:' : '積込完了:'}{' '}
                <span className="text-stone-900 font-bold text-sm">{totalLoaded}</span> / {totalCount} 品 ({progressPercent}%)
              </span>

              <button
                onClick={handleResetChecklist}
                className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-800 p-1 rounded-lg hover:bg-stone-200/60 transition-colors"
                title="チェック全解除"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>リセット</span>
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-stone-200 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-amber-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Sync Explanation & Student App Reflection Notice */}
      <div className="p-3.5 sm:p-4 bg-sky-50/80 border border-sky-200/80 rounded-2xl flex items-start gap-3 text-xs text-sky-950">
        <Info className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-sky-900">💡 スプレッドシート（DB_Truck）との連携と部員への反映について：</p>
          <p className="text-sky-800 leading-relaxed">
            ・<strong>部員全員のスマホに反映させたい場合：</strong> Googleスプレッドシートの「<strong>DB_Truck</strong>」シートに行を追加・編集してください。全生徒がアプリを開いた際、または「リストを再読込」を押した際に最新の楽器リストが自動で反映されます。
          </p>
          <p className="text-sky-800 leading-relaxed">
            ・<strong>アプリ内の「機材を追加」ボタン：</strong> 遠征現場での緊急追加用です。この端末（自分のスマホ）にのみ保存されます。全員に共有したい楽器はスプレッドシートへの追加が確実です。
          </p>
        </div>
      </div>

      {/* List of Loading Items */}
      <div className="space-y-2.5">
        {sortedItems.map((it, idx) => {
          const isChecked = getIsChecked(it);

          return (
            <div
              key={it.id}
              className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                isChecked
                  ? 'bg-stone-100/70 border-stone-200 text-stone-400'
                  : 'bg-white border-stone-200 hover:border-amber-300 shadow-2xs'
              }`}
            >
              {/* Left part: Order + Checkbox + Name + Badges */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Checkbox toggle */}
                <button
                  onClick={() => handleToggleCheck(it.id)}
                  className="p-1 text-amber-600 hover:text-amber-700 transition-colors shrink-0"
                  aria-label={`${it.instrumentName}のチェックを切り替え`}
                >
                  {isChecked ? (
                    <CheckCircle2 className="w-7 h-7 text-emerald-600 fill-emerald-100" />
                  ) : (
                    <Circle className="w-7 h-7 text-stone-300 hover:text-amber-500" />
                  )}
                </button>

                {/* Order badge */}
                <div className="flex flex-col items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-stone-900 text-white font-mono font-bold text-xs shrink-0">
                  {it.order}
                </div>

                {/* Details */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <h4
                      className={`font-bold text-base sm:text-base leading-tight truncate ${
                        isChecked ? 'line-through text-stone-400' : 'text-stone-900'
                      }`}
                    >
                      {it.instrumentName}
                    </h4>

                    {it.part && it.part !== '全体' && (
                      <span className="text-[11px] text-stone-400 font-medium">({it.part})</span>
                    )}

                    {/* In 'all' view, show small tags for outbound/inbound */}
                    {activeDirection === 'all' && (
                      <div className="flex items-center gap-1 ml-auto sm:ml-0">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            it.loadedOutbound
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-stone-100 text-stone-500'
                          }`}
                        >
                          行き {it.loadedOutbound ? '済' : '未'}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            it.loadedInbound
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-stone-100 text-stone-500'
                          }`}
                        >
                          帰り {it.loadedInbound ? '済' : '未'}
                        </span>
                      </div>
                    )}
                  </div>

                  {it.cautions && (
                    <p className="text-xs text-stone-600 mt-0.5 font-medium">
                      備考: {it.cautions}
                    </p>
                  )}
                </div>
              </div>

              {/* Right part: Actions & Move up/down */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleMove(idx, 'up')}
                  disabled={idx === 0}
                  className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-100 disabled:opacity-20 transition-colors"
                  title="順序を上げる"
                >
                  <ArrowUp className="w-3.5 h-3.5 text-stone-600" />
                </button>
                <button
                  onClick={() => handleMove(idx, 'down')}
                  disabled={idx === sortedItems.length - 1}
                  className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-100 disabled:opacity-20 transition-colors"
                  title="順序を下げる"
                >
                  <ArrowDown className="w-3.5 h-3.5 text-stone-600" />
                </button>
                <button
                  onClick={() => handleDelete(it.id)}
                  className="p-1.5 rounded-lg text-stone-300 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="削除"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Safety & Loading Rule Callout */}
      <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl flex items-start gap-3 text-xs text-amber-950">
        <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">⚠️ トラック積込の基本鉄則：</p>
          <p>
            1. <strong>最奥・下段から順に積む</strong>：ティンパニ・バスドラム等の大型打楽器や重量物は一番奥へ。
          </p>
          <p>
            2. <strong>最手前に置くもの</strong>：ホール到着後に真っ先に使う「譜面台箱」「指揮台」「救急箱」はゲート直前に積み込みます。
          </p>
          <p>
            3. <strong>毛布・ベルト結束の徹底</strong>：楽器同士の接触破損を防ぐため、必ず専用カバー・毛布を挟んでラッシングベルトで固定してください。
          </p>
        </div>
      </div>

      {/* Spreadsheet Sync Modal */}
      <SpreadsheetSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        title="トラック積込リスト（DB_Truck）のスプレッドシート連携"
        dataTypeName="トラック積込リスト"
        defaultUrl={spreadsheetUrl}
        onSaveUrl={onSaveSpreadsheetUrl}
        onImportCSV={handleImportCSV}
        onExportCSV={handleExportCSV}
        sampleHeaders={[
          '順序',
          '楽器・機材名',
          '備考',
          '行き（チェックボックス）',
          '帰り（チェックボックス）',
        ]}
        sampleRows={[
          ['１', 'ティンパニ', 'ペダルロック確認', 'FALSE', 'FALSE'],
          ['２', 'バスドラ', 'スタンド同梱', 'FALSE', 'FALSE'],
          ['３', 'トランペット', '', 'FALSE', 'FALSE'],
        ]}
      />

      {/* In-app Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-stone-200 p-6 space-y-4">
            <h3 className="text-lg font-bold text-stone-900">積込機材の追加（緊急用）</h3>
            <p className="text-xs text-stone-500">
              ※ここでの追加はこのスマホ端末にのみ保存されます。全員に共有したい場合はスプレッドシートの「DB_Truck」シートに追加してください。
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">楽器・機材名 *</label>
                <input
                  type="text"
                  value={newItem.instrumentName}
                  onChange={(e) => setNewItem({ ...newItem, instrumentName: e.target.value })}
                  placeholder="例: マリンバ、譜面台箱、指揮台"
                  className="w-full p-2.5 border rounded-xl border-stone-300 text-sm"
                  autoFocus
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">備考・注意事項</label>
                <textarea
                  rows={2}
                  value={newItem.cautions}
                  onChange={(e) => setNewItem({ ...newItem, cautions: e.target.value })}
                  placeholder="例: 毛布養生、ベルト結束、一番手前に積む"
                  className="w-full p-2.5 border rounded-xl border-stone-300"
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
                  if (!newItem.instrumentName?.trim()) return;
                  const itemToAdd: LoadingItem = {
                    id: `load-manual-${Date.now()}`,
                    order: items.length + 1,
                    truckId: 'truck-1',
                    instrumentName: newItem.instrumentName.trim(),
                    category: 'equipment',
                    part: '全体',
                    quantity: 1,
                    caseType: '専用ケース',
                    locationInTruck: 'トラック荷台',
                    handler: '係',
                    cautions: newItem.cautions || '',
                    loaded: false,
                    loadedOutbound: false,
                    loadedInbound: false,
                  };
                  onUpdateItems([...items, itemToAdd]);
                  setIsAddModalOpen(false);
                }}
                className="px-4 py-2 text-xs font-semibold bg-stone-900 hover:bg-stone-800 text-white rounded-xl"
              >
                追加する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
