import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { proposalsApi } from "../api/proposals";
import TabNav from "../components/tabs/TabNav";
import WBSTab from "../components/tabs/WBSTab";
import PricingTab from "../components/tabs/PricingTab";
import PeopleTab from "../components/tabs/PeopleTab";
import OverviewTab from "../components/tabs/OverviewTab";

export default function ProposalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("wbs");

  const { data: proposal, isLoading } = useQuery({
    queryKey: ["proposal", id],
    queryFn: () => proposalsApi.get(id!),
    enabled: !!id,
  });

  if (isLoading) return <div className="p-8 text-gray-400">Loading...</div>;
  if (!proposal) return <div className="p-8 text-red-500">Proposal not found</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate("/proposals")}
          className="text-gray-400 hover:text-gray-700 text-sm"
        >← Back</button>
        <div>
          <span className="font-mono text-blue-600 text-sm">{proposal.proposal_number}</span>
          <h1 className="text-lg font-bold text-gray-800">{proposal.title}</h1>
        </div>
        {proposal.client_name && (
          <span className="text-sm text-gray-500 ml-auto">{proposal.client_name}</span>
        )}
      </header>

      <TabNav activeTab={activeTab} onChange={setActiveTab} />

      <div className="max-w-7xl mx-auto py-6 px-4">
        {activeTab === "wbs" && <WBSTab proposalId={id!} />}
        {activeTab === "overview" && <OverviewTab proposalId={id!} />}
        {activeTab === "pricing" && <PricingTab proposalId={id!} />}
        {activeTab === "people" && <PeopleTab proposalId={id!} />}
        {activeTab === "schedule" && <PlaceholderTab label="Schedule / Gantt" sprint={4} />}
        {activeTab === "deliverables" && <PlaceholderTab label="Deliverables" sprint={5} />}
        {activeTab === "drawings" && <PlaceholderTab label="Drawing List" sprint={5} />}
      </div>
    </div>
  );
}

function PlaceholderTab({ label, sprint }: { label: string; sprint: number }) {
  return (
    <div className="text-gray-400 text-sm py-8 text-center">
      {label} — coming in Sprint {sprint}
    </div>
  );
}
