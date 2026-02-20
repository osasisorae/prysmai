import { useState, useEffect, useRef, useCallback } from "react";

interface LiveTrace {
  id: number;
  traceId: string;
  model: string;
  provider: string;
  status: string;
  latencyMs: number | null;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  costUsd: string | null;
  timestamp: string;
  isStreaming: boolean | null;
}

interface UseTraceFeedOptions {
  projectId: number | null;
  enabled?: boolean;
  maxTraces?: number;
}

export function useTraceFeed({ projectId, enabled = true, maxTraces = 50 }: UseTraceFeedOptions) {
  const [traces, setTraces] = useState<LiveTrace[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (!projectId || !enabled) return;

    // Determine WebSocket URL
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/live-feed?projectId=${projectId}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        console.log("[WS] Connected to live feed");
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "trace") {
            setTraces((prev) => {
              const updated = [msg.data, ...prev];
              return updated.slice(0, maxTraces);
            });
          }
        } catch {
          // Ignore malformed messages
        }
      };

      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;
        // Reconnect after 3 seconds
        if (enabled) {
          reconnectTimer.current = setTimeout(connect, 3000);
        }
      };

      ws.onerror = () => {
        // Will trigger onclose
      };
    } catch {
      // Retry after 5 seconds
      reconnectTimer.current = setTimeout(connect, 5000);
    }
  }, [projectId, enabled, maxTraces]);

  useEffect(() => {
    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
    };
  }, [connect]);

  const clearTraces = useCallback(() => {
    setTraces([]);
  }, []);

  return { traces, connected, clearTraces };
}
