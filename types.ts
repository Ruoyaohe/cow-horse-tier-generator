
export enum CowHorseTier {
  GOLD = 'GOLD',
  SILVER = 'SILVER',
  BRONZE = 'BRONZE'
}

export interface WorkProfile {
  dailyHours: number;
  salaryRange: string;
  leaveDays: number;
  continuousDays: number;
  mealAllowance: number;
}

export interface TierResult {
  tier: CowHorseTier;
  score: number;
  label: string;
  description: string;
  colorClass: string;
}
