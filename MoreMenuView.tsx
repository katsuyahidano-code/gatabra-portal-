import React from 'react';
import {
  Music,
  Users,
  FileSpreadsheet,
  RotateCcw,
  ChevronRight,
  Sparkles,
  Layers,
  Wrench,
  Receipt,
  FileText,
  Info,
  ShieldCheck,
} from 'lucide-react';

interface MoreMenuViewProps {
  onOpenScores: () => void;
  onOpenAttendance: () => void;
  onResetData: () => void;
  scoreCount: number;
  attendanceCount: number;
}

export const MoreMenuView: React.FC<MoreMenuViewProps> = ({
  onOpenScores,
  onOpenAttendance,
  onResetData,
  scoreCount,
  attendanceCount,
}) => {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Title Card */}
      <div className="bg-white rounded-3xl border border-stone-200 p-5 sm:p-6 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold text-xl">
            <Layers className="w-6 h-6 text-emerald-700" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-stone-900 tracking-tight">
              その他・各種管理メニュー
            </h2>
            <p className="text-xs text-stone-500">
              楽譜庫の管理や出欠台帳、今後追加される便利機能はこちらからアクセスできます
            </p>
          </div>
        </div>
      </div>

      {/* Main Action Modules */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider px-1">
          現在利用可能な機能
        </h3>

        {/* 1. 所持楽譜 (USER EXPLICIT REQUIREMENT) */}
        <div
          onClick={onOpenScores}
          className="bg-white rounded-2xl border border-stone-200 p-4 shadow-2xs hover:border-emerald-400 hover:shadow-xs transition-all cursor-pointer group flex items-center justify-between"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-xs">
              <Music className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-stone-900 text-sm group-hover:text-emerald-800 transition-colors">
                  所持楽譜ライブラリ・目録
                </h4>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-800 rounded-full border border-emerald-200">
                  {scoreCount}曲 登録中
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                部室の保管棚番号、パート譜完備状況、現在練習中/個人貸出中ステータス管理
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-stone-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
        </div>

        {/* 2. 出欠台帳・Googleフォーム連携一覧 */}
        <div
          onClick={onOpenAttendance}
          className="bg-white rounded-2xl border border-stone-200 p-4 shadow-2xs hover:border-emerald-400 hover:shadow-xs transition-all cursor-pointer group flex items-center justify-between"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-800 text-white flex items-center justify-center shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-stone-900 text-sm group-hover:text-emerald-800 transition-colors">
                  出欠台帳・Googleフォーム届出一覧
                </h4>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-900 rounded-full border border-emerald-200">
                  {attendanceCount}件 記録
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                全期間の出欠検索、パート別絞り込み、手動登録、Googleフォーム回答CSV同期
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-stone-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
        </div>
      </div>

      {/* Expansion area: Upcoming features */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider">
            今後追加予定の機能（開発・準備中）
          </h3>
          <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            順次拡充エリア
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Feature 1 */}
          <div className="bg-white/80 rounded-2xl border border-stone-200/80 p-3.5 opacity-85 hover:opacity-100 transition-opacity">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-stone-100 rounded-xl text-stone-600">
                <Receipt className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h5 className="font-bold text-stone-900 text-xs">部費・集金管理</h5>
                  <span className="text-[9px] bg-stone-100 text-stone-500 px-1.5 py-0.2 rounded">準備中</span>
                </div>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  月部費・楽譜代・遠征交通費の納入状況チェック
                </p>
              </div>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="bg-white/80 rounded-2xl border border-stone-200/80 p-3.5 opacity-85 hover:opacity-100 transition-opacity">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-stone-100 rounded-xl text-stone-600">
                <Wrench className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h5 className="font-bold text-stone-900 text-xs">楽器備品・修理台帳</h5>
                  <span className="text-[9px] bg-stone-100 text-stone-500 px-1.5 py-0.2 rounded">準備中</span>
                </div>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  学校備品楽器の製造番号・リペア履歴・点検管理
                </p>
              </div>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="bg-white/80 rounded-2xl border border-stone-200/80 p-3.5 opacity-85 hover:opacity-100 transition-opacity sm:col-span-2">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-stone-100 rounded-xl text-stone-600">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h5 className="font-bold text-stone-900 text-xs">演奏会進行・プログラム</h5>
                  <span className="text-[9px] bg-stone-100 text-stone-500 px-1.5 py-0.2 rounded">準備中</span>
                </div>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  定期演奏会・コンクールのステージ進行表、アナウンス原稿、照明・譜面台配置図
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* System Settings & Reset */}
      <div className="bg-stone-50 rounded-2xl border border-stone-200 p-4 space-y-3">
        <h4 className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-stone-500" />
          <span>システム設定・データ</span>
        </h4>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          <div className="text-[11px] text-stone-500">
            端末のローカルストレージに最新状態が自動保存されています。
          </div>

          <button
            onClick={onResetData}
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-stone-600 bg-white hover:bg-stone-100 border border-stone-300 rounded-xl transition-colors shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5 text-stone-500" />
            <span>サンプルデータを復元</span>
          </button>
        </div>
      </div>
    </div>
  );
};
