import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

/** Presence map: tab id -> array of user names currently on that tab */
export type Presence = Record<string, string[]>;

interface Options {
  proposalId: string;
  activeTab: string;
  onPresence: (presence: Presence) => void;
}

const TABLE_QUERY_KEY: Record<string, string> = {
  wbs_items:       "wbs",
  pricing_rows:    "pricing",
  proposed_people: "people",
  scope_sections:  "scope",
  schedule_items:  "schedule",
  deliverables:    "deliverables",
  drawings:        "drawings",
};

export function useProposalSocket({ proposalId, activeTab, onPresence }: Options) {
  const qc = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  // Stable broadcast function for callers to send their own mutations to peers
  const broadcast = useCallback((msg: object) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || !proposalId) return;

    let attempt = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let intentionalClose = false;

    const connect = () => {
      const apiBase = (import.meta.env.VITE_API_URL || "http://localhost:8001").replace("http", "ws");
      const wsUrl = `${apiBase}/ws/proposals/${proposalId}?token=${token}&tab=${activeTabRef.current}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        attempt = 0; // reset backoff on successful connection
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === "presence") {
            onPresence(msg.presence ?? {});
            return;
          }

          // Data change — invalidate the relevant query to trigger a refetch
          const queryKey = msg.table ? TABLE_QUERY_KEY[msg.table] : null;
          if (queryKey) {
            qc.invalidateQueries({ queryKey: [queryKey, proposalId] });
          }
        } catch {
          // ignore malformed frames
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
        if (!intentionalClose && attempt < 10) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
          attempt++;
          reconnectTimer = setTimeout(connect, delay);
        }
      };
    };

    connect();

    return () => {
      intentionalClose = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      wsRef.current?.close();
      wsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposalId]);

  // Notify server when active tab changes
  useEffect(() => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "tab_change", tab: activeTab }));
    }
  }, [activeTab]);

  return { broadcast };
}
