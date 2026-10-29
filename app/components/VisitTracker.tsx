"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/gamification";

/** 하루 첫 방문 시 연속 사용(스트릭)과 방문 포인트를 기록한다 */
export default function VisitTracker() {
  useEffect(() => {
    trackEvent({ type: "visit" });
  }, []);
  return null;
}
