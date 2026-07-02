
import { CowHorseTier } from '../types';

/**
 * 根据等级从对应的文件夹中随机选择一张图片
 * @param tier 牛马等级
 * @returns 图片的 URL 路径
 */
export const getTierImage = (tier: CowHorseTier): string => {
  let folder: string;
  let maxCount: number;

  switch (tier) {
    case CowHorseTier.GOLD:
      folder = 'jinpai';
      maxCount = 6; // jinpai 文件夹有 1.png 到 6.png
      break;
    case CowHorseTier.SILVER:
      folder = 'yinpai';
      maxCount = 6; // yinpai 文件夹有 1.png 到 6.png
      break;
    case CowHorseTier.BRONZE:
      folder = 'tongpai';
      maxCount = 1; // tongpai 文件夹只有 1.png
      break;
    default:
      folder = 'tongpai';
      maxCount = 1;
  }

  // 随机选择一个图片编号（1 到 maxCount）
  const randomIndex = Math.floor(Math.random() * maxCount) + 1;
  
  // 返回图片路径（Vite 中 public 目录的文件可以通过 / 路径访问）
  return `/${folder}/${randomIndex}.png`;
};
