import { PracticeSchedule, AttendanceRecord, LoadingItem, MusicScore, YearlyGoalsData } from '../types';

/**
 * Robust CSV parser that handles quotes, escaped quotes, and newlines inside quoted fields.
 */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // handle CRLF
      }
      currentRow.push(currentField.trim());
      if (currentRow.some((field) => field.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((field) => field.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Convert any Google Sheets URL to a direct CORS-friendly CSV export URL
 */
export function formatGoogleSheetsCSVUrl(url: string, addCacheBuster = true): string {
  const trimmed = url.trim();
  const cacheParam = addCacheBuster ? `&_t=${Date.now()}` : '';
  if (trimmed.includes('/pub') && trimmed.includes('output=csv')) {
    return trimmed.includes('?') ? `${trimmed}${cacheParam}` : `${trimmed}?${cacheParam.slice(1)}`;
  }
  if (trimmed.includes('/pubhtml')) {
    const pub = trimmed.replace('/pubhtml', '/pub?output=csv');
    return `${pub}${cacheParam}`;
  }
  if (trimmed.includes('/gviz/tq') && trimmed.includes('tqx=out:csv')) {
    return `${trimmed}${cacheParam}`;
  }
  const sheetMatch = trimmed.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (sheetMatch) {
    const docId = sheetMatch[1];
    // Check for gid (e.g. gid=945596711 or #gid=945596711)
    const gidMatch = trimmed.match(/gid=([0-9]+)/);
    const gid = gidMatch ? gidMatch[1] : '0';
    return `https://docs.google.com/spreadsheets/d/${docId}/gviz/tq?tqx=out:csv&gid=${gid}${cacheParam}`;
  }
  return trimmed;
}

/**
 * Convert Google Visualization API Table object to standard CSV format
 */
export function gvizTableToCSV(table: {
  cols: Array<{ id?: string; label?: string; type?: string }>;
  rows: Array<{ c: Array<{ v: any; f?: string } | null> | null }>;
}): string {
  const headers = table.cols.map((c) => c.label || c.id || '');
  const rows: string[] = [];
  rows.push(headers.map((h) => '"' + (h || '').replace(/"/g, '""') + '"').join(','));

  for (const row of table.rows) {
    if (!row || !row.c) continue;
    const cells = row.c.map((cell) => {
      if (!cell || (cell.v === null && cell.f === undefined)) return '""';
      let val =
        cell.f !== undefined && cell.f !== null
          ? cell.f
          : cell.v !== null && cell.v !== undefined
          ? String(cell.v)
          : '';
      // If val is Date(yyyy,m,d), convert to yyyy/m/d format
      const dateMatch = val.match(/Date\((\d{4}),\s*(\d{1,2}),\s*(\d{1,2})\)/);
      if (dateMatch) {
        val = `${dateMatch[1]}/${Number(dateMatch[2]) + 1}/${dateMatch[3]}`;
      }
      return '"' + val.replace(/"/g, '""') + '"';
    });
    rows.push(cells.join(','));
  }
  return rows.join('\r\n');
}

/**
 * Fetch Google Sheets data using JSONP (via dynamic <script> tag).
 * Bypasses all CORS limitations in any browser environment (GitHub Pages, localhost, file://, etc.)
 */
export function fetchGoogleSheetsViaJSONP(url: string, timeoutMs = 9000): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return reject(new Error('Window or Document is not available for JSONP'));
    }

    const trimmed = url.trim();
    const sheetMatch = trimmed.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!sheetMatch) {
      return reject(new Error('URL is not a recognized Google Sheets URL'));
    }

    const docId = sheetMatch[1];
    const gidMatch = trimmed.match(/gid=([0-9]+)/);
    const gid = gidMatch ? gidMatch[1] : '0';

    const callbackName = `_gviz_cb_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    const script = document.createElement('script');
    script.id = callbackName;

    let timer: any = null;

    const cleanup = () => {
      if (timer) clearTimeout(timer);
      try {
        delete (window as any)[callbackName];
      } catch (e) {
        (window as any)[callbackName] = undefined;
      }
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };

    (window as any)[callbackName] = (response: any) => {
      cleanup();
      if (!response) {
        return reject(new Error('Google Sheets returned an empty response'));
      }
      if (response.status === 'error') {
        const errorMsg =
          response.errors && response.errors[0]?.detailed_message
            ? response.errors[0].detailed_message
            : response.errors && response.errors[0]?.message
            ? response.errors[0].message
            : 'Google Sheets returned an error';
        return reject(
          new Error(`スプレッドシートの取得エラー: ${errorMsg}。シートの共有権限を確認してください。`)
        );
      }
      if (response.table) {
        try {
          const csv = gvizTableToCSV(response.table);
          return resolve(csv);
        } catch (convErr: any) {
          return reject(new Error('Failed to convert spreadsheet table to CSV: ' + convErr.message));
        }
      }
      reject(new Error('No table data found in Google Sheets response'));
    };

    script.onerror = () => {
      cleanup();
      reject(new Error('Google Sheets JSONP script loading failed (network error or blocked)'));
    };

    timer = setTimeout(() => {
      cleanup();
      reject(new Error('Google Sheets JSONP request timed out'));
    }, timeoutMs);

    // Cache-busting timestamp parameter _t ensures latest sheet edits are always fetched immediately
    script.src = `https://docs.google.com/spreadsheets/d/${docId}/gviz/tq?tqx=responseHandler:${callbackName}&gid=${gid}&_t=${Date.now()}`;
    document.body.appendChild(script);
  });
}

/**
 * Helper to normalize input: if JSON string (e.g. from Google Apps Script Web App), convert to CSV.
 */
export function ensureCSVText(input: string): string {
  const trimmed = input.trim();
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const data = JSON.parse(trimmed);
      const items = Array.isArray(data) ? data : data.data || data.rows || data.values;
      if (Array.isArray(items) && items.length > 0) {
        if (Array.isArray(items[0])) {
          return items
            .map((row: any[]) =>
              row
                .map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`)
                .join(',')
            )
            .join('\r\n');
        } else if (typeof items[0] === 'object' && items[0] !== null) {
          const headers = Object.keys(items[0]);
          const headerLine = headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(',');
          const rowLines = items.map((obj: any) =>
            headers.map((h) => `"${String(obj[h] ?? '').replace(/"/g, '""')}"`).join(',')
          );
          return [headerLine, ...rowLines].join('\r\n');
        }
      }
    } catch (e) {
      // Continue with raw text
    }
  }
  return input;
}

/**
 * Fetch spreadsheet CSV:
 * 1. Checks for Google Apps Script Web App URL (CORS-enabled by Google)
 * 2. Tries JSONP browser fetch (CORS-immune, works on GitHub Pages & localhost for public sheets)
 * 3. Tries direct browser fetch via Google's gviz / pub endpoint
 * 4. Falls back to backend proxy /api/sheets/proxy if available
 * 5. Falls back to public CORS proxy (allorigins) for static web apps
 */
export async function fetchSpreadsheetCSV(url: string): Promise<string> {
  const trimmed = url.trim();

  // 1. Direct fetch for Google Apps Script Web App (natively allows CORS on script.google.com)
  if (trimmed.includes('script.google.com')) {
    try {
      const gasRes = await fetch(trimmed, { method: 'GET', redirect: 'follow' });
      if (gasRes.ok) {
        const text = await gasRes.text();
        if (text && text.trim().length > 0) {
          return ensureCSVText(text);
        }
      }
    } catch (gasErr) {
      console.warn('Direct GAS Web App fetch failed, trying proxy...', gasErr);
    }
  }

  // 2. Try backend proxy first if running fullstack (fastest ~150ms response, server-side fetch with zero CORS)
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const proxyRes = await fetch('/api/sheets/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: trimmed }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (proxyRes.ok) {
      const data = await proxyRes.json();
      if (data && data.csv && data.csv.trim().length > 0) {
        return data.csv;
      }
    }
  } catch (proxyErr) {
    // If backend proxy not available (static host/GitHub Pages), fall through to JSONP
  }

  // 3. If it's a Google Sheets URL and running in browser, try JSONP!
  // JSONP is 100% immune to CORS and works seamlessly on GitHub Pages, localhost, and static hosts.
  if (typeof window !== 'undefined' && trimmed.includes('docs.google.com/spreadsheets')) {
    try {
      const csv = await fetchGoogleSheetsViaJSONP(trimmed, 7000);
      if (csv && csv.trim().length > 0) {
        return csv;
      }
    } catch (jsonpErr) {
      console.warn('JSONP fetch failed, trying direct fetch / proxy fallbacks...', jsonpErr);
    }
  }

  // 4. Try direct fetch from browser (Google's gviz endpoint or pub CSV) with cache-busting
  const directGvizUrl = formatGoogleSheetsCSVUrl(trimmed, true);
  try {
    const directRes = await fetch(directGvizUrl, {
      method: 'GET',
      cache: 'no-store',
      credentials: 'omit',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Accept: 'text/csv, text/plain, */*',
      },
    });

    if (directRes.ok) {
      const text = await directRes.text();
      // Ensure we received valid CSV content and not an HTML login/redirect page
      if (
        !text.trim().startsWith('<') &&
        !text.includes('<!DOCTYPE html') &&
        !text.includes('<html') &&
        text.trim().length > 0
      ) {
        return text;
      }
    }
  } catch (directErr) {
    console.warn('Direct Google Sheets gviz fetch failed, trying proxy...', directErr);
  }

  // 5. Try public CORS proxy fallbacks for static GitHub Pages sites
  const publicProxies = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(directGvizUrl)}`,
    `https://corsproxy.io/?url=${encodeURIComponent(directGvizUrl)}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(directGvizUrl)}`,
  ];

  for (const proxyUrl of publicProxies) {
    try {
      const controller = new AbortController();
      const pTimer = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(proxyUrl, { cache: 'no-store', signal: controller.signal });
      clearTimeout(pTimer);

      if (res.ok) {
        const text = await res.text();
        if (
          !text.trim().startsWith('<') &&
          !text.includes('<!DOCTYPE html') &&
          !text.includes('<html') &&
          text.trim().length > 0
        ) {
          return text;
        }
      }
    } catch (corsProxyErr) {
      // Continue to next proxy
    }
  }

  // 6. Actionable error message if all automated options failed
  throw new Error(
    'スプレッドシートの自動取得に失敗しました。共有設定が「リンクを知っている全員が閲覧可」になっているか確認してください。または「連携設定」>「テキスト貼り付け」から直接貼り付けて反映できます。'
  );
}

export const DEFAULT_SCHEDULE_SPREADSHEET_URL =
  'https://docs.google.com/spreadsheets/d/1K8se6Rls9JsNKdNzLhEeeKaDYBjedWVZoGVpdNLKOdY/edit?gid=84248111#gid=84248111';

export const DEFAULT_ATTENDANCE_SPREADSHEET_URL =
  'https://docs.google.com/spreadsheets/d/1K8se6Rls9JsNKdNzLhEeeKaDYBjedWVZoGVpdNLKOdY/edit?gid=945596711#gid=945596711';

export const DEFAULT_TRUCK_SPREADSHEET_URL =
  'https://docs.google.com/spreadsheets/d/1K8se6Rls9JsNKdNzLhEeeKaDYBjedWVZoGVpdNLKOdY/edit?gid=358240052#gid=358240052';

/**
 * Helper to parse multiline practice details into structured timeline items
 */
function parsePracticeDetailsToTimeline(text: string): { time: string; activity: string }[] {
  if (!text) return [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const items: { time: string; activity: string }[] = [];

  for (const line of lines) {
    const normalized = line.replace(/：/g, ':').replace(/　/g, ' ');
    const match = normalized.match(/^(\d{1,2}:\d{2}(?:\s*[-〜~]\s*\d{1,2}:\d{2})?)\s*(.*)$/);
    if (match) {
      items.push({
        time: match[1],
        activity: match[2]?.trim() || '練習',
      });
    } else {
      items.push({
        time: '',
        activity: line,
      });
    }
  }
  return items;
}

/**
 * Helper to check if a cell is marked (e.g. ○, ◯, o, 1, etc.)
 */
function isCellMarked(val?: string): boolean {
  if (!val) return false;
  const s = val.trim().toLowerCase();
  return (
    s === '○' ||
    s === '◯' ||
    s === '〇' ||
    s === 'o' ||
    s === '1' ||
    s === 'true' ||
    s === 'v' ||
    s === 'ok'
  );
}

/**
 * Helper to check if cell has ○ or ✕ (cross)
 */
function parseMarkOrCross(val?: string): '○' | '✕' | undefined {
  if (!val) return undefined;
  const s = val.trim().toLowerCase();
  if (s === '○' || s === '◯' || s === '〇' || s === 'o' || s === '1' || s === 'true' || s === 'ok') {
    return '○';
  }
  if (s === '×' || s === '✕' || s === 'x' || s === '0' || s === 'false' || s === 'ng') {
    return '✕';
  }
  return undefined;
}

/**
 * Parse schedules from CSV rows (supports DB_Schedule_2026 schema)
 */
export function parseSchedulesFromCSV(csvText: string): PracticeSchedule[] {
  const rows = parseCSV(ensureCSVText(csvText));
  if (rows.length < 2) return [];

  // Find header row (it could be row 0, or within the first 5 rows)
  let headerRowIdx = 0;
  for (let r = 0; r < Math.min(5, rows.length); r++) {
    const joined = rows[r].join(',').toLowerCase();
    if (joined.includes('日付') || joined.includes('開始') || joined.includes('行事')) {
      headerRowIdx = r;
      break;
    }
  }

  const rawHeaders = rows[headerRowIdx];
  const headers = rawHeaders.map((h) => h.toLowerCase().trim().replace(/\s+/g, ''));

  const dateIdx = headers.findIndex((h) => h.includes('日付') || h === '日' || h.includes('date'));
  const dayOfWeekIdx = headers.findIndex((h) => h.includes('曜日') || h.includes('day'));
  const startIdx = headers.findIndex((h) => h.includes('開始') || h.includes('start'));
  const endIdx = headers.findIndex((h) => h.includes('終了') || h.includes('下校') || h.includes('end'));
  const eventIdx = headers.findIndex((h) => h.includes('行事') || h.includes('イベント') || h.includes('event'));
  const detailsIdx = headers.findIndex((h) => h.includes('練習詳細') || h.includes('詳細') || h.includes('練習内容') || h.includes('detail'));
  const weeklyGoalIdx = headers.findIndex((h) => h.includes('重点目標') || h.includes('今週の目標') || h.includes('目標'));
  const notesIdx = headers.findIndex((h) => h.includes('連絡事項') || h.includes('連絡') || h.includes('備考') || h.includes('notes'));
  const roomsIdx = headers.findIndex((h) => h.includes('使用可能教室') || h.includes('教室') || h.includes('場所') || h.includes('location'));
  const g1Idx = headers.findIndex((h) => h.includes('1年講習') || (h.includes('1年') && h.includes('講習')));
  const g2Idx = headers.findIndex((h) => h.includes('2年講習') || (h.includes('2年') && h.includes('講習')));
  const g3Idx = headers.findIndex((h) => h.includes('3年講習') || (h.includes('3年') && h.includes('講習')));
  const matsuIdx = headers.findIndex((h) => h.includes('松'));
  const tobiIdx = headers.findIndex((h) => h.includes('飛'));

  const schedules: PracticeSchedule[] = [];

  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length === 0) continue;

    // A列またはdateIdxの日付を取得
    const rawDateCell = dateIdx >= 0 ? row[dateIdx] : row[0];
    if (!rawDateCell || !rawDateCell.trim()) continue;

    const rawDate = rawDateCell.trim();
    // Normalize date (e.g. 2026/9/17, 2026-9-17, 2026年9月17日, Date(2026,8,17))
    let y = '', m = '', d = '';
    const dateParts = rawDate.match(/(\d{4})[/-年](\d{1,2})[/-月](\d{1,2})/);
    if (dateParts) {
      y = dateParts[1];
      m = dateParts[2];
      d = dateParts[3];
    } else {
      const gvizDate = rawDate.match(/Date\((\d{4}),\s*(\d{1,2}),\s*(\d{1,2})\)/);
      if (gvizDate) {
        y = gvizDate[1];
        m = String(Number(gvizDate[2]) + 1);
        d = gvizDate[3];
      } else {
        continue; // Skip non-date rows
      }
    }
    const date = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;

    // Determine day of week (優先: B列、未設定ならdateから算出)
    const rawDayOfWeek = dayOfWeekIdx >= 0 && row[dayOfWeekIdx] ? row[dayOfWeekIdx].trim() : '';
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'] as const;
    let dayOfWeek: PracticeSchedule['dayOfWeek'] = '月';
    if (['月', '火', '水', '木', '金', '土', '日'].includes(rawDayOfWeek)) {
      dayOfWeek = rawDayOfWeek as PracticeSchedule['dayOfWeek'];
    } else {
      const dateObj = new Date(date);
      dayOfWeek = isNaN(dateObj.getTime()) ? '月' : dayNames[dateObj.getDay()];
    }

    // 開始・終了時間 (全角コロンを半角に)
    const rawStart = (startIdx >= 0 ? row[startIdx] : row[2])?.trim().replace(/：/g, ':') || '';
    const rawEnd = (endIdx >= 0 ? row[endIdx] : row[3])?.trim().replace(/：/g, ':') || '';

    // 行事 (E列)
    const rawEvent = (eventIdx >= 0 ? row[eventIdx] : row[4])?.trim() || '';

    // 練習詳細 (F列)
    const rawDetails = (detailsIdx >= 0 ? row[detailsIdx] : row[5])?.trim() || '';
    const timeline = parsePracticeDetailsToTimeline(rawDetails);

    // 今週の重点目標 (G列)
    const rawWeeklyGoal = (weeklyGoalIdx >= 0 ? row[weeklyGoalIdx] : row[6])?.trim() || '';

    // 連絡事項 (H列)
    const rawNotes = (notesIdx >= 0 ? row[notesIdx] : row[7])?.trim() || '';

    // 使用可能教室 (I列)
    const rawRooms = (roomsIdx >= 0 ? row[roomsIdx] : row[8])?.trim() || '';

    // 講習 (J:1年, K:2年, L:3年)
    const g1Val = g1Idx >= 0 ? row[g1Idx] : row[9];
    const g2Val = g2Idx >= 0 ? row[g2Idx] : row[10];
    const g3Val = g3Idx >= 0 ? row[g3Idx] : row[11];
    const trainingGrades: string[] = [];
    if (isCellMarked(g1Val)) trainingGrades.push('1年');
    if (isCellMarked(g2Val)) trainingGrades.push('2年');
    if (isCellMarked(g3Val)) trainingGrades.push('3年');

    // 顧問 (M:松, N:飛) の○・✕
    const matsuVal = matsuIdx >= 0 ? row[matsuIdx] : row[12];
    const tobiVal = tobiIdx >= 0 ? row[tobiIdx] : row[13];
    const matsuMark = parseMarkOrCross(matsuVal);
    const tobiMark = parseMarkOrCross(tobiVal);
    const advisors = matsuMark || tobiMark ? { matsu: matsuMark, tobi: tobiMark } : undefined;

    const supervisors: string[] = [];
    if (matsuMark === '○') supervisors.push('松');
    if (tobiMark === '○') supervisors.push('飛');

    // 種別決定 (休日の判定など)
    let type: PracticeSchedule['type'] = 'tutti';
    if (!rawStart && !rawEnd && !rawDetails && !rawEvent) {
      type = 'off';
    } else if (rawEvent.includes('オフ') || rawEvent.includes('休')) {
      type = 'off';
    } else if (rawEvent.includes('ホール') || rawEvent.includes('遠征') || rawEvent.includes('コンクール')) {
      type = 'hall';
    } else if (rawEvent.includes('パート')) {
      type = 'part';
    }

    const title = rawEvent || (rawStart || rawEnd ? '放課後練習' : '部活動オフ');

    schedules.push({
      id: `sch-${date.replace(/-/g, '')}`,
      date,
      dayOfWeek,
      title,
      type,
      startTime: rawStart || (type === 'off' ? '-' : '15:40'),
      endTime: rawEnd || (type === 'off' ? '-' : '18:30'),
      location: rawRooms || (type === 'off' ? '-' : '音楽室'),
      conductor: supervisors.length > 0 ? supervisors.join('・') : '顧問',
      pieces: [],
      timeline,
      goals: rawWeeklyGoal ? [rawWeeklyGoal] : [],
      notes: rawNotes,

      // DB_Schedule_2026 fields
      event: rawEvent || undefined,
      availableRooms: rawRooms || undefined,
      trainingGrades: trainingGrades.length > 0 ? trainingGrades : undefined,
      weeklyGoal: rawWeeklyGoal || undefined,
      supervisors: supervisors.length > 0 ? supervisors : undefined,
      advisors,
    });
  }

  return schedules;
}

/**
 * Parse Google Form attendance CSV responses (Raw_Form_Responses / Form_Responses)
 */
export function parseAttendanceFromCSV(csvText: string): AttendanceRecord[] {
  const rows = parseCSV(ensureCSVText(csvText));
  if (rows.length < 2) return [];

  // Find header row (could be row 0 or within the first 5 rows)
  let headerRowIdx = 0;
  for (let r = 0; r < Math.min(5, rows.length); r++) {
    const joined = rows[r].join(',').toLowerCase();
    if (
      joined.includes('タイムスタンプ') ||
      (joined.includes('学年') && joined.includes('名前')) ||
      joined.includes('遅刻・欠席') ||
      joined.includes('該当')
    ) {
      headerRowIdx = r;
      break;
    }
  }

  const rawHeaders = rows[headerRowIdx];
  const headers = rawHeaders.map((h) => h.toLowerCase().trim().replace(/\s+/g, ''));

  // 1. タイムスタンプ
  let tsIdx = headers.findIndex(
    (h) => h.includes('タイムスタンプ') || h.includes('timestamp') || h.includes('送信日時')
  );
  if (tsIdx < 0 && headers.length > 0 && headers[0].includes('タイム')) tsIdx = 0;

  // 2. 学年
  let gradeIdx = headers.findIndex((h) => h.includes('学年') || h.includes('grade'));
  if (gradeIdx < 0 && headers.length > 1 && headers[1].includes('年')) gradeIdx = 1;

  // 3. 組 (クラス)
  let classIdx = headers.findIndex(
    (h) => h === '組' || h.includes('クラス') || h.includes('組') || h.includes('class')
  );
  if (classIdx < 0 && headers.length > 2 && (headers[2] === '組' || headers[2].includes('組'))) {
    classIdx = 2;
  }

  // 4. パート
  let partIdx = headers.findIndex(
    (h) => h.includes('パート') || h.includes('楽器') || h.includes('part')
  );
  if (partIdx < 0 && headers.length > 3) partIdx = 3;

  // 5. 名前を選択して (氏名)
  let nameIdx = headers.findIndex(
    (h) =>
      h.includes('名前') ||
      h.includes('氏名') ||
      h.includes('name') ||
      h.includes('生徒') ||
      h.includes('部員')
  );
  if (nameIdx < 0 && headers.length > 4) nameIdx = 4;

  // 6. 欠席等の該当日 (日付)
  let dateIdx = headers.findIndex(
    (h) =>
      (h.includes('該当') && !h.includes('遅刻・欠席')) ||
      h.includes('対象日') ||
      h.includes('練習日') ||
      h.includes('日付') ||
      (h.includes('日') && !h.includes('遅刻') && !h.includes('早退') && !h.includes('出欠'))
  );
  if (dateIdx < 0 && headers.length > 5) dateIdx = 5;

  // 7. 遅刻・欠席・早退 (出欠区分)
  let statusIdx = headers.findIndex(
    (h) =>
      h.includes('遅刻・欠席') ||
      h.includes('遅刻') ||
      h.includes('早退') ||
      (h.includes('出欠') && !h.includes('該当')) ||
      h.includes('区分') ||
      h.includes('status')
  );
  if (statusIdx < 0 && headers.length > 6) statusIdx = 6;

  // 8. 理由など
  let reasonIdx = headers.findIndex(
    (h) => h.includes('理由') || h.includes('事由') || h.includes('reason')
  );
  if (reasonIdx < 0 && headers.length > 7) reasonIdx = 7;

  // 9. その他、連絡事項などがあれば入力してください
  let notesIdx = headers.findIndex(
    (h) =>
      h.includes('連絡') ||
      h.includes('その他') ||
      h.includes('備考') ||
      h.includes('メモ') ||
      h.includes('notes')
  );
  if (notesIdx < 0 && headers.length > 8) notesIdx = 8;

  // Optional: 時間/合流・退出予定時刻
  const timeIdx = headers.findIndex(
    (h) => h.includes('合流') || h.includes('退出') || h.includes('時刻')
  );

  const records: AttendanceRecord[] = [];

  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length === 0 || row.every((c) => !c.trim())) continue;

    const studentName = nameIdx >= 0 && row[nameIdx] ? row[nameIdx].trim() : '';
    if (!studentName) continue; // Skip blank rows

    const rawStatus = (statusIdx >= 0 ? row[statusIdx] : '').trim();
    let status: AttendanceRecord['status'] = 'absent';
    if (rawStatus.includes('遅刻') || rawStatus.toLowerCase().includes('late')) {
      status = 'late';
    } else if (rawStatus.includes('早退') || rawStatus.toLowerCase().includes('early')) {
      status = 'early_leave';
    } else if (rawStatus.includes('出席') || rawStatus.toLowerCase().includes('attend')) {
      status = 'attending';
    } else {
      status = 'absent';
    }

    const rawDate = (dateIdx >= 0 ? row[dateIdx] : '').trim();
    const dateMatch = rawDate.match(/(\d{4})[/-年](\d{1,2})[/-月](\d{1,2})/);
    const date = dateMatch
      ? `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`
      : rawDate || new Date().toISOString().slice(0, 10);

    let grade: AttendanceRecord['grade'] = '2年';
    const rawGrade = gradeIdx >= 0 ? row[gradeIdx].trim() : '';
    if (rawGrade.includes('1')) grade = '1年';
    else if (rawGrade.includes('3')) grade = '3年';

    let classGroup: string | undefined = undefined;
    if (classIdx >= 0 && row[classIdx]?.trim()) {
      const cg = row[classIdx].trim();
      classGroup = cg.endsWith('組') ? cg : `${cg}組`;
    }

    const part = partIdx >= 0 && row[partIdx] ? row[partIdx].trim() : '部員';
    const reason = reasonIdx >= 0 && row[reasonIdx] ? row[reasonIdx].trim() : '所用のため';
    const notes = notesIdx >= 0 && row[notesIdx]?.trim() ? row[notesIdx].trim() : undefined;
    const timeInfo = timeIdx >= 0 && row[timeIdx]?.trim() ? row[timeIdx].trim() : undefined;
    const timestamp =
      tsIdx >= 0 && row[tsIdx]?.trim() ? row[tsIdx].trim() : new Date().toLocaleString('ja-JP');

    records.push({
      id: `form-att-${i}-${date}-${studentName.replace(/\s+/g, '')}`,
      timestamp,
      date,
      studentName,
      part,
      grade,
      classGroup,
      status,
      timeInfo,
      reason,
      notes,
      reportedVia: 'google_form',
    });
  }

  return records;
}

/**
 * Parse Truck Loading items from CSV (supports DB_Truck schema & custom truck formats)
 */
export function parseLoadingItemsFromCSV(csvText: string): LoadingItem[] {
  const rows = parseCSV(ensureCSVText(csvText));
  if (rows.length < 2) return [];

  // Find header row (usually row 0 or within the first 5 rows)
  let headerRowIdx = 0;
  for (let r = 0; r < Math.min(5, rows.length); r++) {
    const joined = rows[r].join(',').toLowerCase();
    if (
      joined.includes('順序') ||
      joined.includes('楽器') ||
      joined.includes('機材') ||
      joined.includes('truck') ||
      joined.includes('行き')
    ) {
      headerRowIdx = r;
      break;
    }
  }

  const rawHeaders = rows[headerRowIdx];
  const headers = rawHeaders.map((h) => h.toLowerCase().trim().replace(/\s+/g, ''));

  const orderIdx = headers.findIndex((h) => h.includes('順') || h.includes('no') || h.includes('order'));
  const nameIdx = headers.findIndex((h) => h.includes('楽器') || h.includes('機材') || h.includes('品名') || h.includes('name'));
  const notesIdx = headers.findIndex((h) => h.includes('備考') || h.includes('注意') || h.includes('養生') || h.includes('notes'));
  const outboundIdx = headers.findIndex((h) => h.includes('行き') || h.includes('往路') || h.includes('outbound'));
  const inboundIdx = headers.findIndex((h) => h.includes('帰り') || h.includes('復路') || h.includes('inbound'));

  // Optional legacy / additional headers
  const truckIdx = headers.findIndex((h) => h.includes('号車') || h.includes('トラック'));
  const partIdx = headers.findIndex((h) => h.includes('パート') || h.includes('担当パート'));
  const qtyIdx = headers.findIndex((h) => h.includes('数量') || h.includes('数') || h.includes('台'));
  const caseIdx = headers.findIndex((h) => h.includes('ケース'));
  const locIdx = headers.findIndex((h) => h.includes('位置') || h.includes('場所'));
  const handlerIdx = headers.findIndex((h) => h.includes('担当者') || h.includes('係'));

  const items: LoadingItem[] = [];

  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length === 0 || row.every((c) => !c.trim())) continue;

    const rawName = (nameIdx >= 0 ? row[nameIdx] : row[1])?.trim();
    if (!rawName) continue;

    // Convert full-width numbers (１, ２, ..., １１) to half-width integer
    const rawOrder = orderIdx >= 0 && row[orderIdx] ? row[orderIdx].trim() : String(items.length + 1);
    const normalizedOrderStr = rawOrder.replace(/[０-９]/g, (ch) =>
      String.fromCharCode(ch.charCodeAt(0) - 0xfee0)
    );
    const orderNum = parseInt(normalizedOrderStr, 10) || items.length + 1;

    // Outbound / Inbound checks
    const rawOutbound = (outboundIdx >= 0 ? row[outboundIdx] : '').trim().toUpperCase();
    const loadedOutbound = rawOutbound === 'TRUE' || rawOutbound === '1' || rawOutbound === '○';

    const rawInbound = (inboundIdx >= 0 ? row[inboundIdx] : '').trim().toUpperCase();
    const loadedInbound = rawInbound === 'TRUE' || rawInbound === '1' || rawInbound === '○';

    const cautions = (notesIdx >= 0 ? row[notesIdx] : '').trim();

    // Determine part & category based on instrument name
    let part = '全体';
    let category: LoadingItem['category'] = 'equipment';
    let defaultLocation = 'トラック荷台';
    let defaultCase = '専用ケース';

    if (/ティンパニ|バスドラ|スネア|グロッケン|マリンバ|シロフォン|シンバル|ドラム|チャイム|打楽器/.test(rawName)) {
      part = 'Percussion';
      category = /ティンパニ|バスドラ|マリンバ/.test(rawName) ? 'percussion_large' : 'percussion_small';
      defaultLocation = /ティンパニ|バスドラ/.test(rawName) ? '1号車 奥・下段' : '1号車 中段';
      defaultCase = /ティンパニ|バスドラ/.test(rawName) ? '専用ケース＋毛布' : '専用ケース';
    } else if (/トランペット/.test(rawName)) {
      part = 'Trumpet';
      category = 'brass_heavy';
      defaultLocation = '1号車 中段';
      defaultCase = 'ハードケース';
    } else if (/トロンボーン/.test(rawName)) {
      part = 'Trombone';
      category = 'brass_heavy';
      defaultLocation = '1号車 中段';
      defaultCase = 'ハードケース';
    } else if (/ホルン/.test(rawName)) {
      part = 'Horn';
      category = 'brass_heavy';
      defaultLocation = '1号車 中段';
      defaultCase = 'ハードケース';
    } else if (/チューバ|ユーフォ/.test(rawName)) {
      part = /チューバ/.test(rawName) ? 'Tuba' : 'Euphonium';
      category = 'brass_heavy';
      defaultLocation = '1号車 下段';
      defaultCase = 'ハードケース';
    } else if (/フルート|ピッコロ/.test(rawName)) {
      part = 'Flute';
      category = 'woodwind';
      defaultLocation = '1号車 上段';
      defaultCase = 'ハードケース';
    } else if (/クラリネット/.test(rawName)) {
      part = 'Clarinet';
      category = 'woodwind';
      defaultLocation = '1号車 上段';
      defaultCase = 'ハードケース';
    } else if (/サックス/.test(rawName)) {
      part = 'Saxophone';
      category = 'woodwind';
      defaultLocation = '1号車 中段';
      defaultCase = 'ハードケース';
    }

    if (partIdx >= 0 && row[partIdx]?.trim()) {
      part = row[partIdx].trim();
    }

    const rawTruck = truckIdx >= 0 && row[truckIdx] ? row[truckIdx].trim() : '';
    const truckId: LoadingItem['truckId'] = rawTruck.includes('2') ? 'truck-2' : 'truck-1';

    const qty = qtyIdx >= 0 && Number(row[qtyIdx]) ? Number(row[qtyIdx]) : 1;
    const caseType = caseIdx >= 0 && row[caseIdx]?.trim() ? row[caseIdx].trim() : defaultCase;
    const locationInTruck = locIdx >= 0 && row[locIdx]?.trim() ? row[locIdx].trim() : defaultLocation;
    const handler = handlerIdx >= 0 && row[handlerIdx]?.trim() ? row[handlerIdx].trim() : part;

    items.push({
      id: `truck-${orderNum}-${rawName.replace(/\s+/g, '')}`,
      order: orderNum,
      truckId,
      instrumentName: rawName,
      category,
      part,
      quantity: qty,
      caseType,
      locationInTruck,
      handler,
      cautions,
      loaded: loadedOutbound,
      loadedOutbound,
      loadedInbound,
    });
  }

  return items.sort((a, b) => a.order - b.order);
}


/**
 * Parse Music Scores from CSV
 */
export function parseMusicScoresFromCSV(csvText: string): MusicScore[] {
  const rows = parseCSV(csvText);
  if (rows.length < 2) return [];

  const headers = rows[0].map((h) => h.toLowerCase());
  const codeIdx = headers.findIndex((h) => h.includes('管理') || h.includes('番号') || h.includes('code') || h.includes('no'));
  const titleIdx = headers.findIndex((h) => h.includes('曲名') || h.includes('タイトル') || h.includes('title'));
  const compIdx = headers.findIndex((h) => h.includes('作曲') || h.includes('composer'));
  const arrIdx = headers.findIndex((h) => h.includes('編曲') || h.includes('arranger'));
  const genreIdx = headers.findIndex((h) => h.includes('ジャンル') || h.includes('部門') || h.includes('genre'));
  const gradeIdx = headers.findIndex((h) => h.includes('グレード') || h.includes('難易度') || h.includes('grade'));
  const durIdx = headers.findIndex((h) => h.includes('時間') || h.includes('duration'));
  const locIdx = headers.findIndex((h) => h.includes('保管') || h.includes('棚') || h.includes('場所') || h.includes('location'));
  const condIdx = headers.findIndex((h) => h.includes('状態') || h.includes('譜') || h.includes('condition'));
  const statusIdx = headers.findIndex((h) => h.includes('貸出') || h.includes('状況') || h.includes('status'));
  const borrowerIdx = headers.findIndex((h) => h.includes('借用') || h.includes('配布') || h.includes('borrower'));
  const notesIdx = headers.findIndex((h) => h.includes('備考') || h.includes('メモ') || h.includes('notes'));

  const scores: MusicScore[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length === 0 || !row[titleIdx >= 0 ? titleIdx : 1]) continue;

    const rawGenre = (genreIdx >= 0 ? row[genreIdx] : '').toLowerCase();
    let genre: MusicScore['genre'] = 'コンクール自由曲';
    if (rawGenre.includes('課題')) genre = 'コンクール課題曲';
    else if (rawGenre.includes('ポップス') || rawGenre.includes('pops')) genre = 'ポップス';
    else if (rawGenre.includes('マーチ') || rawGenre.includes('march')) genre = 'マーチ';
    else if (rawGenre.includes('クラシック') || rawGenre.includes('classic')) genre = 'クラシック編曲';
    else if (rawGenre.includes('アンサンブル') || rawGenre.includes('ensemble')) genre = 'アンサンブル';
    else if (rawGenre.includes('式典') || rawGenre.includes('行事')) genre = '式典・行事';

    const rawStatus = (statusIdx >= 0 ? row[statusIdx] : '').toLowerCase();
    let status: MusicScore['status'] = '保管中';
    if (rawStatus.includes('練習') || rawStatus.includes('配布') || rawStatus.includes('in_use')) status = '現在練習中';
    else if (rawStatus.includes('貸出') || rawStatus.includes('loan')) status = '貸出中';

    scores.push({
      id: `csv-score-${Date.now()}-${i}`,
      managementNumber: codeIdx >= 0 && row[codeIdx] ? row[codeIdx] : `BR-${String(i).padStart(3, '0')}`,
      title: row[titleIdx >= 0 ? titleIdx : 1],
      composer: compIdx >= 0 && row[compIdx] ? row[compIdx] : '作曲者未詳',
      arranger: arrIdx >= 0 && row[arrIdx] ? row[arrIdx] : undefined,
      genre,
      grade: gradeIdx >= 0 && Number(row[gradeIdx]) ? Math.min(6, Math.max(1, Math.round(Number(row[gradeIdx])))) : 3,
      duration: durIdx >= 0 && row[durIdx] ? row[durIdx] : '5分00秒',
      storageLocation: locIdx >= 0 && row[locIdx] ? row[locIdx] : '楽譜庫',
      scoreCondition: condIdx >= 0 && row[condIdx] && row[condIdx].includes('欠') ? 'パート譜一部欠損あり' : 'スコア・パート譜完備',
      status,
      borrowedBy: borrowerIdx >= 0 ? row[borrowerIdx] : undefined,
      notes: notesIdx >= 0 ? row[notesIdx] : undefined,
    });
  }

  return scores;
}

/**
 * Export generic array to downloadable CSV
 */
export function exportToCSV(filename: string, headers: string[], rows: (string | number)[][]): void {
  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row
        .map((val) => {
          const s = String(val ?? '');
          return s.includes(',') || s.includes('"') || s.includes('\n')
            ? `"${s.replace(/"/g, '""')}"`
            : s;
        })
        .join(',')
    ),
  ].join('\r\n');

  // Add BOM for Excel Japanese encoding compatibility
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const DEFAULT_YEARLY_GOALS: YearlyGoalsData = {
  yearlyGoal: 'コンクール全道金賞',
  event1Name: '吹奏楽コンクール',
  event1Date: '2026/08/27',
  event2Name: undefined,
  event2Date: undefined,
  spreadsheetUrl:
    'https://docs.google.com/spreadsheets/d/1K8se6Rls9JsNKdNzLhEeeKaDYBjedWVZoGVpdNLKOdY/edit?gid=47287689#gid=47287689',
  lastSyncedAt: undefined,
};

/**
 * Parse Goals and Event Countdowns from DB_Goals CSV
 * Columns matching screenshot:
 * A: 今年度の目標
 * B: 本番①の名前
 * C: 本番①の日付
 * D: 本番②の名前
 * E: 本番②の日付
 */
export function parseGoalsFromCSV(csvText: string): YearlyGoalsData | null {
  const rows = parseCSV(csvText);
  if (rows.length < 2) return null;

  const headers = rows[0].map((h) => h.toLowerCase());
  const goalIdx = headers.findIndex((h) => h.includes('目標') || h.includes('goal'));
  const ev1NameIdx = headers.findIndex((h) => h.includes('本番①の名前') || h.includes('本番1の名前') || (h.includes('本番') && h.includes('名前')));
  const ev1DateIdx = headers.findIndex((h) => h.includes('本番①の日付') || h.includes('本番1の日付') || (h.includes('本番') && (h.includes('日') || h.includes('date'))));
  const ev2NameIdx = headers.findIndex((h) => h.includes('本番②の名前') || h.includes('本番2の名前'));
  const ev2DateIdx = headers.findIndex((h) => h.includes('本番②の日付') || h.includes('本番2の日付'));

  // If headers didn't match fuzzy, fallback to standard column positions A, B, C, D, E (0, 1, 2, 3, 4)
  const gIdx = goalIdx >= 0 ? goalIdx : 0;
  const e1NIdx = ev1NameIdx >= 0 ? ev1NameIdx : 1;
  const e1DIdx = ev1DateIdx >= 0 ? ev1DateIdx : 2;
  const e2NIdx = ev2NameIdx >= 0 ? ev2NameIdx : 3;
  const e2DIdx = ev2DateIdx >= 0 ? ev2DateIdx : 4;

  // First data row (row 1 in 0-indexed rows)
  const dataRow = rows[1];
  if (!dataRow || dataRow.length === 0) return null;

  const yearlyGoal = dataRow[gIdx]?.trim() || '';
  const event1Name = dataRow[e1NIdx]?.trim() || '';
  const event1Date = dataRow[e1DIdx]?.trim() || '';
  const event2Name = dataRow[e2NIdx]?.trim() || '';
  const event2Date = dataRow[e2DIdx]?.trim() || '';

  if (!yearlyGoal && !event1Name) return null;

  return {
    yearlyGoal: yearlyGoal || 'コンクール全道金賞',
    event1Name: event1Name || '吹奏楽コンクール',
    event1Date: event1Date || '2026/08/27',
    event2Name: event2Name || undefined,
    event2Date: event2Date || undefined,
    lastSyncedAt: new Date().toISOString(),
  };
}
