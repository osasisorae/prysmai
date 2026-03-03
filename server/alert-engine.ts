/**
 * Alert Evaluation Engine
 * 
 * Checks enabled alert configs against recent metrics and sends notifications
 * via email (Resend), Slack webhook, Discord webhook, or custom webhook.
 * 
 * Runs every 5 minutes via the metrics scheduler.
 * Uses per-alert cooldown from DB (cooldownMinutes) and windowMinutes for evaluation.
 */

import { getDb } from "./db";
import { alertConfigs, traces } from "../drizzle/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const SITE_URL = process.env.SITE_URL || "https://prysmai.manus.space";

// Track last-fired times in memory (persists across evaluations, resets on server restart)
const lastFired = new Map<number, number>();

interface AlertRow {
  id: number;
  projectId: number;
  name: string;
  metric: string;
  condition: string;
  threshold: string;
  windowMinutes: number;
  cooldownMinutes: number;
  channels: Array<{ type: string; target: string }> | null;
  enabled: boolean;
  lastTriggeredAt: Date | null;
}

/**
 * Evaluate all enabled alerts across all projects
 */
export async function evaluateAlerts(): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;

    const configs = await db
      .select()
      .from(alertConfigs)
      .where(eq(alertConfigs.enabled, true));

    if (configs.length === 0) return;

    // Group by projectId to batch metric queries
    const byProject = new Map<number, AlertRow[]>();
    for (const config of configs) {
      const list = byProject.get(config.projectId) || [];
      list.push(config as AlertRow);
      byProject.set(config.projectId, list);
    }

    for (const entry of Array.from(byProject.entries())) {
      const [projectId, projectAlerts] = entry;
      try {
        await evaluateProjectAlerts(projectId, projectAlerts);
      } catch (err) {
        console.error(`[Alerts] Error evaluating project ${projectId}:`, err);
      }
    }
  } catch (err) {
    console.error("[Alerts] Evaluation failed:", err);
  }
}

/**
 * Evaluate alerts for a single project
 */
async function evaluateProjectAlerts(projectId: number, alerts: AlertRow[]): Promise<void> {
  const now = new Date();

  // Determine the max window needed across all alerts for this project
  const maxWindowMin = Math.max(...alerts.map(a => a.windowMinutes || 15));
  const windowStart = new Date(now.getTime() - maxWindowMin * 60 * 1000);

  const db = await getDb();
  if (!db) return;

  // Query aggregate metrics for the evaluation window
  const recentTraces = await db
    .select({
      count: sql<number>`count(*)`,
      errorCount: sql<number>`sum(case when ${traces.status} = 'error' then 1 else 0 end)`,
      avgLatency: sql<number>`COALESCE(avg(${traces.latencyMs}), 0)`,
      totalCost: sql<number>`COALESCE(sum(${traces.costUsd}), 0)`,
      maxLatency: sql<number>`COALESCE(max(${traces.latencyMs}), 0)`,
    })
    .from(traces)
    .where(
      and(
        eq(traces.projectId, projectId),
        gte(traces.timestamp, windowStart),
        lte(traces.timestamp, now)
      )
    );

  const m = recentTraces[0];
  if (!m || Number(m.count) === 0) return;

  const count = Number(m.count);
  const errorRate = count > 0 ? (Number(m.errorCount || 0) / count) * 100 : 0;

  const currentValues: Record<string, number> = {
    error_rate: errorRate,
    latency_avg: Number(m.avgLatency),
    latency_max: Number(m.maxLatency),
    cost_total: Number(m.totalCost),
    cost_per_hour: Number(m.totalCost) / (maxWindowMin / 60),
    request_count: count,
  };

  // Compute p95 latency if any alert needs it
  const needsP95 = alerts.some(a => a.metric === "latency_p95");
  if (needsP95) {
    const latencies = await db
      .select({ latency: traces.latencyMs })
      .from(traces)
      .where(
        and(
          eq(traces.projectId, projectId),
          gte(traces.timestamp, windowStart),
          lte(traces.timestamp, now)
        )
      )
      .orderBy(traces.latencyMs);

    if (latencies.length > 0) {
      const sorted = latencies.map((l: any) => Number(l.latency)).sort((a: number, b: number) => a - b);
      const p95Index = Math.ceil(sorted.length * 0.95) - 1;
      currentValues.latency_p95 = sorted[Math.max(0, p95Index)];
    }
  }

  // Evaluate each alert
  for (const alert of alerts) {
    try {
      const currentValue = currentValues[alert.metric];
      if (currentValue === undefined) continue;

      const threshold = parseFloat(alert.threshold);
      if (isNaN(threshold)) continue;

      const triggered = evaluateCondition(currentValue, alert.condition, threshold);

      if (triggered) {
        // Check cooldown (use DB cooldownMinutes, fallback to 15 min)
        const cooldownMs = (alert.cooldownMinutes || 15) * 60 * 1000;
        const lastTime = lastFired.get(alert.id) || 0;
        const dbLastTriggered = alert.lastTriggeredAt ? alert.lastTriggeredAt.getTime() : 0;
        const effectiveLastFired = Math.max(lastTime, dbLastTriggered);

        if (now.getTime() - effectiveLastFired < cooldownMs) {
          continue; // Still in cooldown
        }

        console.log(`[Alerts] TRIGGERED: "${alert.name}" (${alert.metric} ${alert.condition} ${alert.threshold}, current: ${currentValue.toFixed(4)})`);
        lastFired.set(alert.id, now.getTime());

        // Update lastTriggeredAt in DB
        try {
          await db
            .update(alertConfigs)
            .set({ lastTriggeredAt: now })
            .where(eq(alertConfigs.id, alert.id));
        } catch (dbErr) {
          console.error(`[Alerts] Failed to update lastTriggeredAt for alert ${alert.id}:`, dbErr);
        }

        await sendAlertNotifications(alert, currentValue);
      }
    } catch (err) {
      console.error(`[Alerts] Error evaluating alert ${alert.id} "${alert.name}":`, err);
    }
  }
}

/**
 * Check if a condition is met
 */
function evaluateCondition(value: number, condition: string, threshold: number): boolean {
  switch (condition) {
    case "gt":
    case ">":
      return value > threshold;
    case "gte":
    case ">=":
      return value >= threshold;
    case "lt":
    case "<":
      return value < threshold;
    case "lte":
    case "<=":
      return value <= threshold;
    case "eq":
    case "==":
      return Math.abs(value - threshold) < 0.0001;
    default:
      return false;
  }
}

/**
 * Send notifications through all configured channels
 */
async function sendAlertNotifications(alert: AlertRow, currentValue: number): Promise<void> {
  const channels = alert.channels;
  if (!channels || !Array.isArray(channels) || channels.length === 0) return;

  const metricLabels: Record<string, string> = {
    error_rate: "Error Rate",
    latency_avg: "Avg Latency",
    latency_max: "Max Latency",
    latency_p95: "P95 Latency",
    cost_total: "Total Cost",
    cost_per_hour: "Cost per Hour",
    request_count: "Request Count",
  };

  const metricUnits: Record<string, string> = {
    error_rate: "%",
    latency_avg: "ms",
    latency_max: "ms",
    latency_p95: "ms",
    cost_total: " USD",
    cost_per_hour: " USD/hr",
    request_count: "",
  };

  const metricLabel = metricLabels[alert.metric] || alert.metric;
  const unit = metricUnits[alert.metric] || "";
  const conditionLabel = alert.condition === "gt" ? "exceeded" : alert.condition === "lt" ? "dropped below" : alert.condition;

  const subject = `[Prysm AI Alert] ${alert.name}`;
  const message = `Alert "${alert.name}" triggered: ${metricLabel} ${conditionLabel} threshold of ${alert.threshold}${unit}. Current value: ${currentValue.toFixed(4)}${unit}.`;

  for (const channel of channels) {
    if (!channel.type || !channel.target) continue;

    try {
      switch (channel.type) {
        case "email":
          await resend.emails.send({
            from: `Prysm AI <${process.env.RESEND_FROM_EMAIL || "alerts@prysmai.io"}>`,
            to: channel.target,
            subject,
            html: getAlertEmailHtml(alert.name, metricLabel, conditionLabel, alert.threshold, unit, currentValue),
          });
          console.log(`[Alerts] Email sent to ${channel.target} for "${alert.name}"`);
          break;

        case "slack":
          await fetch(channel.target, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: message,
              blocks: [
                {
                  type: "section",
                  text: {
                    type: "mrkdwn",
                    text: `:rotating_light: *${subject}*\n${message}`,
                  },
                },
              ],
            }),
          });
          console.log(`[Alerts] Slack notification sent for "${alert.name}"`);
          break;

        case "discord":
          await fetch(channel.target, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              content: `**${subject}**\n${message}`,
            }),
          });
          console.log(`[Alerts] Discord notification sent for "${alert.name}"`);
          break;

        case "webhook":
          await fetch(channel.target, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              alert: alert.name,
              metric: alert.metric,
              condition: alert.condition,
              threshold: parseFloat(alert.threshold),
              currentValue,
              triggeredAt: new Date().toISOString(),
              projectId: alert.projectId,
            }),
          });
          console.log(`[Alerts] Webhook sent to ${channel.target} for "${alert.name}"`);
          break;

        case "pagerduty":
          // PagerDuty Events API v2 — trigger an incident
          // channel.target = PagerDuty Integration Key (routing key)
          await sendPagerDutyEvent({
            routingKey: channel.target,
            eventAction: "trigger",
            dedupKey: `prysm-alert-${alert.id}`,
            summary: `${subject}: ${metricLabel} ${conditionLabel} ${alert.threshold}${unit} (current: ${currentValue.toFixed(4)}${unit})`,
            source: `prysm-project-${alert.projectId}`,
            severity: getSeverityFromMetric(alert.metric, currentValue, parseFloat(alert.threshold)),
            customDetails: {
              alertName: alert.name,
              metric: alert.metric,
              condition: alert.condition,
              threshold: parseFloat(alert.threshold),
              currentValue,
              unit,
              projectId: alert.projectId,
              dashboardUrl: `${SITE_URL}/dashboard`,
            },
          });
          console.log(`[Alerts] PagerDuty event triggered for "${alert.name}"`);
          break;

        default:
          console.warn(`[Alerts] Unknown channel type: ${channel.type}`);
      }
    } catch (err) {
      console.error(`[Alerts] Failed to send ${channel.type} notification to ${channel.target}:`, err);
    }
  }
}

// ─── PagerDuty Events API v2 ─────────────────────────────────────────

const PAGERDUTY_EVENTS_URL = "https://events.pagerduty.com/v2/enqueue";

interface PagerDutyEventParams {
  routingKey: string;
  eventAction: "trigger" | "acknowledge" | "resolve";
  dedupKey: string;
  summary: string;
  source: string;
  severity: "critical" | "error" | "warning" | "info";
  customDetails?: Record<string, unknown>;
}

/**
 * Send an event to PagerDuty Events API v2.
 * Used for triggering, acknowledging, and resolving incidents.
 */
export async function sendPagerDutyEvent(params: PagerDutyEventParams): Promise<{ status: string; dedupKey: string }> {
  const payload: Record<string, unknown> = {
    routing_key: params.routingKey,
    event_action: params.eventAction,
    dedup_key: params.dedupKey,
  };

  // Payload body only needed for trigger events
  if (params.eventAction === "trigger") {
    payload.payload = {
      summary: params.summary,
      source: params.source,
      severity: params.severity,
      timestamp: new Date().toISOString(),
      custom_details: params.customDetails || {},
      component: "prysm-ai-monitoring",
      group: "ai-observability",
      class: "metric-alert",
    };
    payload.links = [
      {
        href: `${SITE_URL}/dashboard`,
        text: "View Prysm AI Dashboard",
      },
    ];
    payload.client = "Prysm AI";
    payload.client_url = SITE_URL;
  }

  const response = await fetch(PAGERDUTY_EVENTS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PagerDuty API error (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  return { status: result.status, dedupKey: result.dedup_key || params.dedupKey };
}

/**
 * Resolve a PagerDuty incident by dedup key.
 * Called when the alert condition normalizes (metric returns to acceptable range).
 */
export async function resolvePagerDutyIncident(
  routingKey: string,
  alertId: number
): Promise<void> {
  try {
    await sendPagerDutyEvent({
      routingKey,
      eventAction: "resolve",
      dedupKey: `prysm-alert-${alertId}`,
      summary: "Alert condition resolved",
      source: "prysm-ai",
      severity: "info",
    });
    console.log(`[Alerts] PagerDuty incident resolved for alert ${alertId}`);
  } catch (err) {
    console.error(`[Alerts] Failed to resolve PagerDuty incident for alert ${alertId}:`, err);
  }
}

/**
 * Map metric values to PagerDuty severity levels.
 * Critical: >2x threshold, Error: >1.5x, Warning: >1x, Info: at threshold
 */
function getSeverityFromMetric(
  metric: string,
  currentValue: number,
  threshold: number
): "critical" | "error" | "warning" | "info" {
  const ratio = threshold > 0 ? currentValue / threshold : 1;

  // For "less than" conditions (e.g., request_count dropped), invert the ratio
  if (metric === "request_count") {
    if (ratio <= 0.25) return "critical";
    if (ratio <= 0.5) return "error";
    return "warning";
  }

  // For "greater than" conditions (error_rate, latency, cost)
  if (ratio >= 2.0) return "critical";
  if (ratio >= 1.5) return "error";
  if (ratio >= 1.0) return "warning";
  return "info";
}

/**
 * HTML email template for alerts
 */
function getAlertEmailHtml(
  alertName: string,
  metricLabel: string,
  conditionLabel: string,
  threshold: string,
  unit: string,
  currentValue: number
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#0a0a0f;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0f;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
          <tr>
            <td style="padding-bottom:24px;">
              <span style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">
                Prysm<span style="color:#00e5cc;">AI</span>
              </span>
            </td>
          </tr>
          <tr>
            <td style="background-color:#111118;border:1px solid #1e1e2e;border-radius:12px;padding:32px;">
              <div style="background-color:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);border-radius:8px;padding:4px 12px;display:inline-block;margin-bottom:16px;">
                <span style="font-size:11px;font-weight:600;color:#ef4444;text-transform:uppercase;letter-spacing:0.1em;">
                  Alert Triggered
                </span>
              </div>
              <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#ffffff;line-height:1.3;">
                ${alertName}
              </h1>
              <p style="margin:0 0 24px;font-size:15px;color:#a0a0b0;line-height:1.7;">
                <strong style="color:#ffffff;">${metricLabel}</strong> ${conditionLabel} your threshold of <strong style="color:#ffffff;">${threshold}${unit}</strong>.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="background-color:#0a0a0f;border-radius:8px;padding:16px;width:100%;">
                <tr>
                  <td style="padding:8px 16px;">
                    <span style="font-size:12px;color:#666;text-transform:uppercase;">Current Value</span><br/>
                    <span style="font-size:24px;font-weight:700;color:#ef4444;">${currentValue.toFixed(4)}${unit}</span>
                  </td>
                  <td style="padding:8px 16px;">
                    <span style="font-size:12px;color:#666;text-transform:uppercase;">Threshold</span><br/>
                    <span style="font-size:24px;font-weight:700;color:#ffffff;">${threshold}${unit}</span>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-size:13px;color:#555568;">
                Triggered at ${new Date().toISOString().replace("T", " ").slice(0, 19)} UTC
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-top:24px;text-align:center;">
              <a href="${SITE_URL}/dashboard" style="color:#00e5cc;font-size:13px;text-decoration:none;">View Dashboard</a>
              <p style="margin:8px 0 0;font-size:11px;color:#3a3a4a;">
                &copy; ${new Date().getFullYear()} Prysm AI
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
