import { PlanType } from '@/types';

export interface PlanLimits {
  maxTags: number;
  maxBookmarks: number;
  priorityDisplay: boolean;
  featuredDisplay: boolean;
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    maxTags: 3,
    maxBookmarks: 10,
    priorityDisplay: false,
    featuredDisplay: false,
  },
  grow: {
    maxTags: 10,
    maxBookmarks: Infinity,
    priorityDisplay: true,
    featuredDisplay: true,
  },
  bloom: {
    maxTags: 20,
    maxBookmarks: Infinity,
    priorityDisplay: true,
    featuredDisplay: true,
  },
};

/**
 * ユーザーのプラン制限を取得
 */
export function getPlanLimits(planType: PlanType = 'free'): PlanLimits {
  return PLAN_LIMITS[planType];
}

/**
 * タグ数の制限チェック
 */
export function canAddTag(currentTagCount: number, planType: PlanType = 'free'): boolean {
  const limits = getPlanLimits(planType);
  return currentTagCount < limits.maxTags;
}

/**
 * ブックマーク数の制限チェック
 */
export function canAddBookmark(currentBookmarkCount: number, planType: PlanType = 'free'): boolean {
  const limits = getPlanLimits(planType);
  return currentBookmarkCount < limits.maxBookmarks;
}

