/**
 * 日付・曜日・カレンダー計算の共通ユーティリティ
 */

/**
 * 今日の日付文字列（YYYY-MM-DD）を取得します（ユーザーのローカル時刻準拠）
 */
export function getTodayStr(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 日付文字列（YYYY-MM-DD）から日本語の曜日（日〜土）を返します
 */
export function getDayOfWeekName(dateStr: string): string {
  if (!dateStr) return '月';
  const parts = dateStr.split('-').map(Number);
  if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
    return '月';
  }
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return days[date.getDay()] || '月';
}

/**
 * 指定した日付（YYYY-MM-DD）が含まれる週（月曜〜日曜）の範囲を計算します
 */
export function getWeekRange(targetDateStr: string): {
  mondayDate: Date;
  sundayDate: Date;
  mondayStr: string;
  sundayStr: string;
} {
  const parts = targetDateStr.split('-').map(Number);
  const target = new Date(parts[0], parts[1] - 1, parts[2]);
  const day = target.getDay(); // 0 is Sun, 1 is Mon, ..., 6 is Sat
  const diffToMon = day === 0 ? -6 : 1 - day;
  const monday = new Date(parts[0], parts[1] - 1, parts[2] + diffToMon);
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);

  const formatDate = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  return {
    mondayDate: monday,
    sundayDate: sunday,
    mondayStr: formatDate(monday),
    sundayStr: formatDate(sunday),
  };
}
