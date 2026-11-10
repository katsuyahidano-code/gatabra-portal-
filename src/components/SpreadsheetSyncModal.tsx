import React, { useState } from 'react';
import { FileSpreadsheet, Download, Upload, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { fetchSpreadsheetCSV } from '../utils/spreadsheetSync';

interface SpreadsheetSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  dataTypeName: string;
  defaultUrl?: string;
  onImportCSV: (csvText: string) => void;
  onExportCSV: () => void;
  sampleHeaders: string[];
  sampleRows: string[][];
  onUrlSave?: (url: string) => void;
}

export const SpreadsheetSyncModal: React.FC<SpreadsheetSyncModalProps> = ({
  isOpen,
  onClose,
  title,
  dataTypeName,
  defaultUrl = '',
  onImportCSV,
  onExportCSV,
  sampleHeaders,
  sampleRows,
  onUrlSave,
}) => {
  const [url, setUrl] = useState(defaultUrl);
  const [pastedCSV, setPastedCSV] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'url' | 'paste' | 'file'>('url');
  const [showGasGuide, setShowGasGuide] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen) return null;

  const handleSyncUrl = async () => {
    if (!url.trim()) {
      setError('スプレッドシートのURLを入力してください');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const csvText = await fetchSpreadsheetCSV(url.trim());
      onImportCSV(csvText);
      onUrlSave?.(url.trim());
      setSuccess(`${dataTypeName}を取り込みました！`);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'スプレッドシートの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handlePasteSubmit = () => {
    if (!pastedCSV.trim()) {
      setError('CSVまたはTSVテキストを貼り付けてください');
      return;
    }
    try {
      onImportCSV(pastedCSV);
      setSuccess(`${dataTypeName}を取り込みました！`);
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || '取り込みに失敗しました');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (text) {
        try {
          onImportCSV(text);
          setSuccess(`${file.name} から${dataTypeName}を取り込みました！`);
          setTimeout(() => {
            onClose();
          }, 1000);
        } catch (err: any) {
          setError('ファイルの解析に失敗しました');
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-stone-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-stone-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-800 text-lg">{title}</h3>
              <p className="text-xs text-stone-500">GoogleスプレッドシートやCSVファイルと連携・同期します</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 p-1.5 rounded-lg hover:bg-stone-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-stone-100 px-6 pt-3 gap-4">
          <button
            onClick={() => setActiveTab('url')}
            className={`pb-2.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'url'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-stone-500 hover:text-stone-700'
            }`}
          >
            URLから自動同期
          </button>
          <button
            onClick={() => setActiveTab('paste')}
            className={`pb-2.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'paste'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-stone-500 hover:text-stone-700'
            }`}
          >
            テキスト貼り付け
          </button>
          <button
            onClick={() => setActiveTab('file')}
            className={`pb-2.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'file'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-stone-500 hover:text-stone-700'
            }`}
          >
            CSVファイル読込
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-2 text-sm text-rose-700">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="leading-relaxed">{error}</div>
              </div>
              <div className="bg-white/90 p-2.5 rounded-lg border border-rose-200 text-xs text-stone-700 space-y-1">
                <p className="font-semibold text-rose-800">💡 最も確実でかんたんな解決策：</p>
                <p>スプレッドシートを開き、キーボードで <strong>Ctrl + A</strong>（全選択）→ <strong>Ctrl + C</strong>（コピー）して、上部の<strong>「テキスト貼り付け」</strong>タブに貼り付けてみてください。通信やアクセス権に関係なく1秒で確実に反映されます。</p>
              </div>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-sm text-emerald-700">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <div>{success}</div>
            </div>
          )}

          {activeTab === 'url' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  GoogleスプレッドシートのURL（閲覧権限が必要です）
                </label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/1xxxx.../edit"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-600 space-y-2">
                <p className="font-semibold text-stone-800">💡 連携URLについて（2つの方法）：</p>
                <div className="space-y-1 pl-1">
                  <p><strong>① スプレッドシートURL：</strong> 右上「共有」で「リンクを知っている全員が閲覧可」になっているURL</p>
                  <p><strong>② Google Apps Script（GAS）URL【一番おすすめ・完全自動化】：</strong> フォーム送信と100%全自動・リアルタイム連動します。</p>
                </div>

                <div className="pt-1 border-t border-stone-200">
                  <button
                    type="button"
                    onClick={() => setShowGasGuide(!showGasGuide)}
                    className="text-emerald-700 hover:text-emerald-800 font-semibold underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>{showGasGuide ? '▲ Google Apps Script（1分で完了）の手順を閉じる' : '▼ Google Apps Scriptで出欠を完全自動更新する手順（クリック）'}</span>
                  </button>

                  {showGasGuide && (
                    <div className="mt-2.5 p-3 bg-white rounded-lg border border-emerald-200 space-y-2 text-[11px] text-stone-700">
                      <p className="font-bold text-emerald-900">【手順（スプレッドシート側で1回設定するだけ）】</p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>スプレッドシートのメニュー <strong>「拡張機能」→「Apps Script」</strong> を開く</li>
                        <li>エディタの内容を消し、下のコードをそのまま貼り付ける：</li>
                      </ol>

                      <div className="relative">
                        <pre className="p-2.5 bg-stone-900 text-emerald-300 font-mono text-[10px] rounded-lg overflow-x-auto">
{`function doGet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Raw_Form_Responses") || ss.getSheets()[0];
  const data = sheet.getDataRange().getValues();
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}`}
                        </pre>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(
`function doGet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Raw_Form_Responses") || ss.getSheets()[0];
  const data = sheet.getDataRange().getValues();
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}`
                            );
                            setCopiedCode(true);
                            setTimeout(() => setCopiedCode(false), 2000);
                          }}
                          className="absolute top-1.5 right-1.5 px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold"
                        >
                          {copiedCode ? 'コピー完了！' : 'コードをコピー'}
                        </button>
                      </div>

                      <ol start={3} className="list-decimal list-inside space-y-1">
                        <li>右上の <strong>「デプロイ」→「新しいデプロイ」</strong> をクリック</li>
                        <li>歯車アイコンから <strong>「ウェブアプリ」</strong> を選択</li>
                        <li>アクセスできるユーザーを <strong>「全員」</strong> にして「デプロイ」をクリック</li>
                        <li>発行された <strong>「ウェブアプリのURL」</strong> をコピーし、上の入力欄に貼り付ける</li>
                      </ol>
                      <p className="text-emerald-800 font-semibold">
                        ★ これだけで、部員がフォームを送った瞬間にアプリを開くだけで最新出欠が全自動反映されます！
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={handleSyncUrl}
                disabled={loading}
                className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl transition-colors shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    データを取得中...
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="w-4 h-4" />
                    スプレッドシートから最新データを反映
                  </>
                )}
              </button>
            </div>
          )}

          {activeTab === 'paste' && (
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                スプレッドシートからコピーしたセルを貼り付け（CSV / TSV形式）
              </label>
              <textarea
                rows={6}
                value={pastedCSV}
                onChange={(e) => setPastedCSV(e.target.value)}
                placeholder="日付,練習内容,開始時刻,終了時刻,場所,指揮..."
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />
              <button
                onClick={handlePasteSubmit}
                className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl transition-colors shadow-xs text-sm"
              >
                貼り付けたデータを取り込む
              </button>
            </div>
          )}

          {activeTab === 'file' && (
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                パソコンや端末内のCSVファイルを選択
              </label>
              <div className="border-2 border-dashed border-stone-300 rounded-xl p-6 text-center hover:bg-stone-50 transition-colors">
                <Upload className="w-8 h-8 mx-auto text-stone-400 mb-2" />
                <p className="text-sm font-medium text-stone-700 mb-1">CSVファイルを選択またはドラッグ＆ドロップ</p>
                <p className="text-xs text-stone-400 mb-3">.csv 形式のファイル</p>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  className="block mx-auto text-xs text-stone-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Sample Format Preview & CSV Export */}
          <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
            <button
              onClick={onExportCSV}
              className="text-xs text-stone-600 hover:text-emerald-700 flex items-center gap-1.5 font-medium py-1 px-2 rounded-lg hover:bg-stone-100 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              現在のデータをCSVで書き出す
            </button>
            <div className="text-[11px] text-stone-400">
              推奨見出し: {sampleHeaders.slice(0, 4).join(', ')}...
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
