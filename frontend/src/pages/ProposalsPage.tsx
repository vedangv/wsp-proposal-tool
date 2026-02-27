import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { proposalsApi } from "../api/proposals";
import { useAuth } from "../context/AuthContext";

const STATUS_COLORS = {
  draft: "bg-gray-100 text-gray-700",
  in_review: "bg-yellow-100 text-yellow-700",
  submitted: "bg-green-100 text-green-700",
};

export default function ProposalsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ proposal_number: "", title: "", client_name: "" });

  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ["proposals"],
    queryFn: proposalsApi.list,
  });

  const createMutation = useMutation({
    mutationFn: proposalsApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["proposals"] }); setShowForm(false); },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-700">WSP Proposal Tool</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{user?.name}</span>
          <button onClick={logout} className="text-sm text-gray-500 hover:text-gray-800">Sign out</button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-gray-800">Proposals</h2>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
          >+ New Proposal</button>
        </div>

        {showForm && (
          <div className="bg-white border rounded-lg p-4 mb-4 grid grid-cols-3 gap-3">
            <input className="border rounded px-3 py-1.5 text-sm" placeholder="Proposal #" value={form.proposal_number} onChange={e => setForm(f => ({...f, proposal_number: e.target.value}))} />
            <input className="border rounded px-3 py-1.5 text-sm" placeholder="Title" value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} />
            <input className="border rounded px-3 py-1.5 text-sm" placeholder="Client Name" value={form.client_name} onChange={e => setForm(f => ({...f, client_name: e.target.value}))} />
            <div className="col-span-3 flex gap-2">
              <button onClick={() => createMutation.mutate({ ...form, status: "draft" })} className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm">Create</button>
              <button onClick={() => setShowForm(false)} className="border px-4 py-1.5 rounded text-sm">Cancel</button>
            </div>
          </div>
        )}

        {isLoading ? (
          <p className="text-gray-500 text-sm">Loading...</p>
        ) : (
          <div className="bg-white rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Proposal #</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Title</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Client</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {proposals.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/proposals/${p.id}`)}>
                    <td className="px-4 py-3 font-mono text-blue-600">{p.proposal_number}</td>
                    <td className="px-4 py-3">{p.title}</td>
                    <td className="px-4 py-3 text-gray-500">{p.client_name || "—"}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p.status]}`}>{p.status}</span></td>
                    <td className="px-4 py-3 text-gray-400">{new Date(p.updated_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {proposals.length === 0 && <p className="text-center py-12 text-gray-400">No proposals yet. Create one.</p>}
          </div>
        )}
      </main>
    </div>
  );
}
