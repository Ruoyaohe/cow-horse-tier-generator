
import { CowHorseTier, TierResult, WorkProfile } from './types';

export const SALARY_RANGES = [
  '3k以下',
  '3k-6k',
  '6k-10k',
  '10k-15k',
  '15k-20k',
  '20k以上'
];

export const LOADING_MESSAGES = [
  "正在量化你的怨气值...",
  "正在计算打卡漏掉的分钟...",
  "正在评估周一综合症程度...",
  "正在分析年假被折现的可能性...",
  "正在识别眼神中的清澈与愚蠢...",
  "正在解析PPT中的无效信息...",
  "正在同步食堂饭菜的油腻程度...",
  "正在扫描你与工位的高度契合感...",
  "正在雕刻你的灵魂（牛马版）..."
];

export const calculateTier = (profile: WorkProfile): TierResult => {
  let score = 0;

  if (profile.dailyHours > 12) score += 10;
  else if (profile.dailyHours > 10) score += 6;
  else if (profile.dailyHours > 8) score += 3;

  switch (profile.salaryRange) {
    case '3k以下': score += 10; break;
    case '3k-6k': score += 7; break;
    case '6k-10k': score += 5; break;
    case '10k-15k': score += 3; break;
    case '15k-20k': score += 1; break;
    default: score += 0;
  }

  if (profile.continuousDays > 14) score += 10;
  else if (profile.continuousDays > 7) score += 5;
  else if (profile.continuousDays > 5) score += 2;

  if (profile.leaveDays === 0) score += 8;
  else if (profile.leaveDays < 2) score += 4;

  if (profile.mealAllowance < 15) score += 5;
  else if (profile.mealAllowance < 30) score += 2;

  if (score >= 25) {
    return {
      tier: CowHorseTier.GOLD,
      score,
      label: '顶级金牌牛马',
      description: '你已经不是在工作了，你是在燃烧生命供奉公司。',
      colorClass: 'text-amber-600'
    };
  } else if (score >= 12) {
    return {
      tier: CowHorseTier.SILVER,
      score,
      label: '资深银牌牛马',
      description: '游走在崩溃边缘，你是办公室的中坚力量（耗材）。',
      colorClass: 'text-blue-600'
    };
  } else {
    return {
      tier: CowHorseTier.BRONZE,
      score,
      label: '潜力铜牌牛马',
      description: '尚存一线生机，偶尔还能看到下班的太阳。',
      colorClass: 'text-orange-800'
    };
  }
};
