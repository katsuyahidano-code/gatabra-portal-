import React, { useState } from 'react';
import {
  Music,
  Search,
  Filter,
  FileSpreadsheet,
  Plus,
  Clock,
  Archive,
  User,
  Trash2,
  Tag,
  CheckCircle2,
} from 'lucide-react';
import { MusicScore, ScoreGenre, ScoreStatus, ScoreCondition } from '../types';
import { SpreadsheetSyncModal } from './SpreadsheetSyncModal';
import {
  parseMusicScoresFromCSV,
  exportToCSV,
} from '../utils/spreadsheetSync';

interface ScoreInventoryViewProps {
  scores: MusicScore[];
  onUpdateScores: (scores: MusicScore[]) => void;
}

export const ScoreInventoryView: React.FC<ScoreInventoryViewProps> = ({
  scores,
  onUpdateScores,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<'all' | ScoreGenre>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | ScoreStatus>('all');
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [editingScore, setEditingScore] = useState<Partial<MusicScore>>({
    managementNumber: `BR-${String(scores.length + 1).padStart(3, '0')}`,
    title: '',
    composer: '',
    arranger: '',
    genre: 'コンクール自由曲',
    grade: 4,
    duration: '6分30秒',
    storageLocation: '楽譜庫 A棚',
    scoreCondition: 'スコア・パート譜完備',
    status: '保管中',
    borrowedBy: '',
    notes: '',
  });

  // Filtered list
  const filteredScores = scores.filter((s) => {
    if (selectedGenre !== 'all' && s.genre !== selectedGenre) return false;
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        s.title.toLowerCase().includes(q) ||
        s.composer.toLowerCase().includes(q) ||
        (s.arranger && s.arranger.toLowerCase().includes(q)) ||
        s.managementNumber.toLowerCase().includes(q) ||
        s.storageLocation.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const getGenreBadge = (genre: ScoreGenre) => {
    switch (genre) {
      case 'コンクール自由曲':
        return { label: '自由曲', bg: 'bg-amber-100 text-amber-900 border-amber-300' };
      case 'コンクール課題曲':
        return { label: '課題曲', bg: 'bg-emerald-100 text-emerald-900 border-emerald-300' };
      case 'ポップス':
        return { label: 'ポップス', bg: 'bg-rose-100 text-rose-900 border-rose-300' };
      case 'マーチ':
        return { label: 'マーチ', bg: 'bg-blue-100 text-blue-900 border-blue-300' };
      case 'クラシック編曲':
        return { label: 'クラシック編曲', bg: 'bg-indigo-100 text-indigo-900 border-indigo-300' };
      case 'アンサンブル':
        return { label: 'アンサンブル', bg: 'bg-purple-100 text-purple-900 border-purple-300' };
      case '式典・行事':
        return { label: '式典・行事', bg: 'bg-stone-100 text-stone-700 border-stone-300' };
      default:
        return { label: genre, bg: 'bg-stone-100 text-stone-700 border-stone-300' };
    }
  };

  const getStatusBadge = (status: ScoreStatus) => {
    switch (status) {
      case '保管中':
        return { label: '楽譜庫に保管中', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
      case '現在練習中':
        return { label: '現在練習配布中', color: 'text-amber-700 bg-amber-50 border-amber-200' };
      case '貸出中':
        return { label: '個人・外部貸出中', color: 'text-rose-700 bg-rose-50 border-rose-200' };
    }
  };

  // Import from CSV
  const handleImportCSV = (csvText: string) => {
    const parsed = parseMusicScoresFromCSV(csvText);
    if (parsed.length > 0) {
      onUpdateScores(parsed);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      '管理番号',
      '曲名',
      '作曲者',
      '編曲者',
      'ジャンル',
      'グレード',
      '演奏時間',
      '保管場所',
      '状態',
      '貸出状況',
      '借用者',
      '備考',
    ];
    const rows = scores.map((s) => [
      s.managementNumber,
      s.title,
      s.composer,
      s.arranger || '',
      s.genre,
      s.grade,
      s.duration,
      s.storageLocation,
      s.scoreCondition,
      s.status,
      s.borrowedBy || '',
      s.notes || '',
    ]);
    exportToCSV('ガタブラ_所持楽譜目録.csv', headers, rows);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('この楽譜データを削除しますか？')) {
      onUpdateScores(scores.filter((s) => s.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                <Music className="w-5 h-5" />
              </span>
              <h2 className="text-xl font-bold text-stone-900 tracking-tight">
                所持楽譜ライブラリ・目録
              </h2>
            </div>
            <p className="text-xs text-stone-500 mt-1">
              部で保管しているスコア・パート譜、現在の練習配布状況、保管棚の位置を検索・管理できます。
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsSyncModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl hover:bg-emerald-100 transition-colors shadow-2xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span>楽譜スプレッドシート連携</span>
            </button>

            <button
              onClick={() => {
                setEditingScore({
                  managementNumber: `BR-${String(scores.length + 1).padStart(3, '0')}`,
                  title: '',
                  composer: '',
                  arranger: '',
                  genre: 'コンクール自由曲',
                  grade: 4,
                  duration: '6分30秒',
                  storageLocation: '楽譜庫 A棚',
                  scoreCondition: 'スコア・パート譜完備',
                  status: '保管中',
                  borrowedBy: '',
                  notes: '',
                });
                setIsAddModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>楽譜を登録</span>
            </button>
          </div>
        </div>

        {/* Quick metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200">
            <span className="text-[11px] font-semibold text-stone-500 block">総所持楽譜数</span>
            <span className="text-xl font-black text-stone-900">{scores.length} 曲</span>
          </div>

          <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200/70">
            <span className="text-[11px] font-semibold text-amber-800 block">現在練習配布中</span>
            <span className="text-xl font-black text-amber-900">
              {scores.filter((s) => s.status === '現在練習中').length} 曲
            </span>
          </div>

          <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200/60">
            <span className="text-[11px] font-semibold text-emerald-800 block">楽譜庫保管中</span>
            <span className="text-xl font-black text-emerald-900">
              {scores.filter((s) => s.status === '保管中').length} 曲
            </span>
          </div>

          <div className="p-3.5 bg-rose-50/60 rounded-xl border border-rose-200/60">
            <span className="text-[11px] font-semibold text-rose-800 block">個人貸出中</span>
            <span className="text-xl font-black text-rose-900">
              {scores.filter((s) => s.status === '貸出中').length} 曲
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="曲名、作曲者、編曲者、管理番号、保管棚で検索..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-stone-400" />
              <span className="text-stone-500 font-medium">ジャンル:</span>
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value as any)}
                className="p-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs"
              >
                <option value="all">すべてのジャンル</option>
                <option value="コンクール自由曲">コンクール自由曲</option>
                <option value="コンクール課題曲">コンクール課題曲</option>
                <option value="ポップス">ポップス</option>
                <option value="マーチ">マーチ</option>
                <option value="クラシック編曲">クラシック編曲</option>
                <option value="アンサンブル">アンサンブル</option>
                <option value="式典・行事">式典・行事</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-stone-500 font-medium">状態:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="p-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs"
              >
                <option value="all">すべて</option>
                <option value="保管中">楽譜庫に保管中</option>
                <option value="現在練習中">現在練習配布中</option>
                <option value="貸出中">貸出中</option>
              </select>
            </div>
          </div>
        </div>

        <div className="text-xs text-stone-500 flex justify-between items-center pt-2 border-t border-stone-100">
          <span>
            検索結果: <strong className="text-stone-900">{filteredScores.length}</strong> 曲
          </span>
          <button
            onClick={handleExportCSV}
            className="text-amber-700 hover:text-amber-800 font-semibold hover:underline"
          >
            目録をCSVダウンロード
          </button>
        </div>
      </div>

      {/* Scores Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredScores.map((score) => (
          <div
            key={score.id}
            className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs hover:border-amber-300 transition-all flex flex-col justify-between space-y-4"
          >
            <div className="space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <span className="px-2 py-0.5 font-mono text-[11px] font-bold bg-stone-100 text-stone-700 rounded">
                  {score.managementNumber}
                </span>

                <div className="flex items-center gap-1.5">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      getGenreBadge(score.genre).bg
                    }`}
                  >
                    {getGenreBadge(score.genre).label}
                  </span>
                  <button
                    onClick={() => handleDelete(score.id)}
                    className="text-stone-300 hover:text-rose-600 p-0.5 transition-colors"
                    title="削除"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-stone-900 text-base leading-snug">
                  {score.title}
                </h3>
                <p className="text-xs text-stone-600 mt-0.5">
                  作: {score.composer}
                  {score.arranger && <span> (編: {score.arranger})</span>}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-stone-500 pt-1">
                <div className="flex items-center gap-1">
                  <Tag className="w-3 h-3 text-stone-400" />
                  <span>Grade: {score.grade}</span>
                </div>
                {score.duration && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-stone-400" />
                    <span>演奏時間: {score.duration}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1 text-[11px] text-stone-600 bg-stone-50 p-2 rounded-lg border border-stone-100">
                <Archive className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                <span className="truncate">
                  <strong>保管:</strong> {score.storageLocation}
                </span>
              </div>

              <div className="text-[11px] text-stone-500 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>{score.scoreCondition}</span>
              </div>

              {score.notes && (
                <p className="text-[11px] text-stone-500 line-clamp-2 italic">
                  {score.notes}
                </p>
              )}
            </div>

            {/* Bottom: Status & Borrower */}
            <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
              <span
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                  getStatusBadge(score.status).color
                }`}
              >
                {getStatusBadge(score.status).label}
              </span>

              {score.borrowedBy && (
                <span className="text-stone-600 font-medium text-[11px] flex items-center gap-1 truncate max-w-[140px]">
                  <User className="w-3 h-3 text-stone-400" />
                  {score.borrowedBy}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Spreadsheet Sync Modal */}
      <SpreadsheetSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        title="所持楽譜スプレッドシート連携"
        dataTypeName="楽譜目録データ"
        defaultUrl=""
        onImportCSV={handleImportCSV}
        onExportCSV={handleExportCSV}
        sampleHeaders={[
          '管理番号',
          '曲名',
          '作曲者',
          '編曲者',
          'ジャンル(自由曲/課題曲/ポップス/マーチ/クラシック/アンサンブル)',
          'グレード(1-6)',
          '演奏時間',
          '保管場所',
          '譜面状態',
          '貸出状況(保管中/現在練習中/貸出中)',
          '借用者',
          '備考',
        ]}
        sampleRows={[
          [
            'BR-001',
            '宝島 (TAKARAJIMA)',
            '和泉宏隆',
            '真島俊夫',
            'ポップス',
            '4',
            '5分00秒',
            '楽譜庫 A棚-3番ボックス',
            'スコア・パート譜完備',
            '現在練習中',
            'パート全員配布中',
            '定番アンコール曲',
          ],
        ]}
      />

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-stone-200 p-6 space-y-4">
            <h3 className="text-lg font-bold text-stone-900">所持楽譜の新規登録</h3>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">管理コード</label>
                  <input
                    type="text"
                    value={editingScore.managementNumber}
                    onChange={(e) =>
                      setEditingScore({ ...editingScore, managementNumber: e.target.value })
                    }
                    className="w-full p-2 border rounded-xl border-stone-300 font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-semibold text-stone-700 mb-1">ジャンル</label>
                  <select
                    value={editingScore.genre}
                    onChange={(e) =>
                      setEditingScore({ ...editingScore, genre: e.target.value as any })
                    }
                    className="w-full p-2 border rounded-xl border-stone-300"
                  >
                    <option value="コンクール自由曲">コンクール自由曲</option>
                    <option value="コンクール課題曲">コンクール課題曲</option>
                    <option value="ポップス">ポップス</option>
                    <option value="マーチ">マーチ</option>
                    <option value="クラシック編曲">クラシック編曲</option>
                    <option value="アンサンブル">アンサンブル</option>
                    <option value="式典・行事">式典・行事</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">曲名</label>
                <input
                  type="text"
                  value={editingScore.title}
                  onChange={(e) => setEditingScore({ ...editingScore, title: e.target.value })}
                  placeholder="例: アルメニアン・ダンス パートI"
                  className="w-full p-2 border rounded-xl border-stone-300 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">作曲者</label>
                  <input
                    type="text"
                    value={editingScore.composer}
                    onChange={(e) => setEditingScore({ ...editingScore, composer: e.target.value })}
                    placeholder="A.リード"
                    className="w-full p-2 border rounded-xl border-stone-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">編曲者（あれば）</label>
                  <input
                    type="text"
                    value={editingScore.arranger}
                    onChange={(e) => setEditingScore({ ...editingScore, arranger: e.target.value })}
                    placeholder="なし / 編曲者名"
                    className="w-full p-2 border rounded-xl border-stone-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">グレード (1-6)</label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={editingScore.grade}
                    onChange={(e) =>
                      setEditingScore({ ...editingScore, grade: Number(e.target.value) })
                    }
                    className="w-full p-2 border rounded-xl border-stone-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">演奏時間</label>
                  <input
                    type="text"
                    value={editingScore.duration}
                    onChange={(e) => setEditingScore({ ...editingScore, duration: e.target.value })}
                    placeholder="11分30秒"
                    className="w-full p-2 border rounded-xl border-stone-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">状態</label>
                  <select
                    value={editingScore.status}
                    onChange={(e) =>
                      setEditingScore({ ...editingScore, status: e.target.value as any })
                    }
                    className="w-full p-2 border rounded-xl border-stone-300"
                  >
                    <option value="保管中">楽譜庫に保管中</option>
                    <option value="現在練習中">現在練習配布中</option>
                    <option value="貸出中">貸出中</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">保管棚・場所</label>
                  <input
                    type="text"
                    value={editingScore.storageLocation}
                    onChange={(e) =>
                      setEditingScore({ ...editingScore, storageLocation: e.target.value })
                    }
                    placeholder="楽譜庫 B棚-2番"
                    className="w-full p-2 border rounded-xl border-stone-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">譜面揃い状況</label>
                  <select
                    value={editingScore.scoreCondition}
                    onChange={(e) =>
                      setEditingScore({ ...editingScore, scoreCondition: e.target.value as any })
                    }
                    className="w-full p-2 border rounded-xl border-stone-300"
                  >
                    <option value="スコア・パート譜完備">スコア・パート譜完備</option>
                    <option value="パート譜一部欠損あり">パート譜一部欠損あり</option>
                    <option value="フルスコアのみ">フルスコアのみ</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">借用者・配布先</label>
                <input
                  type="text"
                  value={editingScore.borrowedBy}
                  onChange={(e) =>
                    setEditingScore({ ...editingScore, borrowedBy: e.target.value })
                  }
                  placeholder="部員全員 / 〇〇君"
                  className="w-full p-2 border rounded-xl border-stone-300"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">備考・演奏歴</label>
                <textarea
                  rows={2}
                  value={editingScore.notes}
                  onChange={(e) => setEditingScore({ ...editingScore, notes: e.target.value })}
                  placeholder="コンクール自由曲、フルスコア1・コンデンススコア1など"
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
                  if (!editingScore.title?.trim()) return;
                  const newScore: MusicScore = {
                    id: `score-${Date.now()}`,
                    managementNumber:
                      editingScore.managementNumber || `BR-${Date.now().toString().slice(-3)}`,
                    title: editingScore.title.trim(),
                    composer: editingScore.composer || '不明',
                    arranger: editingScore.arranger,
                    genre: editingScore.genre || 'コンクール自由曲',
                    grade: editingScore.grade || 3,
                    duration: editingScore.duration || '5分00秒',
                    storageLocation: editingScore.storageLocation || '楽譜庫',
                    scoreCondition: editingScore.scoreCondition || 'スコア・パート譜完備',
                    status: editingScore.status || '保管中',
                    borrowedBy: editingScore.borrowedBy,
                    notes: editingScore.notes,
                  };
                  onUpdateScores([newScore, ...scores]);
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
