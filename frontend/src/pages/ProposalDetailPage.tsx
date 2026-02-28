import { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { proposalsApi } from "../api/proposals";
import TabNav from "../components/tabs/TabNav";
import WBSTab from "../components/tabs/WBSTab";
import PricingTab from "../components/tabs/PricingTab";
import PeopleTab from "../components/tabs/PeopleTab";
import OverviewTab from "../components/tabs/OverviewTab";
import ScheduleTab from "../components/tabs/ScheduleTab";
import DeliverablesTab from "../components/tabs/DeliverablesTab";
import DrawingsTab from "../components/tabs/DrawingsTab";
import { useProposalSocket, type Presence } from "../hooks/useProposalSocket";

const STATUS_STYLES: Record<string, string> = {
  draft:     "bg-wsp-bg-soft text-wsp-muted",
  active:    "bg-green-50 text-green-700",
  submitted: "bg-blue-50 text-blue-700",
  won:       "bg-emerald-50 text-emerald-700",
  lost:      "bg-red-50 text-wsp-red",
};

export default function ProposalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("wbs");
  const [presence, setPresence] = useState<Presence>({});

  const onPresence = useCallback((p: Presence) => setPresence(p), []);

  useProposalSocket({ proposalId: id!, activeTab, onPresence });

  const { data: proposal, isLoading } = useQuery({
    queryKey: ["proposal", id],
    queryFn: () => proposalsApi.get(id!),
    enabled: !!id,
  });

  if (isLoading) return (
    <div className="min-h-screen bg-wsp-bg-soft flex items-center justify-center">
      <span className="text-wsp-muted font-body text-sm tracking-wide">Loading proposal…</span>
    </div>
  );
  if (!proposal) return (
    <div className="min-h-screen bg-wsp-bg-soft flex items-center justify-center">
      <span className="text-wsp-red font-body text-sm">Proposal not found.</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-wsp-bg-soft">
      {/* Top bar */}
      <header className="bg-wsp-dark">
        <div className="max-w-7xl mx-auto px-6 py-0 flex items-stretch gap-0">
          {/* WSP logo area */}
          <div className="flex items-center pr-6 border-r border-white/10">
            <span className="font-display font-bold text-white text-xl tracking-widest uppercase">WSP</span>
          </div>

          {/* Back + proposal identity */}
          <div className="flex items-center gap-4 px-6 flex-1 py-4">
            <button
              onClick={() => navigate("/proposals")}
              className="text-white/50 hover:text-white text-xs font-display tracking-widest uppercase
                         transition-colors flex items-center gap-1.5"
            >
              ← Proposals
            </button>
            <span className="text-white/20">/</span>
            <div className="flex items-center gap-3">
              <span className="font-mono text-wsp-red text-sm tracking-wider">
                {proposal.proposal_number}
              </span>
              <h1 className="font-display font-semibold text-white text-base tracking-wide">
                {proposal.title}
              </h1>
            </div>
            <div className="ml-auto flex items-center gap-3">
              {proposal.client_name && (
                <span className="text-white/60 text-sm font-body">{proposal.client_name}</span>
              )}
              <span className={`wsp-badge ${STATUS_STYLES[proposal.status] || "bg-wsp-bg-soft text-wsp-muted"}`}>
                {proposal.status}
              </span>
              {/* Live user count */}
              {Object.values(presence).flat().length > 0 && (
                <div className="flex items-center gap-1.5 border-l border-white/10 pl-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-white/40 text-xs font-mono">
                    {Object.values(presence).flat().length} online
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <TabNav activeTab={activeTab} onChange={setActiveTab} presence={presence} />

      <div className="max-w-7xl mx-auto py-6 px-6">
        {activeTab === "wbs"          && <WBSTab proposalId={id!} />}
        {activeTab === "overview"     && <OverviewTab proposalId={id!} />}
        {activeTab === "pricing"      && <PricingTab proposalId={id!} />}
        {activeTab === "people"       && <PeopleTab proposalId={id!} />}
        {activeTab === "schedule"     && <ScheduleTab proposalId={id!} />}
        {activeTab === "deliverables" && <DeliverablesTab proposalId={id!} />}
        {activeTab === "drawings"     && <DrawingsTab proposalId={id!} />}
      </div>
    </div>
  );
}
