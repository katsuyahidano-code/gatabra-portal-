import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

let aiClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: "10mb" }));

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // Custom Gem: 楽器クリニック (Instrument Specialist)
  app.post("/api/gemini/instrument-consult", async (req, res) => {
    try {
      const { instrument, question, experienceLevel, topic } = req.body;
      if (!question) {
        return res.status(400).json({ error: "質問内容を入力してください" });
      }

      const ai = getGenAI();
      if (!ai) {
        return res.status(503).json({
          error: "Gemini APIキーが設定されていません。AI StudioのSecretsでGEMINI_API_KEYを設定してください。",
        });
      }

      const systemInstruction = `あなたは全日本吹奏楽コンクール常連の指導者であり、管楽器・打楽器各専門のプロ奏者としての知見を持つ【カスタムGem：吹奏楽部 楽器相談室（ガタブラ専属トレーナー）】です。
相談者は吹奏楽部員（中学生・高校生・一般奏者）です。

【役割】
- 相談された楽器（${instrument || "吹奏楽の楽器"}）の専門的かつ具体的で安全なアドバイスを行います。
- アンブシュア、ロングトーン、ブレスコントロール、運指・替え指、ピッチの癖・音程補正、リード・マウスピース選び、ウォームアップ、お手入れ方法などを解説します。
- 根拠（体の使い方、物理的原理、息の流れ）を分かりやすく説明し、今日から部活ですぐ試せる「ステップ練習法」を提案してください。
- 専門用語には適宜ふりがなや簡単な解説を添え、部員のモチベーションが高まるよう温かく励ましてください。
- 必要に応じて「よくあるNG例」や「注意点」も箇条書きで示してください。`;

      const prompt = `【対象楽器】: ${instrument || "指定なし"}
【奏者の経験/学年】: ${experienceLevel || "指定なし"}
【相談ジャンル】: ${topic || "全般"}
【相談・質問内容】:
${question}

吹奏楽部員に寄り添った、実践的で具体的なアドバイスをお願いします。`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      return res.json({ answer: response.text });
    } catch (err: any) {
      console.error("Instrument consult error:", err);
      return res.status(500).json({ error: err.message || "AIの応答生成中にエラーが発生しました" });
    }
  });

  // Custom Gem: 音楽用語・楽語・楽曲解釈マエストロ (Music Terms & Theory Specialist)
  app.post("/api/gemini/music-terms", async (req, res) => {
    try {
      const { term, context, pieceType } = req.body;
      if (!term) {
        return res.status(400).json({ error: "音楽用語や質問内容を入力してください" });
      }

      const ai = getGenAI();
      if (!ai) {
        return res.status(503).json({
          error: "Gemini APIキーが設定されていません。AI StudioのSecretsでGEMINI_API_KEYを設定してください。",
        });
      }

      const systemInstruction = `あなたは吹奏楽指導・指揮法・楽典に精通した【カスタムGem：音楽用語・スコア解釈マエストロ】です。
吹奏楽の合奏や個人練習で楽譜に出てくる音楽用語（イタリア語、ドイツ語、フランス語、英語等）、発想標語、速度記号、奏法指示、和声・ピッチの合わせ方、曲想の捉え方について部員に解説します。

【回答の構成】
1. **原語と読み方・意味**: 言語（伊/独/仏等）、カタカナ読み、直訳
2. **吹奏楽での実践的ニュアンス**: 指揮者が求めているサウンド、息の入れ方、アタック・リリースのイメージ
3. **パート・合奏での注意点**: メロディと伴奏のバランス、テンポ感の保ち方、よくある勘違い
4. **例え・イメージ表現**: 演奏の情景や音色の色彩感を言葉で豊かに伝えるアドバイス`;

      const prompt = `【調べたい音楽用語・質問】: ${term}
【該当する曲や場面・文脈】: ${context || "一般的な吹奏楽曲"}
【編成・ジャンル】: ${pieceType || "吹奏楽オリジナル / コンクール曲 / ポップス"}

部員がスコアやパート譜を見たときに、次の合奏ですぐ音にできるような具体的な解説をお願いします。`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.6,
        },
      });

      return res.json({ answer: response.text });
    } catch (err: any) {
      console.error("Music terms error:", err);
      return res.status(500).json({ error: err.message || "音楽用語の解説生成中にエラーが発生しました" });
    }
  });

  // Google Sheets / Web CSV proxy to prevent CORS issues
  app.post("/api/sheets/proxy", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url || typeof url !== "string") {
        return res.status(400).json({ error: "URLが指定されていません" });
      }

      // Convert Google Sheets view/edit URL to gviz/tq CSV endpoint
      let fetchUrl = url.trim();
      const sheetMatch = fetchUrl.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (sheetMatch && !fetchUrl.includes("output=csv") && !fetchUrl.includes("export?format=csv") && !fetchUrl.includes("gviz/tq")) {
        const docId = sheetMatch[1];
        // Check for gid
        const gidMatch = fetchUrl.match(/gid=([0-9]+)/);
        const gid = gidMatch ? gidMatch[1] : "0";
        fetchUrl = `https://docs.google.com/spreadsheets/d/${docId}/gviz/tq?tqx=out:csv&gid=${gid}&_t=${Date.now()}`;
      } else if (fetchUrl.includes("docs.google.com/spreadsheets")) {
        // Append cache buster if not present
        const sep = fetchUrl.includes("?") ? "&" : "?";
        fetchUrl = `${fetchUrl}${sep}_t=${Date.now()}`;
      }

      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");

      const response = await fetch(fetchUrl, {
        cache: "no-store",
        headers: {
          "User-Agent": "GataBra-Portal/1.0",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          Accept: "text/csv, text/plain, */*",
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({
          error: `スプレッドシートの取得に失敗しました (ステータス: ${response.status})。「リンクを知っている全員が閲覧可」または「ウェブに公開」されているか確認してください。`,
        });
      }

      const csvText = await response.text();
      if (
        csvText.trim().startsWith('<') ||
        csvText.includes('<!DOCTYPE html') ||
        csvText.includes('<html')
      ) {
        return res.status(403).json({
          error:
            'Googleスプレッドシートのアクセス権限により、CSVを直接取得できませんでした。スプレッドシートの共有設定を「リンクを知っている全員が閲覧可」に変更するか、「ファイル」>「共有」>「ウェブに公開」を行ってください。または「テキスト貼り付け」タブから直接貼り付けて反映できます。',
        });
      }
      return res.json({ csv: csvText, fetchedUrl: fetchUrl });
    } catch (err: any) {
      console.error("Sheets proxy error:", err);
      return res.status(500).json({ error: err.message || "スプレッドシートの通信に失敗しました" });
    }
  });

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`GataBra Portal server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
