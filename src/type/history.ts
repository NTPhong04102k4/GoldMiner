export interface HistoryItem {
  id: string;
  username: string;
  score: number;
  description: string;
  playedAt: string;
  isNewRecord: boolean;
}

export interface HistoryState {
  historyItems: HistoryItem[];
  loading: boolean;
  error: string | null;
}

export interface HighScoreData {
  score: number;
  username: string;
  description: string;
}
