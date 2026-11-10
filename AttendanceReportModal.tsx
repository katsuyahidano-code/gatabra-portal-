import React, { useState } from 'react';
import {
  X,
  Send,
  Calendar,
  Clock,
  ExternalLink,
  CheckCircle2,
  Users,
  AlertCircle,
} from 'lucide-react';
import { AttendanceRecord, AttendanceStatus } from '../types';
import { getTodayStr } from '../utils/dateUtils';

interface AttendanceReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitRecord: (record: AttendanceRecord) => void;
  todayRecords: AttendanceRecord[];
  onOpenFullList?: () => void;
}

export const AttendanceReportModal: React.FC<AttendanceReportModalProps> = ({
  isOpen,
  onClose,
  onSubmitRecord,
  todayRecords,
  onOpenFullList,
}) => {
  const todayStr = getTodayStr();
  const [date, setDate] = useState(todayStr);
  const [studentName, setStudentName] = useState('');
  const [grade, setGrade] = useState<'1年' | '2年' | '3年'>('2年');
  const [part, setPart] = useState('Trumpet');
  const [status, setStatus] = useState<AttendanceStatus>('absent');
  const [timeInfo, setTimeInfo] = useState('');
  const [reason, setReason] = useState('');
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  if (!isOpen) return null;

  const parts = [
    'Flute',
    'Clarinet',
    'Alto Saxophone',
    'Tenor Saxophone',
    'Baritone Saxophone',
    'Trumpet',
    'Horn',
    'Trombone',
    'Euphonium',
    'Tuba',
    'Contrabass',
    'Percussion',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim() || !reason.trim()) {
      alert('氏名と理由は必須入力です。');
      return;
    }

    const newRecord: AttendanceRecord = {
      id: `rep-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      date,
      studentName: studentName.trim(),
      grade,
      part,
      status,
      timeInfo: status !== 'absent' ? timeInfo.trim() || undefined : undefined,
      reason: reason.trim(),
      reportedVia: 'app_manual',
    };

    onSubmitRecord(newRecord);
    setSubmittedSuccess(true);
    setTimeout(() => {
      setSubmittedSuccess(false);
      onClose();
      // Reset form
      setStudentName('');
      setReason('');
      setTimeInfo('');
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[92vh] flex flex-col border border-stone-200 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-100 bg-stone-50/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-stone-950 font-black flex items-center justify-center shadow-xs">
              📝
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-base leading-tight">
                部活動 出欠連絡・報告
              </h3>
              <p className="text-[11px] text-stone-500">
                本日の練習の欠席・遅刻・早退を届け出ます
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {submittedSuccess ? (
            <div className="py-10 text-center space-y-2">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto animate-bounce" />
              <h4 className="text-base font-bold text-stone-900">
                出欠連絡を受け付けました！
              </h4>
              <p className="text-stone-500 text-xs">
                練習予定・カレンダー・出欠一覧に即時反映されました。
              </p>
            </div>
          ) : (
            <>
              {/* Google Form Link Notice */}
              <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3">
                <div className="text-[11px] text-emerald-950 leading-relaxed">
                  <span className="font-bold block">💡 Googleフォーム出欠連絡</span>
                  公式フォームから提出した内容もスプレッドシート連動で自動反映されます。
                </div>
                <a
                  href="https://forms.gle/AX2eQ98ErY3q2wAS9"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1.5 text-[11px] font-bold bg-emerald-700 text-white rounded-xl hover:bg-emerald-800 shrink-0 flex items-center gap-1 shadow-2xs"
                >
                  <span>フォームを開く</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Attendance Form */}
              <form onSubmit={handleSubmit} className="space-y-3.5">
                {/* Date */}
                <div>
                  <label className="block font-bold text-stone-700 mb-1">対象の日付</label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Status Selection */}
                <div>
                  <label className="block font-bold text-stone-700 mb-1.5">出欠の区分</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setStatus('absent')}
                      className={`py-2 px-2 rounded-xl font-bold text-xs border text-center transition-all ${
                        status === 'absent'
                          ? 'bg-rose-50 border-rose-400 text-rose-700 ring-2 ring-rose-400/30'
                          : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      欠席
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatus('late')}
                      className={`py-2 px-2 rounded-xl font-bold text-xs border text-center transition-all ${
                        status === 'late'
                          ? 'bg-amber-50 border-amber-400 text-amber-800 ring-2 ring-amber-400/30'
                          : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      遅刻
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatus('early_leave')}
                      className={`py-2 px-2 rounded-xl font-bold text-xs border text-center transition-all ${
                        status === 'early_leave'
                          ? 'bg-blue-50 border-blue-400 text-blue-800 ring-2 ring-blue-400/30'
                          : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      早退
                    </button>
                  </div>
                </div>

                {/* Name & Grade */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="block font-bold text-stone-700 mb-1">氏名</label>
                    <input
                      type="text"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder="例: 山田 太郎"
                      required
                      className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">学年</label>
                    <select
                      value={grade}
                      onChange={(e) => setGrade(e.target.value as any)}
                      className="w-full px-2 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    >
                      <option value="1年">1年</option>
                      <option value="2年">2年</option>
                      <option value="3年">3年</option>
                    </select>
                  </div>
                </div>

                {/* Part & Time info */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-stone-700 mb-1">担当パート</label>
                    <select
                      value={part}
                      onChange={(e) => setPart(e.target.value)}
                      className="w-full px-2 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    >
                      {parts.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-stone-700 mb-1">
                      {status === 'absent' ? '時間（欠席時は不要）' : '合流 / 退出時刻'}
                    </label>
                    <input
                      type="text"
                      value={timeInfo}
                      disabled={status === 'absent'}
                      onChange={(e) => setTimeInfo(e.target.value)}
                      placeholder={status === 'late' ? '例: 17:00合流' : '例: 18:00退出'}
                      className="w-full px-3 py-2 border border-stone-300 rounded-xl disabled:bg-stone-100 disabled:text-stone-400 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Reason */}
                <div>
                  <label className="block font-bold text-stone-700 mb-1">理由・詳細</label>
                  <textarea
                    rows={2}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="例: 発熱・風邪のため休養 / 補習授業受講のため"
                    required
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-colors active:scale-[0.99]"
                >
                  <Send className="w-4 h-4" />
                  <span>出欠連絡を送信・反映する</span>
                </button>
              </form>

              {/* Today's report summary */}
              <div className="pt-3 border-t border-stone-100 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-stone-500 font-semibold">
                  <span>本日の届出部員 ({todayRecords.length}件)</span>
                  {onOpenFullList && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenFullList();
                      }}
                      className="text-amber-700 hover:underline"
                    >
                      出欠一覧を開く →
                    </button>
                  )}
                </div>

                {todayRecords.length === 0 ? (
                  <p className="text-[11px] text-stone-400 italic">本日届出のある部員はいません（全員出席）</p>
                ) : (
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {todayRecords.slice(0, 4).map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between p-2 bg-stone-50 rounded-xl border border-stone-200 text-[11px]"
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span
                            className={`px-1.5 py-0.2 rounded font-bold text-[9px] ${
                              r.status === 'absent'
                                ? 'bg-rose-100 text-rose-700'
                                : r.status === 'late'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {r.status === 'absent' ? '欠席' : r.status === 'late' ? '遅刻' : '早退'}
                          </span>
                          <span className="font-bold text-stone-900">{r.studentName}</span>
                          <span className="text-stone-400">({r.part})</span>
                        </div>
                        <span className="text-stone-500 text-[10px] truncate max-w-[120px]">
                          {r.timeInfo || r.reason}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
