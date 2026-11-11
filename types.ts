export type ScheduleViewTab = 'daily' | 'weekly' | 'monthly';

export type PracticeType = 'tutti' | 'part' | 'section' | 'hall' | 'free' | 'off';

export interface TimelineItem {
  time: string;
  activity: string;
  location?: string;
  leader?: string;
}

export interface PracticeSchedule {
  id: string;
  date: string; // YYYY-MM-DD
  dayOfWeek: '月' | '火' | '水' | '木' | '金' | '土' | '日';
  title: string;
  type: PracticeType;
  startTime: string;
  endTime: string;
  location: string;
  conductor: string;
  pieces: string[];
  timeline: TimelineItem[];
  goals: string[];
  notes: string;

  // DB_Schedule_2026 連携フィールド
  event?: string; // 行事 (E列)
  availableRooms?: string; // 使用可能教室 (I列)
  trainingGrades?: string[]; // 講習対象学年 (J〜L列の○から: 例 ['1年', '2年'])
  weeklyGoal?: string; // 今週の重点目標 (G列)
  supervisors?: string[]; // 顧問・講師 (M〜N列の○から: 例 ['松', '飛'])
  advisors?: {
    matsu?: '○' | '✕' | string; // 松 (M列)
    tobi?: '○' | '✕' | string; // 飛 (N列)
  };
}

export type AttendanceStatus = 'attending' | 'absent' | 'late' | 'early_leave';

export interface AttendanceRecord {
  id: string;
  timestamp: string; // Googleフォーム送信日時
  date: string; // YYYY-MM-DD
  studentName: string;
  part: string; // Flute, Clarinet, etc.
  grade: '1年' | '2年' | '3年';
  classGroup?: string; // 1組, 2組, etc.
  status: AttendanceStatus;
  timeInfo?: string; // e.g., "17:00合流", "18:00退出"
  reason: string;
  notes?: string; // その他連絡事項
  reportedVia: 'google_form' | 'app_manual';
}

export type LoadingCategory =
  | 'percussion_large'
  | 'percussion_small'
  | 'brass_heavy'
  | 'woodwind'
  | 'strings'
  | 'equipment';

export interface LoadingItem {
  id: string;
  order: number;
  truckId: 'truck-1' | 'truck-2';
  instrumentName: string;
  category: LoadingCategory;
  part: string;
  quantity: number;
  caseType: string;
  locationInTruck: string; // e.g. "奥・下段 (最初)", "中央・中段", "手前・上段 (最後)"
  handler: string;
  cautions: string;
  loaded: boolean;
  loadedOutbound?: boolean;
  loadedInbound?: boolean;
}

export type ScoreGenre =
  | 'コンクール課題曲'
  | 'コンクール自由曲'
  | 'ポップス'
  | 'マーチ'
  | 'クラシック編曲'
  | 'アンサンブル'
  | '式典・行事';

export type ScoreCondition = 'スコア・パート譜完備' | 'パート譜一部欠損あり' | 'フルスコアのみ';

export type ScoreStatus = '保管中' | '現在練習中' | '貸出中';

export interface MusicScore {
  id: string;
  managementNumber: string;
  title: string;
  composer: string;
  arranger?: string;
  genre: ScoreGenre;
  grade: number; // 1-6
  duration: string;
  storageLocation: string;
  scoreCondition: ScoreCondition;
  status: ScoreStatus;
  borrowedBy?: string;
  notes?: string;
}

export interface YearlyGoalsData {
  yearlyGoal: string; // 今年度の目標
  event1Name: string; // 本番①の名前
  event1Date: string; // 本番①の日付 (YYYY/MM/DD or YYYY-MM-DD)
  event2Name?: string; // 本番②の名前
  event2Date?: string; // 本番②の日付
  spreadsheetUrl?: string;
  lastSyncedAt?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  meta?: {
    instrument?: string;
    topic?: string;
    term?: string;
  };
}
