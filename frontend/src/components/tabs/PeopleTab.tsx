import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { peopleApi, Person } from "../../api/people";

interface Props { proposalId: string; }

export default function PeopleTab({ proposalId }: Props) {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<Person>>({});

  const { data: people = [], isLoading } = useQuery({
    queryKey: ["people", proposalId],
    queryFn: () => peopleApi.list(proposalId),
  });

  const createMutation = useMutation({
    mutationFn: () => peopleApi.create(proposalId, { employee_name: "New Person" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["people", proposalId] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Person> }) =>
      peopleApi.update(proposalId, id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["people", proposalId] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => peopleApi.delete(proposalId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["people", proposalId] }),
  });

  const startEdit = (p: Person) => {
    setEditingId(p.id);
    setEditValues({
      employee_name: p.employee_name,
      employee_id: p.employee_id || "",
      role_on_project: p.role_on_project || "",
      years_experience: p.years_experience ?? undefined,
    });
  };

  const saveEdit = (id: string) => updateMutation.mutate({ id, data: editValues });

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-gray-800">Proposed Team</h3>
        <div className="flex gap-2">
          <button
            disabled
            title="CV-fetcher agent coming in Sprint 7"
            className="bg-gray-100 text-gray-400 px-3 py-1.5 rounded text-sm cursor-not-allowed border border-gray-200"
          >Fetch CVs (coming soon)</button>
          <button
            onClick={() => createMutation.mutate()}
            className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700"
          >+ Add Person</button>
        </div>
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Name</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium w-32">Employee ID</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">Role on Project</th>
              <th className="text-right px-4 py-3 text-gray-600 font-medium w-28">Exp (yrs)</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium w-28">CV</th>
              <th className="w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {people.map(person => (
              <tr key={person.id} className="hover:bg-gray-50">
                {editingId === person.id ? (
                  <>
                    <td className="px-2 py-1"><input className="border rounded px-2 py-1 w-full text-sm" value={editValues.employee_name || ""} onChange={e => setEditValues(v => ({ ...v, employee_name: e.target.value }))} /></td>
                    <td className="px-2 py-1"><input className="border rounded px-2 py-1 w-full text-sm" value={editValues.employee_id || ""} onChange={e => setEditValues(v => ({ ...v, employee_id: e.target.value }))} /></td>
                    <td className="px-2 py-1"><input className="border rounded px-2 py-1 w-full text-sm" value={editValues.role_on_project || ""} onChange={e => setEditValues(v => ({ ...v, role_on_project: e.target.value }))} /></td>
                    <td className="px-2 py-1"><input type="number" className="border rounded px-2 py-1 w-full text-sm text-right" value={editValues.years_experience ?? ""} onChange={e => setEditValues(v => ({ ...v, years_experience: parseInt(e.target.value) || undefined }))} /></td>
                    <td className="px-2 py-1 text-xs text-gray-400">{person.cv_path ? "✓ on file" : "—"}</td>
                    <td className="px-2 py-1 flex gap-1">
                      <button onClick={() => saveEdit(person.id)} className="text-green-600 hover:text-green-800 text-xs px-2 py-1 border border-green-300 rounded">Save</button>
                      <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600 text-xs px-2 py-1 border rounded">✕</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3 font-medium">{person.employee_name}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{person.employee_id || "—"}</td>
                    <td className="px-4 py-3">{person.role_on_project || "—"}</td>
                    <td className="px-4 py-3 text-right">{person.years_experience ?? "—"}</td>
                    <td className="px-4 py-3 text-xs">
                      {person.cv_path
                        ? <span className="text-green-600">✓ on file</span>
                        : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 flex gap-2">
                      <button onClick={() => startEdit(person)} className="text-gray-400 hover:text-gray-700 text-xs">Edit</button>
                      <button onClick={() => deleteMutation.mutate(person.id)} className="text-red-400 hover:text-red-600 text-xs">Del</button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {people.length === 0 && !isLoading && (
          <p className="text-center py-10 text-gray-400 text-sm">No team members yet. Add one.</p>
        )}
      </div>
    </div>
  );
}
