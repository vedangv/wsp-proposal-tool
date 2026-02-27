import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { wbsApi, WBSItem } from "../../api/wbs";

interface Props { proposalId: string; }

export default function WBSTab({ proposalId }: Props) {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<WBSItem>>({});
  const [deleteWarning, setDeleteWarning] = useState<{ id: string; count: number } | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["wbs", proposalId],
    queryFn: () => wbsApi.list(proposalId),
  });

  const createMutation = useMutation({
    mutationFn: () => wbsApi.create(proposalId, {
      wbs_code: "1.0", description: "New item", phase: "", hours: 0, unit_rate: 0,
      order_index: items.length,
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wbs", proposalId] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<WBSItem> }) =>
      wbsApi.update(proposalId, id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wbs", proposalId] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => wbsApi.delete(proposalId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wbs", proposalId] });
      setDeleteWarning(null);
    },
  });

  const totalCost = items.reduce((sum, i) => sum + (i.total_cost || 0), 0);

  const startEdit = (item: WBSItem) => {
    setEditingId(item.id);
    setEditValues({
      wbs_code: item.wbs_code,
      description: item.description || "",
      phase: item.phase || "",
      hours: item.hours,
      unit_rate: item.unit_rate,
    });
  };

  const saveEdit = (id: string) => updateMutation.mutate({ id, data: editValues });

  const handleDelete = async (id: string) => {
    const links = await wbsApi.links(proposalId, id);
    if (links.total > 0) {
      setDeleteWarning({ id, count: links.total });
    } else {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-gray-800">Work Breakdown Structure</h3>
        <button
          onClick={() => createMutation.mutate()}
          className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700"
        >+ Add Item</button>
      </div>

      {deleteWarning && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-4 flex items-center justify-between">
          <p className="text-sm text-yellow-800">
            This WBS item is linked to <strong>{deleteWarning.count}</strong> other item(s). Delete anyway?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => deleteMutation.mutate(deleteWarning.id)}
              className="bg-red-600 text-white px-3 py-1.5 rounded text-sm"
            >Delete</button>
            <button
              onClick={() => setDeleteWarning(null)}
              className="border px-3 py-1.5 rounded text-sm"
            >Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 text-gray-600 font-medium w-28">WBS Code</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Description</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium w-32">Phase</th>
              <th className="text-right px-4 py-3 text-gray-600 font-medium w-24">Hours</th>
              <th className="text-right px-4 py-3 text-gray-600 font-medium w-28">Rate ($/hr)</th>
              <th className="text-right px-4 py-3 text-gray-600 font-medium w-32">Total Cost</th>
              <th className="w-24"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map(item => (
              <tr key={item.id} className="hover:bg-gray-50">
                {editingId === item.id ? (
                  <>
                    <td className="px-2 py-1"><input className="border rounded px-2 py-1 w-full text-sm font-mono" value={editValues.wbs_code || ""} onChange={e => setEditValues(v => ({...v, wbs_code: e.target.value}))} /></td>
                    <td className="px-2 py-1"><input className="border rounded px-2 py-1 w-full text-sm" value={editValues.description || ""} onChange={e => setEditValues(v => ({...v, description: e.target.value}))} /></td>
                    <td className="px-2 py-1"><input className="border rounded px-2 py-1 w-full text-sm" value={editValues.phase || ""} onChange={e => setEditValues(v => ({...v, phase: e.target.value}))} /></td>
                    <td className="px-2 py-1"><input className="border rounded px-2 py-1 w-full text-sm text-right" type="number" value={editValues.hours ?? 0} onChange={e => setEditValues(v => ({...v, hours: parseFloat(e.target.value) || 0}))} /></td>
                    <td className="px-2 py-1"><input className="border rounded px-2 py-1 w-full text-sm text-right" type="number" value={editValues.unit_rate ?? 0} onChange={e => setEditValues(v => ({...v, unit_rate: parseFloat(e.target.value) || 0}))} /></td>
                    <td className="px-4 py-2 text-right text-gray-400 text-sm">${((editValues.hours ?? 0) * (editValues.unit_rate ?? 0)).toLocaleString()}</td>
                    <td className="px-2 py-1 flex gap-1">
                      <button onClick={() => saveEdit(item.id)} className="text-green-600 hover:text-green-800 text-xs px-2 py-1 border border-green-300 rounded">Save</button>
                      <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600 text-xs px-2 py-1 border rounded">✕</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3 font-mono text-blue-700">{item.wbs_code}</td>
                    <td className="px-4 py-3">{item.description || "—"}</td>
                    <td className="px-4 py-3 text-gray-500">{item.phase || "—"}</td>
                    <td className="px-4 py-3 text-right">{item.hours}</td>
                    <td className="px-4 py-3 text-right">${item.unit_rate}</td>
                    <td className="px-4 py-3 text-right font-medium">${(item.total_cost || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 flex gap-2">
                      <button onClick={() => startEdit(item)} className="text-gray-400 hover:text-gray-700 text-xs">Edit</button>
                      <button onClick={() => handleDelete(item.id)} className="text-red-400 hover:text-red-600 text-xs">Del</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t bg-gray-50">
            <tr>
              <td colSpan={5} className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Total</td>
              <td className="px-4 py-3 text-right font-bold text-gray-900">${totalCost.toLocaleString()}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
        {items.length === 0 && !isLoading && (
          <p className="text-center py-10 text-gray-400 text-sm">No WBS items yet. Add one.</p>
        )}
      </div>
    </div>
  );
}
