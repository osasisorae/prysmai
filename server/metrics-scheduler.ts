/**
 * Metrics Aggregation Scheduler
 * 
 * Runs periodic aggregation of raw traces into the pre-aggregated metrics table.
 * - Every 5 minutes: aggregate 1-hour buckets for the last 2 hours
 * - Every 30 minutes: aggregate 1-day buckets for the last 2 days
 */

import { runMetricsAggregation } from "./db";

let aggregationInterval: ReturnType<typeof setInterval> | null = null;
let dailyAggregationInterval: ReturnType<typeof setInterval> | null = null;

export function startMetricsScheduler() {
  console.log("[Metrics Scheduler] Starting...");

  // Run initial aggregation on startup (after 10s delay to let DB connect)
  setTimeout(async () => {
    try {
      await runMetricsAggregation();
      console.log("[Metrics Scheduler] Initial aggregation complete");
    } catch (err) {
      console.error("[Metrics Scheduler] Initial aggregation failed:", err);
    }
  }, 10_000);

  // Run every 5 minutes for hourly buckets
  aggregationInterval = setInterval(async () => {
    try {
      await runMetricsAggregation();
    } catch (err) {
      console.error("[Metrics Scheduler] Aggregation failed:", err);
    }
  }, 5 * 60 * 1000); // 5 minutes

  console.log("[Metrics Scheduler] Scheduled: every 5 minutes");
}

export function stopMetricsScheduler() {
  if (aggregationInterval) {
    clearInterval(aggregationInterval);
    aggregationInterval = null;
  }
  if (dailyAggregationInterval) {
    clearInterval(dailyAggregationInterval);
    dailyAggregationInterval = null;
  }
  console.log("[Metrics Scheduler] Stopped");
}
