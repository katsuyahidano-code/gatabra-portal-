import React, { useState } from 'react';
import {
  Sparkles,
  Send,
  HelpCircle,
  Copy,
  Check,
  RotateCcw,
  BookOpen,
  MessageSquare,
  Music,
  User,
  ExternalLink,
} from 'lucide-react';
import { INSTRUMENT_LIST, SAMPLE_INSTRUMENT_PROMPTS } from '../data/initialData';
import { ChatMessage } from '../types';

export const InstrumentAdvisor: React.FC = () => {
  const [selectedInstrument, setSelectedInstrument] = useState(INSTRUMENT_LIST[0]);
  const [experienceLevel, setExperienceLevel] = useState('高校生 / 2年（中級）');
  const [topic, setTopic] = useState('アンブシュア・発音');
  const [inputQuestion, setInputQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `こんにちは！吹奏楽部専属AIトレーナー【楽器相談室（カスタムGem）】です。🎷🎺🥁
木管・金管・打楽器・弦バスすべての楽器について、アンブシュア、ロングトーン、ブレスコントロール、ピッチの癖、リード選び、運指の悩み、効率的なウォームアップ方法などを専門的にお答えします。

気になることや悩んでいるパッセージがあれば、いつでも相談してくださいね！`,
      timestamp: '専属トレーナー',
    },
  ]);

  const handleSend = async (questionText?: string) => {
    const query = (questionText || inputQuestion).trim();
    if (!query || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
      meta: {
        instrument: selectedInstrument,
        topic,
      },
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuestion('');
    setLoading(true);

    try {
      const res = await fetch('/api/gemini/instrument-consult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instrument: selectedInstrument,
          experienceLevel,
          topic,
          question: query,
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
          instrument: selectedInstrument,
        },
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: `申し訳ありません。回答の生成中にエラーが発生しました: ${err.message}`,
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
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-stone-900 rounded-3xl p-5 sm:p-6 text-white shadow-md border border-emerald-700/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-white/10 rounded-2xl border border-white/20 text-emerald-300">
              <Sparkles className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg sm:text-xl font-bold tracking-tight">
                  楽器相談室（公式Gemini カスタムGem）
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-400 text-emerald-950 rounded-full">
                  公式Gem
                </span>
              </div>
              <p className="text-xs text-emerald-200/90 mt-1 max-w-xl leading-relaxed">
                吹奏楽部員専用の楽器相談室Gemです。アンブシュアや息の使い方、音程、各楽器の専門アドバイスをGoogle Geminiで直接相談できます。
              </p>
            </div>
          </div>

          <a
            href="https://gemini.google.com/gem/1nnyMBgwcuuyPO0BCtD6qfMabuVwlW8nc?usp=sharing"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-5 py-3 bg-white text-emerald-950 hover:bg-emerald-50 rounded-2xl font-bold text-sm shadow-md transition-all shrink-0 active:scale-95"
            title="Geminiで楽器相談室を開く"
          >
            <span>Geminiで楽器相談室を開く</span>
            <ExternalLink className="w-4 h-4 text-emerald-800" />
          </a>
        </div>
      </div>

      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-linear-to-br from-amber-500 to-amber-700 text-white rounded-2xl shadow-xs shadow-amber-600/30">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-stone-900 tracking-tight font-serif">
                  楽器相談室（Gemini カスタムGem）
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-900 rounded-full border border-amber-200">
                  プロ奏者・指導者AI
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                アンブシュア、ロングトーン、ブレス、ピッチ補正、運指、リード管理など、各楽器の専門的アドバイスを提供します。
              </p>
            </div>
          </div>

          <button
            onClick={handleClearHistory}
            className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-800 self-end sm:self-auto px-2.5 py-1.5 rounded-lg border border-stone-200 hover:bg-stone-50 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>会話履歴をクリア</span>
          </button>
        </div>

        {/* Instrument Selector Toolbar */}
        <div className="mt-5 pt-4 border-t border-stone-100 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block font-semibold text-stone-700 mb-1 flex items-center gap-1">
              <Music className="w-3.5 h-3.5 text-amber-600" />
              <span>相談する楽器</span>
            </label>
            <select
              value={selectedInstrument}
              onChange={(e) => setSelectedInstrument(e.target.value)}
              className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500/20"
            >
              {INSTRUMENT_LIST.map((inst) => (
                <option key={inst} value={inst}>
                  {inst}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-stone-700 mb-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-amber-600" />
              <span>奏者の学年・経験</span>
            </label>
            <select
              value={experienceLevel}
              onChange={(e) => setExperienceLevel(e.target.value)}
              className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500/20"
            >
              <option value="中学生 / 初心者（1年未満）">中学生 / 初心者（1年未満）</option>
              <option value="中学生 / 2〜3年（コンクール経験あり）">中学生 / 2〜3年（コンクール経験あり）</option>
              <option value="高校生 / 1年（基礎見直し中）">高校生 / 1年（基礎見直し中）</option>
              <option value="高校生 / 2年（中級・パートリーダー）">高校生 / 2年（中級・パートリーダー）</option>
              <option value="高校生 / 3年（上級・ソロ担当）">高校生 / 3年（上級・ソロ担当）</option>
              <option value="一般・大学吹奏楽団">一般・大学吹奏楽団</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-stone-700 mb-1 flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5 text-amber-600" />
              <span>相談ジャンル</span>
            </label>
            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500/20"
            >
              <option value="アンブシュア・発音">アンブシュア・発音</option>
              <option value="高音域・低音域の鳴らし方">高音域・低音域の鳴らし方</option>
              <option value="ロングトーン・ブレスコントロール">ロングトーン・ブレスコントロール</option>
              <option value="音程・ピッチの癖・純正律合わせ">音程・ピッチの癖・純正律合わせ</option>
              <option value="運指・替え指・スライド操作">運指・替え指・スライド操作</option>
              <option value="リード・マウスピース・マレット選び">リード・マウスピース・マレット選び</option>
              <option value="楽器のお手入れ・メンテナンス">楽器のお手入れ・メンテナンス</option>
              <option value="本番直前のウォームアップ・メンタル">本番直前のウォームアップ・メンタル</option>
            </select>
          </div>
        </div>

        {/* Quick Question Prompts */}
        <div className="mt-4 pt-3 border-t border-stone-100">
          <span className="text-[11px] font-semibold text-stone-500 flex items-center gap-1 mb-2">
            <HelpCircle className="w-3 h-3 text-amber-600" />
            <span>よくある相談の質問例（クリックですぐ質問できます）：</span>
          </span>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_INSTRUMENT_PROMPTS.map((sample, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setSelectedInstrument(sample.instrument);
                  setTopic(sample.topic);
                  handleSend(sample.question);
                }}
                disabled={loading}
                className="text-left text-xs bg-stone-100 hover:bg-amber-100/70 text-stone-700 hover:text-amber-900 px-3 py-1.5 rounded-xl border border-stone-200 transition-colors disabled:opacity-50"
              >
                <span className="font-semibold text-amber-800 mr-1">[{sample.instrument}]</span>
                <span>{sample.title}</span>
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
                ? 'bg-amber-50/70 border-amber-200/80 ml-4 sm:ml-12'
                : 'bg-white border-stone-200 shadow-2xs mr-4 sm:mr-12'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                    msg.sender === 'user'
                      ? 'bg-amber-600 text-white'
                      : 'bg-stone-900 text-amber-300'
                  }`}
                >
                  {msg.sender === 'user' ? '部員' : 'Gem'}
                </span>
                <span className="font-bold text-xs text-stone-800">
                  {msg.sender === 'user' ? 'あなたの相談' : '専属AIトレーナー'}
                </span>
                {msg.meta?.instrument && (
                  <span className="text-[10px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded font-medium">
                    {msg.meta.instrument}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-stone-400">{msg.timestamp}</span>
                {msg.sender === 'assistant' && (
                  <button
                    onClick={() => handleCopy(msg.id, msg.text)}
                    className="p-1 text-stone-400 hover:text-stone-700 rounded transition-colors"
                    title="回答をコピー"
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
            <span className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin"></span>
            <span>専属トレーナーが専門的な回答を執筆中（Gemini 3.8 Flash）...</span>
          </div>
        )}
      </div>

      {/* Input Box */}
      <div className="sticky bottom-4 bg-white p-3.5 rounded-2xl border border-stone-200 shadow-lg flex items-center gap-3">
        <textarea
          rows={2}
          value={inputQuestion}
          onChange={(e) => setInputQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              handleSend();
            }
          }}
          placeholder={`【${selectedInstrument}】についての質問や悩みを自由に入力してください（Ctrl+Enterで送信）`}
          className="flex-1 p-2 text-sm rounded-xl border-0 focus:outline-none resize-none placeholder:text-stone-400"
        />

        <button
          onClick={() => handleSend()}
          disabled={!inputQuestion.trim() || loading}
          className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white rounded-xl font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-xs shrink-0"
        >
          <Send className="w-4 h-4" />
          <span>質問する</span>
        </button>
      </div>
    </div>
  );
};
