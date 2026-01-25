// src/common/time/kst.ts
import { fromZonedTime, toZonedTime } from 'date-fns-tz';

export const KST_TZ = 'Asia/Seoul';

/**
 * KST 기준으로 입력된 datetime 문자열을 UTC Date로 변환
 * 예: "2026-02-01T10:30:00" (KST로 해석) -> UTC Date
 *
 * fromZonedTime: "이 값들을 해당 타임존의 로컬 시간으로 해석" → 그 순간의 UTC Date
 */
export function kstStringToUtcDate(kstLocalIsoLike: string): Date {
  return fromZonedTime(kstLocalIsoLike, KST_TZ);
}

/**
 * UTC Date를 KST 기준 "표시용" Date로 변환
 * toZonedTime: UTC date → 해당 타임존에서의 로컬 시각을 getHours() 등으로 읽을 수 있는 Date
 */
export function utcDateToKstDate(utcDate: Date): Date {
  return toZonedTime(utcDate, KST_TZ);
}
