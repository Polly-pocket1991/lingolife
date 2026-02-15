export interface Word {
  id: string;
  term: string;
  phonetic: string;
  translation: string;
  knownCount: number;
  unknownCount: number;
  partOfSpeech?: string;
  definition?: string;
}

export interface UserStats {
  dailyGoalProgress: number;
  todayCount: number;
  todayKnown: number;
  todayUnknown: number;
}
