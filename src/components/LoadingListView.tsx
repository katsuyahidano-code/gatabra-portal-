import React, { useState } from 'react';
import {
  Truck,
  CheckCircle2,
  Circle,
  FileSpreadsheet,
  Plus,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  RotateCcw,
  Trash2,
  Boxes,
  ShieldAlert,
} from 'lucide-react';
import { LoadingItem } from '../types';
import { SpreadsheetSyncModal } from './SpreadsheetSyncModal';
import {
  parseLoadingItemsFromCSV,
  exportToCSV,
} from '../utils/spreadsheetSync';

interface LoadingListViewProps {
  items: LoadingItem[];
  onUpdateItems: (items: LoadingItem[]) => void;
}

export const LoadingListView: React.FC<LoadingListViewProps> = ({
  items,
  onUpdateItems,
}) => {
  const [selectedTruck, setSelectedTruck] = useState<'all' | 'truck-1' | 'truck-2'>('truck-1');
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newItem, setNewItem] = useState<Partial<LoadingItem>>({
    truckId: 'truck-1',
    instrumentName: '',
    category: 'percussion_large',
    part: 'Percussion',
    quantity: 1,
    caseType: '専用ケース＋毛布',
    locationInTruck: '奥・下段',
    handler: '打楽器パート',
    cautions: '衝撃厳禁',
    loaded: false,
  });

  // Filter items by truck
  const filteredItems = items
    .filter((it) => (selectedTruck === 'all' ? true : it.truckId === selectedTruck))
    .sort((a, b) => a.order - b.order);

  const totalLoaded = filteredItems.filter((it) => it.loaded).length;
  const progressPercent =
    filteredItems.length > 0 ? Math.round((totalLoaded / filteredItems.length) * 100) : 0;

  // Toggle item loaded state
  const handleToggleLoaded = (id: string) => {
    onUpdateItems(
      items.map((it) => (it.id === id ? { ...it, loaded: !it.loaded } : it))
    );
  };

  // Move item up / down in order
  const handleMove = (index: number, direction: 'up' | 'down') => {
    const truckItems = [...filteredItems];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= truckItems.length) return;

    // Swap order values
    const current = truckItems[index];
    const neighbor = truckItems[targetIndex];
    const tempOrder = current.order;
    current.order = neighbor.order;
    neighbor.order = tempOrder;

    // Update global list
    const updated = items.map((it) => {
      if (it.id === current.id) return { ...it, order: current.order };
      if (it.id === neighbor.id) return { ...it, order: neighbor.order };
      return it;
    });
    onUpdateItems(updated);
  };

  // Reset all checkmarks for return trip
  const handleResetChecklist = () => {
    if (window.confirm('チェックをすべて解除してリセットしますか？（復路の積み込みなどに使用）')) {
      onUpdateItems(
        items.map((it) =>
          selectedTruck === 'all' || it.truckId === selectedTruck
            ? { ...it, loaded: false }
            : it
        )
      );
    }
  };

  // Delete item
  const handleDelete = (id: string) => {
    onUpdateItems(items.filter((it) => it.id !== id));
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
      '順序(No)',
      '号車(1号車/2号車)',
      '楽器・機材名',
      'パート',
      '数量',
      'ケース種別',
      '積込位置',
      '担当者',
      '注意事項・養生',
      '積込完了(TRUE/FALSE)',
    ];
    const rows = items.map((it) => [
      it.order,
      it.truckId === 'truck-1' ? '1号車' : '2号車',
      it.instrumentName,
      it.part,
      it.quantity,
      it.caseType,
      it.locationInTruck,
      it.handler,
      it.cautions,
      it.loaded ? 'TRUE' : 'FALSE',
    ]);
    exportToCSV('ガタブラ_トラック積込リスト.csv', headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                <Truck className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-stone-900 tracking-tight">
                トラック楽器積込順リスト
              </h2>
            </div>
            <p className="text-xs text-stone-500 mt-1">
              遠征や演奏会でトラックに楽器を詰め込む順番（奥・下段から手前・上段へ）を管理します。
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsSyncModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl hover:bg-emerald-100 transition-colors shadow-2xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span>スプレッドシート連携</span>
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>機材を追加</span>
            </button>
          </div>
        </div>

        {/* Truck Switcher & Progress Bar */}
        <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 p-1 bg-white rounded-xl border border-stone-200 text-xs font-semibold">
              <button
                onClick={() => setSelectedTruck('truck-1')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  selectedTruck === 'truck-1'
                    ? 'bg-amber-600 text-white shadow-xs font-bold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                1号車（大型打楽器・低音金管）
              </button>
              <button
                onClick={() => setSelectedTruck('truck-2')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  selectedTruck === 'truck-2'
                    ? 'bg-amber-600 text-white shadow-xs font-bold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                2号車（木管・ユーフォ・衣装）
              </button>
              <button
                onClick={() => setSelectedTruck('all')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  selectedTruck === 'all'
                    ? 'bg-amber-600 text-white shadow-xs font-bold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                全車両一覧
              </button>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-stone-600">
                積込完了: <span className="text-stone-900 font-bold">{totalLoaded}</span> /{' '}
                {filteredItems.length} 品 ({progressPercent}%)
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
            3. <strong>毛布・ベルト結束の徹底</strong>：コントラバスやマリンバパイプの上に重い荷物を絶対に積まないこと。
          </p>
        </div>
      </div>

      {/* List of Loading Items */}
      <div className="space-y-3">
        {filteredItems.map((it, idx) => (
          <div
            key={it.id}
            className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              it.loaded
                ? 'bg-stone-100/70 border-stone-200 text-stone-500'
                : 'bg-white border-stone-200 hover:border-amber-300 shadow-2xs'
            }`}
          >
            {/* Left part: Order + Checkbox + Info */}
            <div className="flex items-start gap-3">
              {/* Checkbox toggle */}
              <button
                onClick={() => handleToggleLoaded(it.id)}
                className="p-1 text-amber-600 hover:text-amber-700 transition-colors mt-0.5 shrink-0"
              >
                {it.loaded ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 fill-emerald-100" />
                ) : (
                  <Circle className="w-6 h-6 text-stone-300 hover:text-amber-500" />
                )}
              </button>

              {/* Order badge */}
              <div className="flex flex-col items-center justify-center w-8 h-8 rounded-lg bg-stone-900 text-white font-mono font-black text-xs shrink-0">
                {it.order}
              </div>

              {/* Details */}
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4
                    className={`font-bold text-sm ${
                      it.loaded ? 'line-through text-stone-400' : 'text-stone-900'
                    }`}
                  >
                    {it.instrumentName}
                  </h4>
                  <span className="px-2 py-0.5 bg-stone-100 text-stone-700 rounded text-[11px] font-semibold">
                    {it.quantity} 点
                  </span>
                  <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded text-[11px] font-medium">
                    {it.truckId === 'truck-1' ? '1号車' : '2号車'}
                  </span>
                  <span className="text-xs text-stone-400">({it.part})</span>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500">
                  <span>
                    <strong>位置:</strong> {it.locationInTruck}
                  </span>
                  <span>
                    <strong>ケース:</strong> {it.caseType}
                  </span>
                  <span>
                    <strong>担当:</strong> {it.handler}
                  </span>
                </div>

                {it.cautions && (
                  <p className="text-xs font-semibold text-rose-700 bg-rose-50/80 px-2 py-0.5 rounded border border-rose-200/60 inline-block">
                    {it.cautions}
                  </p>
                )}
              </div>
            </div>

            {/* Right part: Actions & Move up/down */}
            <div className="flex items-center gap-1.5 self-end sm:self-center pl-10 sm:pl-0">
              <button
                onClick={() => handleMove(idx, 'up')}
                disabled={idx === 0}
                className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-100 disabled:opacity-30 transition-colors"
                title="順序を上げる（より奥に積む）"
              >
                <ArrowUp className="w-3.5 h-3.5 text-stone-600" />
              </button>
              <button
                onClick={() => handleMove(idx, 'down')}
                disabled={idx === filteredItems.length - 1}
                className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-100 disabled:opacity-30 transition-colors"
                title="順序を下げる（より手前に積む）"
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
        ))}
      </div>

      {/* Spreadsheet Sync Modal */}
      <SpreadsheetSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        title="トラック積込リストのスプレッドシート連携"
        dataTypeName="トラック積込リスト"
        defaultUrl=""
        onImportCSV={handleImportCSV}
        onExportCSV={handleExportCSV}
        sampleHeaders={[
          '順序(No)',
          '号車(1号車/2号車)',
          '楽器・機材名',
          'パート',
          '数量',
          'ケース種別',
          '積込位置',
          '担当者',
          '注意事項',
        ]}
        sampleRows={[
          [
            '1',
            '1号車',
            'ティンパニ 4台',
            'Percussion',
            '4',
            '専用カバー＋毛布',
            '奥・下段',
            '打楽器全員',
            'ペダルロック厳禁',
          ],
        ]}
      />

      {/* In-app Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-stone-200 p-6 space-y-4">
            <h3 className="text-lg font-bold text-stone-900">積込機材の新規追加</h3>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">トラック号車</label>
                  <select
                    value={newItem.truckId}
                    onChange={(e) =>
                      setNewItem({ ...newItem, truckId: e.target.value as any })
                    }
                    className="w-full p-2 border rounded-xl border-stone-300"
                  >
                    <option value="truck-1">1号車（大型打楽器・低音）</option>
                    <option value="truck-2">2号車（木管・ユーフォ・衣装）</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">担当パート</label>
                  <input
                    type="text"
                    value={newItem.part}
                    onChange={(e) => setNewItem({ ...newItem, part: e.target.value })}
                    placeholder="Percussion / Tuba等"
                    className="w-full p-2 border rounded-xl border-stone-300"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">楽器・機材名</label>
                <input
                  type="text"
                  value={newItem.instrumentName}
                  onChange={(e) => setNewItem({ ...newItem, instrumentName: e.target.value })}
                  placeholder="例: マリンバ 4.3オクターブ"
                  className="w-full p-2 border rounded-xl border-stone-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">数量</label>
                  <input
                    type="number"
                    min={1}
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({ ...newItem, quantity: Number(e.target.value) })}
                    className="w-full p-2 border rounded-xl border-stone-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">ケース種別</label>
                  <input
                    type="text"
                    value={newItem.caseType}
                    onChange={(e) => setNewItem({ ...newItem, caseType: e.target.value })}
                    placeholder="ハードケース / 専用カバー"
                    className="w-full p-2 border rounded-xl border-stone-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">トラック内の位置</label>
                  <input
                    type="text"
                    value={newItem.locationInTruck}
                    onChange={(e) => setNewItem({ ...newItem, locationInTruck: e.target.value })}
                    placeholder="奥・下段 / 手前・上段"
                    className="w-full p-2 border rounded-xl border-stone-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">積込担当者</label>
                  <input
                    type="text"
                    value={newItem.handler}
                    onChange={(e) => setNewItem({ ...newItem, handler: e.target.value })}
                    placeholder="打楽器3名 / 1年男子"
                    className="w-full p-2 border rounded-xl border-stone-300"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">注意事項・養生</label>
                <textarea
                  rows={2}
                  value={newItem.cautions}
                  onChange={(e) => setNewItem({ ...newItem, cautions: e.target.value })}
                  placeholder="上に物乗せ厳禁、毛布2枚養生、ベルト結束など"
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
                  if (!newItem.instrumentName?.trim()) return;
                  const itemToAdd: LoadingItem = {
                    id: `load-${Date.now()}`,
                    order: items.length + 1,
                    truckId: newItem.truckId || 'truck-1',
                    instrumentName: newItem.instrumentName.trim(),
                    category: newItem.category || 'equipment',
                    part: newItem.part || '共通',
                    quantity: newItem.quantity || 1,
                    caseType: newItem.caseType || 'ケース',
                    locationInTruck: newItem.locationInTruck || '下段',
                    handler: newItem.handler || '担当係',
                    cautions: newItem.cautions || '',
                    loaded: false,
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
