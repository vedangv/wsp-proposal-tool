import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { scopeApi, type ScopeSection } from "../../api/scope";
import { wbsApi } from "../../api/wbs";
import { agentsApi, type RFPScopeResult } from "../../api/agents";

interface Props { proposalId: string; }

type FetchState = "idle" | "fetching" | "done" | "error";

export default function OverviewTab({ proposalId }: Props) {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editName, setEditName] = useState("");
  const [editWbsId, setEditWbsId] = useState<string | null>(null);

  // RFP fetch state
  const [fetchState, setFetchState] = useState<FetchState>("idle");
  const [rfpResults, setRfpResults] = useState<RFPScopeResult[]>([]);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: sections = [], isLoading } = useQuery({
    queryKey: ["scope", proposalId],
    queryFn: () => scopeApi.list(proposalId),
  });

  const { data: wbsItems = [] } = useQuery({
    queryKey: ["wbs", proposalId],
    queryFn: () => wbsApi.list(proposalId),
  });

  const wbsMap = Object.fromEntries(wbsItems.map(w => [w.id, w]));

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ScopeSection> }) =>
      scopeApi.update(proposalId, id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scope", proposalId] });
      setEditingId(null);
    },
  });

  const addMutation = useMutation({
    mutationFn: (data: { section_name: string; content: string } | undefined) =>
      scopeApi.create(proposalId, {
        section_name: data?.section_name || "New Section",
        content: data?.content || "",
        order_index: sections.length,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scope", proposalId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => scopeApi.delete(proposalId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scope", proposalId] }),
  });

  // Cleanup poll on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const startRFPFetch = async () => {
    setFetchState("fetching");
    setRfpResults([]);
    setDismissed(new Set());
    try {
      const { job_id } = await agentsApi.startRFPExtract(proposalId);
      // Poll every 1s
      pollRef.current = setInterval(async () => {
        try {
          const job = await agentsApi.pollJob(job_id);
          if (job.status === "complete" && job.result) {
            if (pollRef.current) clearInterval(pollRef.current);
            setRfpResults(job.result as unknown as RFPScopeResult[]);
            setFetchState("done");
          } else if (job.status === "error") {
            if (pollRef.current) clearInterval(pollRef.current);
            setFetchState("error");
          }
        } catch {
          if (pollRef.current) clearInterval(pollRef.current);
          setFetchState("error");
        }
      }, 1000);
    } catch {
      setFetchState("error");
    }
  };

  const acceptResult = (r: RFPScopeResult, idx: number) => {
    addMutation.mutate({ section_name: r.section_name, content: r.content });
    setDismissed(prev => new Set(prev).add(idx));
  };

  const dismissResult = (idx: number) => {
    setDismissed(prev => new Set(prev).add(idx));
  };

  const visibleResults = rfpResults.filter((_, i) => !dismissed.has(i));

  const startEdit = (s: ScopeSection) => {
    setEditingId(s.id);
    setEditContent(s.content);
    setEditName(s.section_name);
    setEditWbsId(s.wbs_id);
  };

  const saveEdit = (id: string) =>
    updateMutation.mutate({ id, data: { section_name: editName, content: editContent, wbs_id: editWbsId || undefined } });

  if (isLoading) return <div className="py-8 text-gray-400 text-sm text-center">Loading…</div>;

  return (
    <div className="max-w-3xl">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-semibold text-gray-800">Proposal Overview</h3>
        <div className="flex gap-2">
          <button
            onClick={startRFPFetch}
            disabled={fetchState === "fetching"}
            className="text-sm border px-3 py-1.5 rounded disabled:opacity-40 bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
          >
            {fetchState === "fetching" ? (
              <span className="flex items-center gap-1.5">
                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                Extracting…
              </span>
            ) : "Fetch from RFP"}
          </button>
          <button
            onClick={() => addMutation.mutate(undefined)}
            className="text-sm text-blue-600 hover:text-blue-800 border border-blue-200 px-3 py-1.5 rounded"
          >+ Add Section</button>
        </div>
      </div>

      {/* RFP extraction results */}
      {fetchState === "error" && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          Failed to extract from RFP. <button onClick={startRFPFetch} className="underline ml-1">Try again</button>
        </div>
      )}

      {fetchState === "done" && visibleResults.length > 0 && (
        <div className="mb-6 space-y-3">
          <p className="text-xs font-medium text-purple-600 uppercase tracking-wide">Extracted from RFP — Review & Accept</p>
          {visibleResults.map((r, _i) => {
            const originalIdx = rfpResults.indexOf(r);
            return (
              <div key={originalIdx} className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-purple-900 text-sm">{r.section_name}</h4>
                  <div className="flex gap-2 shrink-0 ml-4">
                    <button
                      onClick={() => acceptResult(r, originalIdx)}
                      className="text-xs bg-purple-600 text-white px-2.5 py-1 rounded hover:bg-purple-700"
                    >Accept</button>
                    <button
                      onClick={() => dismissResult(originalIdx)}
                      className="text-xs text-purple-400 hover:text-purple-600 px-2 py-1"
                    >Dismiss</button>
                  </div>
                </div>
                <p className="text-sm text-purple-800/80 whitespace-pre-wrap">{r.content}</p>
              </div>
            );
          })}
        </div>
      )}

      {fetchState === "done" && visibleResults.length === 0 && rfpResults.length > 0 && (
        <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          All extracted sections processed.
        </div>
      )}

      <div className="space-y-6">
        {sections.map(section => (
          <div key={section.id} className="bg-white rounded-lg border">
            {editingId === section.id ? (
              <div className="p-4 space-y-3">
                <input
                  className="border rounded px-3 py-1.5 w-full text-sm font-semibold"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                />
                <select
                  className="border rounded px-3 py-1.5 w-full text-sm"
                  value={editWbsId || ""}
                  onChange={e => setEditWbsId(e.target.value || null)}
                >
                  <option value="">— No WBS link —</option>
                  {wbsItems.map(w => (
                    <option key={w.id} value={w.id}>{w.wbs_code} — {w.description || "Untitled"}</option>
                  ))}
                </select>
                <textarea
                  className="border rounded px-3 py-2 w-full text-sm resize-none"
                  rows={6}
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  placeholder="Enter section content…"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => saveEdit(section.id)}
                    className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700"
                  >Save</button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="border px-3 py-1.5 rounded text-sm text-gray-600 hover:text-gray-800"
                  >Cancel</button>
                </div>
              </div>
            ) : (
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-gray-800 text-sm">{section.section_name}</h4>
                    {section.wbs_id && wbsMap[section.wbs_id] && (
                      <span className="wsp-badge bg-wsp-bg-soft text-wsp-red border border-wsp-border text-[10px] font-mono">
                        {wbsMap[section.wbs_id].wbs_code}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => startEdit(section)}
                      className="text-xs text-gray-400 hover:text-gray-700"
                    >Edit</button>
                    <button
                      onClick={() => window.confirm("Delete this section?") && deleteMutation.mutate(section.id)}
                      className="text-xs text-red-400 hover:text-red-600"
                    >Del</button>
                  </div>
                </div>
                {section.content ? (
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{section.content}</p>
                ) : (
                  <p className="text-sm text-gray-300 italic">Click Edit to add content…</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
