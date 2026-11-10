import React, { useState } from 'react';
import {
  BookOpen,
  Send,
  HelpCircle,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Music2,
  Bookmark,
  ExternalLink,
} from 'lucide-react';
import { SAMPLE_MUSIC_TERM_PROMPTS } from '../data/initialData';
import { ChatMessage } from '../types';

export const MusicTermsAdvisor: React.FC = () => {
  const [termInput, setTermInput] = useState('');
  const [contextInput, setContextInput] = useState('コンクール課題曲・自由曲');
  const [pieceType, setPieceType] = useState('吹奏楽オリジナル大曲');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-terms',
      sender: 'assistant',
      text: `楽譜を開いていて「この音楽用語、どう吹けばいいんだろう？」「指揮者が言っているニュアンスが掴めない」と感じたことはありませんか？🎼

私は吹奏楽指導・指揮法・楽典に精通した【カスタムGem：音楽用語・スコア解釈マエストロ】です。
イタリア語・ドイツ語・フランス語などの楽語の意味はもちろん、「息の入れ方」「発音のアタック」「合奏でどう響かせるか」という実践的なサウンド作りまで分かりやすく解説します！`,
      timestamp: 'スコアマエストロ',
    },
  ]);

  const handleSend = async (termText?: string, contextText?: string) => {
    const term = (termText || termInput).trim();
    if (!term || loading) return;

    const ctx = contextText || contextInput;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: `【音楽用語・質問】: ${term}\n【曲や場面】: ${ctx}`,
      timestamp: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
      meta: {
        term,
      },
    };

    setMessages((prev) => [...prev, userMsg]);
    setTermInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/gemini/music-terms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          term,
          context: ctx,
          pieceType,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'エラーが発生しました');
      }

      const assistantMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: data.answer,
        timestamp: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
        meta: {
          term,
        },
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: `申し訳ありません。解説の生成中にエラーが発生しました: ${err.message}`,
        timestamp: 'システム',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleClearHistory = () => {
    if (window.confirm('相談履歴をリセットしますか？')) {
      setMessages([messages[0]]);
    }
  };

  return (
    <div className="space-y-6">
      {/* USER REQUIREMENT: Gemini 公式カスタムGem 直接起動バナー */}
      <div className="bg-gradient-to-r from-indigo-950 via-purple-950 to-stone-900 rounded-3xl p-5 sm:p-6 text-white shadow-md border border-indigo-700/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-white/10 rounded-2xl border border-white/20 text-indigo-300">
              <BookOpen className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg sm:text-xl font-bold tracking-tight">
                  音楽用語辞典（公式Gemini カスタムGem）
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-400 text-indigo-950 rounded-full">
                  公式Gem
                </span>
              </div>
              <p className="text-xs text-indigo-200/90 mt-1 max-w-xl leading-relaxed">
                吹奏楽指導・楽典・スコア解釈専用のGemです。楽譜の発想標語や速度記号、合奏でのニュアンスの表現方法をGoogle Geminiで直接調べることができます。
              </p>
            </div>
          </div>

          <a
            href="https://gemini.google.com/gem/1Z5-J2SscuQl7nXg5OQcHxF-7dEBgMVzy?usp=sharing"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-5 py-3 bg-white text-indigo-950 hover:bg-indigo-50 rounded-2xl font-bold text-sm shadow-md transition-all shrink-0 active:scale-95"
            title="Geminiで音楽用語辞典を開く"
          >
            <span>Geminiで音楽用語辞典を開く</span>
            <ExternalLink className="w-4 h-4 text-indigo-800" />
          </a>
        </div>
      </div>

      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-linear-to-br from-indigo-500 to-indigo-700 text-white rounded-2xl shadow-xs shadow-indigo-600/30">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-stone-900 tracking-tight font-serif">
                  音楽用語・楽語・解釈マエストロ（カスタムGem）
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-100 text-indigo-900 rounded-full border border-indigo-200">
                  楽典・スコアアナリーゼAI
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                楽譜上の発想標語、速度記号、奏法指示の意味と、合奏で求められる息・音色・和声の合わせ方を解説します。
              </p>
            </div>
          </div>

          <button
            onClick={handleClearHistory}
            className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-800 self-end sm:self-auto px-2.5 py-1.5 rounded-lg border border-stone-200 hover:bg-stone-50 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>履歴をクリア</span>
          </button>
        </div>

        {/* Setting row */}
        <div className="mt-5 pt-4 border-t border-stone-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block font-semibold text-stone-700 mb-1 flex items-center gap-1">
              <Bookmark className="w-3.5 h-3.5 text-indigo-600" />
              <span>該当する曲名や場面</span>
            </label>
            <input
              type="text"
              value={contextInput}
              onChange={(e) => setContextInput(e.target.value)}
              placeholder="例: コンクール自由曲の冒頭コラール、ポップスのソロ"
              className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div>
            <label className="block font-semibold text-stone-700 mb-1 flex items-center gap-1">
              <Music2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>編成・ジャンル</span>
            </label>
            <select
              value={pieceType}
              onChange={(e) => setPieceType(e.target.value)}
              className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="吹奏楽オリジナル大曲（コンクール自由曲）">吹奏楽オリジナル大曲（コンクール自由曲）</option>
              <option value="吹奏楽マーチ（課題曲）">吹奏楽マーチ（課題曲）</option>
              <option value="クラシック編曲作品">クラシック編曲作品</option>
              <option value="ポップス・ジャズ・映画音楽">ポップス・ジャズ・映画音楽</option>
              <option value="アンサンブル曲">アンサンブル曲</option>
              <option value="基礎合奏・コラール">基礎合奏・コラール</option>
            </select>
          </div>
        </div>

        {/* Quick terms suggestions */}
        <div className="mt-4 pt-3 border-t border-stone-100">
          <span className="text-[11px] font-semibold text-stone-500 flex items-center gap-1 mb-2">
            <HelpCircle className="w-3 h-3 text-indigo-600" />
            <span>よく質問される吹奏楽の音楽用語・疑問（クリックで即座に解説）：</span>
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {SAMPLE_MUSIC_TERM_PROMPTS.map((sample, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setContextInput(sample.context);
                  handleSend(sample.term, sample.context);
                }}
                disabled={loading}
                className="text-left text-xs bg-stone-50 hover:bg-indigo-50/70 p-2.5 rounded-xl border border-stone-200 hover:border-indigo-300 transition-colors disabled:opacity-50"
              >
                <div className="font-bold text-indigo-900">{sample.term}</div>
                <div className="text-[11px] text-stone-500 line-clamp-1 mt-0.5">
                  {sample.description}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Messages Thread */}
      <div className="space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`p-5 rounded-2xl border transition-all ${
              msg.sender === 'user'
                ? 'bg-indigo-50/60 border-indigo-200/80 ml-4 sm:ml-12'
                : 'bg-white border-stone-200 shadow-2xs mr-4 sm:mr-12'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                    msg.sender === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-stone-900 text-indigo-300'
                  }`}
                >
                  {msg.sender === 'user' ? '部員' : 'Gem'}
                </span>
                <span className="font-bold text-xs text-stone-800">
                  {msg.sender === 'user' ? 'あなたの質問' : '楽語・スコア解釈マエストロ'}
                </span>
                {msg.meta?.term && (
                  <span className="text-[10px] bg-stone-100 text-indigo-900 font-semibold px-2 py-0.5 rounded">
                    用語: {msg.meta.term}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-stone-400">{msg.timestamp}</span>
                {msg.sender === 'assistant' && (
                  <button
                    onClick={() => handleCopy(msg.id, msg.text)}
                    className="p-1 text-stone-400 hover:text-stone-700 rounded transition-colors"
                    title="解説をコピー"
                  >
                    {copiedId === msg.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>
            </div>

            <div className="text-stone-800 text-sm leading-relaxed whitespace-pre-wrap font-sans">
              {msg.text}
            </div>
          </div>
        ))}

        {loading && (
          <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-2xs flex items-center gap-3 mr-12 text-xs text-stone-500">
            <span className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
            <span>マエストロが楽譜のニュアンスと実践ポイントを解説中（Gemini 3.8 Flash）...</span>
          </div>
        )}
      </div>

      {/* Input Box */}
      <div className="sticky bottom-4 bg-white p-3.5 rounded-2xl border border-stone-200 shadow-lg flex items-center gap-3">
        <input
          type="text"
          value={termInput}
          onChange={(e) => setTermInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSend();
            }
          }}
          placeholder="調べたい音楽用語を入力（例: stringendo, doloroso, sonore, 和声の第5音のピッチ...）"
          className="flex-1 p-2 text-sm rounded-xl border-0 focus:outline-none placeholder:text-stone-400"
        />

        <button
          onClick={() => handleSend()}
          disabled={!termInput.trim() || loading}
          className="px-4 py-2.5 bg-indigo-700 hover:bg-indigo-800 disabled:opacity-40 text-white rounded-xl font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-xs shrink-0"
        >
          <Sparkles className="w-4 h-4" />
          <span>解説を聞く</span>
        </button>
      </div>
    </div>
  );
};
