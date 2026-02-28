import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { scopeApi, type ScopeSection } from "../../api/scope";

interface Props { proposalId: string; }

export default function OverviewTab({ proposalId }: Props) {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editName, setEditName] = useState("");

  const { data: sections = [], isLoading } = useQuery({
    queryKey: ["scope", proposalId],
    queryFn: () => scopeApi.list(proposalId),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ScopeSection> }) =>
      scopeApi.update(proposalId, id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scope", proposalId] });
      setEditingId(null);
    },
  });

  const addMutation = useMutation({
    mutationFn: () => scopeApi.create(proposalId, {
      section_name: "New Section",
      content: "",
      order_index: sections.length,
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scope", proposalId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => scopeApi.delete(proposalId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scope", proposalId] }),
  });

  const startEdit = (s: ScopeSection) => {
    setEditingId(s.id);
    setEditContent(s.content);
    setEditName(s.section_name);
  };

  const saveEdit = (id: string) =>
    updateMutation.mutate({ id, data: { section_name: editName, content: editContent } });

  if (isLoading) return <div className="py-8 text-gray-400 text-sm text-center">Loading…</div>;

  return (
    <div className="max-w-3xl">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-semibold text-gray-800">Proposal Overview</h3>
        <button
          onClick={() => addMutation.mutate()}
          className="text-sm text-blue-600 hover:text-blue-800 border border-blue-200 px-3 py-1.5 rounded"
        >+ Add Section</button>
      </div>

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
                  <h4 className="font-semibold text-gray-800 text-sm">{section.section_name}</h4>
                  <div className="flex gap-3">
                    <button
                      onClick={() => startEdit(section)}
                      className="text-xs text-gray-400 hover:text-gray-700"
                    >Edit</button>
                    <button
                      onClick={() => deleteMutation.mutate(section.id)}
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
