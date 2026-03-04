import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AppNav from "../components/AppNav";
import { projectsApi, type Project } from "../api/projects";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "team", label: "Team" },
  { id: "lessons", label: "Lessons" },
  { id: "linked-proposals", label: "Linked Proposals" },
];

const STATUS_OPTIONS = ["active", "completed", "cancelled"];
const ROLE_OPTIONS = ["Prime Consultant", "Sub-Consultant", "JV Partner", "Other"];
const SECTOR_OPTIONS = ["Transportation", "Transit", "Structures", "Environment", "Water", "Buildings"];

const SOURCE_COLORS: Record<string, string> = {
  proposal_debrief: "bg-purple-100 text-purple-700",
  project_delivery: "bg-blue-100 text-blue-700",
  technical: "bg-teal-100 text-teal-700",
  general: "bg-gray-100 text-gray-600",
};

const IMPACT_COLORS: Record<string, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-green-100 text-green-700",
};

/* ------------------------------------------------------------------ */
/*  Overview Tab                                                       */
/* ------------------------------------------------------------------ */
function OverviewSection({ project }: { project: Project }) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ field, value }: { field: string; value: any }) =>
      projectsApi.update(project.id, { [field]: value }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["project", project.id] }),
  });

  const saveOnBlur = (field: string) => (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const raw = e.target.value;
    const value = field === "contract_value" ? (raw ? Number(raw) : null) : raw;
    if (value !== (project as any)[field]) {
      mutation.mutate({ field, value });
    }
  };

  return (
    <div className="space-y-6">
      {/* Grid fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* project_number */}
        <label className="block">
          <span className="text-xs font-display tracking-wider text-wsp-muted uppercase">Project Number</span>
          <input
            className="wsp-input w-full mt-1 font-mono"
            defaultValue={project.project_number ?? ""}
            onBlur={saveOnBlur("project_number")}
          />
        </label>

        {/* project_name */}
        <label className="block">
          <span className="text-xs font-display tracking-wider text-wsp-muted uppercase">Project Name</span>
          <input
            className="wsp-input w-full mt-1"
            defaultValue={project.project_name ?? ""}
            onBlur={saveOnBlur("project_name")}
          />
        </label>

        {/* client */}
        <label className="block">
          <span className="text-xs font-display tracking-wider text-wsp-muted uppercase">Client</span>
          <input
            className="wsp-input w-full mt-1"
            defaultValue={project.client ?? ""}
            onBlur={saveOnBlur("client")}
          />
        </label>

        {/* location */}
        <label className="block">
          <span className="text-xs font-display tracking-wider text-wsp-muted uppercase">Location</span>
          <input
            className="wsp-input w-full mt-1"
            defaultValue={project.location ?? ""}
            onBlur={saveOnBlur("location")}
          />
        </label>

        {/* contract_value */}
        <label className="block">
          <span className="text-xs font-display tracking-wider text-wsp-muted uppercase">Contract Value</span>
          <input
            type="number"
            className="wsp-input w-full mt-1 font-mono"
            defaultValue={project.contract_value ?? ""}
            onBlur={saveOnBlur("contract_value")}
          />
        </label>

        {/* year_completed */}
        <label className="block">
          <span className="text-xs font-display tracking-wider text-wsp-muted uppercase">Year Completed</span>
          <input
            className="wsp-input w-full mt-1 font-mono"
            defaultValue={project.year_completed ?? ""}
            onBlur={saveOnBlur("year_completed")}
          />
        </label>

        {/* status */}
        <label className="block">
          <span className="text-xs font-display tracking-wider text-wsp-muted uppercase">Status</span>
          <select
            className="wsp-input w-full mt-1"
            defaultValue={project.status ?? "active"}
            onBlur={saveOnBlur("status")}
          >
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </label>

        {/* wsp_role */}
        <label className="block">
          <span className="text-xs font-display tracking-wider text-wsp-muted uppercase">WSP Role</span>
          <select
            className="wsp-input w-full mt-1"
            defaultValue={project.wsp_role ?? ""}
            onBlur={saveOnBlur("wsp_role")}
          >
            <option value="">--</option>
            {ROLE_OPTIONS.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </label>

        {/* project_manager */}
        <label className="block">
          <span className="text-xs font-display tracking-wider text-wsp-muted uppercase">Project Manager</span>
          <input
            className="wsp-input w-full mt-1"
            defaultValue={project.project_manager ?? ""}
            onBlur={saveOnBlur("project_manager")}
          />
        </label>

        {/* sector */}
        <label className="block">
          <span className="text-xs font-display tracking-wider text-wsp-muted uppercase">Sector</span>
          <select
            className="wsp-input w-full mt-1"
            defaultValue={project.sector ?? ""}
            onBlur={saveOnBlur("sector")}
          >
            <option value="">--</option>
            {SECTOR_OPTIONS.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>

      {/* Full-width textareas */}
      <label className="block">
        <span className="text-xs font-display tracking-wider text-wsp-muted uppercase">Description</span>
        <textarea
          rows={4}
          className="wsp-input w-full mt-1"
          defaultValue={project.description ?? ""}
          onBlur={saveOnBlur("description")}
        />
      </label>

      <label className="block">
        <span className="text-xs font-display tracking-wider text-wsp-muted uppercase">Services Performed</span>
        <textarea
          rows={4}
          className="wsp-input w-full mt-1"
          defaultValue={project.services_performed ?? ""}
          onBlur={saveOnBlur("services_performed")}
        />
      </label>

      <label className="block">
        <span className="text-xs font-display tracking-wider text-wsp-muted uppercase">Outcomes</span>
        <textarea
          rows={4}
          className="wsp-input w-full mt-1"
          defaultValue={project.outcomes ?? ""}
          onBlur={saveOnBlur("outcomes")}
        />
      </label>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Team Tab                                                           */
/* ------------------------------------------------------------------ */
function TeamSection({ project }: { project: Project }) {
  const queryClient = useQueryClient();
  const [personnel, setPersonnel] = useState<{ name: string; role: string }[]>(
    project.key_personnel ?? []
  );

  const mutation = useMutation({
    mutationFn: (list: { name: string; role: string }[]) =>
      projectsApi.update(project.id, { key_personnel: list }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["project", project.id] }),
  });

  const save = (list: { name: string; role: string }[]) => {
    setPersonnel(list);
    mutation.mutate(list);
  };

  const updateField = (idx: number, field: "name" | "role", value: string) => {
    const next = [...personnel];
    next[idx] = { ...next[idx], [field]: value };
    setPersonnel(next);
  };

  const commitRow = () => {
    save(personnel);
  };

  const addMember = () => {
    const next = [...personnel, { name: "", role: "" }];
    setPersonnel(next);
  };

  const removeMember = (idx: number) => {
    const next = personnel.filter((_, i) => i !== idx);
    save(next);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-sm font-semibold text-wsp-dark tracking-wider uppercase">
          Key Personnel
        </h3>
        <button
          onClick={addMember}
          className="px-3 py-1.5 text-xs font-display tracking-wider uppercase bg-wsp-red text-white rounded hover:bg-red-700 transition-colors"
        >
          + Add Member
        </button>
      </div>

      {personnel.length === 0 ? (
        <p className="text-sm text-wsp-muted py-8 text-center">No team members added yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-wsp-border text-left">
              <th className="py-2 px-3 text-xs font-display tracking-wider text-wsp-muted uppercase font-medium">Name</th>
              <th className="py-2 px-3 text-xs font-display tracking-wider text-wsp-muted uppercase font-medium">Role</th>
              <th className="py-2 px-3 w-20" />
            </tr>
          </thead>
          <tbody>
            {personnel.map((p, idx) => (
              <tr key={idx} className="border-b border-wsp-border/50 hover:bg-wsp-bg-soft/50">
                <td className="py-1.5 px-3">
                  <input
                    className="wsp-input w-full"
                    value={p.name}
                    onChange={e => updateField(idx, "name", e.target.value)}
                    onBlur={commitRow}
                    placeholder="Name"
                  />
                </td>
                <td className="py-1.5 px-3">
                  <input
                    className="wsp-input w-full"
                    value={p.role}
                    onChange={e => updateField(idx, "role", e.target.value)}
                    onBlur={commitRow}
                    placeholder="Role"
                  />
                </td>
                <td className="py-1.5 px-3 text-center">
                  <button
                    onClick={() => removeMember(idx)}
                    className="text-wsp-muted hover:text-wsp-red transition-colors text-xs"
                    title="Remove member"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Lessons Tab                                                        */
/* ------------------------------------------------------------------ */
function LessonsSection({ projectId }: { projectId: string }) {
  const navigate = useNavigate();

  const { data: lessons, isLoading } = useQuery({
    queryKey: ["project-lessons", projectId],
    queryFn: () => projectsApi.lessons(projectId),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-sm font-semibold text-wsp-dark tracking-wider uppercase">
          Lessons Learnt
        </h3>
        <button
          onClick={() => navigate(`/lessons/new?project_id=${projectId}`)}
          className="px-3 py-1.5 text-xs font-display tracking-wider uppercase bg-wsp-red text-white rounded hover:bg-red-700 transition-colors"
        >
          + Add Lesson
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-wsp-muted py-8 text-center">Loading lessons...</p>
      ) : !lessons || lessons.length === 0 ? (
        <p className="text-sm text-wsp-muted py-8 text-center">No lessons linked to this project.</p>
      ) : (
        <div className="space-y-3">
          {lessons.map((lesson: any) => (
            <button
              key={lesson.id}
              onClick={() => navigate(`/lessons/${lesson.id}`)}
              className="w-full text-left bg-white border border-wsp-border rounded-lg p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <h4 className="font-display text-sm font-semibold text-wsp-dark">
                  {lesson.title}
                </h4>
                {lesson.impact && (
                  <span className={`inline-block px-2 py-0.5 text-[10px] font-display font-semibold uppercase tracking-wider rounded-full ${IMPACT_COLORS[lesson.impact] ?? "bg-gray-100 text-gray-600"}`}>
                    {lesson.impact}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-2">
                {lesson.source && (
                  <span className={`inline-block px-2 py-0.5 text-[10px] font-display font-medium uppercase tracking-wider rounded ${SOURCE_COLORS[lesson.source] ?? "bg-gray-100 text-gray-600"}`}>
                    {lesson.source.replace(/_/g, " ")}
                  </span>
                )}
                {lesson.category && (
                  <span className="inline-block px-2 py-0.5 text-[10px] font-display font-medium uppercase tracking-wider rounded bg-gray-100 text-gray-600">
                    {lesson.category}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Linked Proposals Tab                                               */
/* ------------------------------------------------------------------ */
function LinkedProposalsSection() {
  return (
    <div className="py-12 text-center">
      <p className="text-sm text-wsp-muted">
        Proposals referencing this project will appear here.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */
export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");

  const { data: project, isLoading } = useQuery({
    queryKey: ["project", id],
    queryFn: () => projectsApi.get(id!),
    enabled: !!id,
  });

  if (isLoading) return (
    <div className="min-h-screen bg-wsp-bg-soft">
      <AppNav />
      <div className="flex items-center justify-center py-24">
        <span className="text-wsp-muted font-body text-sm tracking-wide">Loading project...</span>
      </div>
    </div>
  );

  if (!project) return (
    <div className="min-h-screen bg-wsp-bg-soft">
      <AppNav />
      <div className="flex items-center justify-center py-24">
        <span className="text-wsp-red font-body text-sm">Project not found.</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-wsp-bg-soft">
      <AppNav />

      {/* Project header */}
      <div className="bg-white border-b border-wsp-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate("/projects")}
            className="text-wsp-muted hover:text-wsp-dark text-xs font-display tracking-widest uppercase transition-colors"
          >
            ← Projects
          </button>
          <span className="text-wsp-border">/</span>
          {project.project_number && (
            <span className="font-mono text-wsp-red text-sm tracking-wider">
              {project.project_number}
            </span>
          )}
          <h1 className="font-display font-semibold text-wsp-dark text-base tracking-wide">
            {project.project_name}
          </h1>
          {project.status && (
            <span className={`ml-auto wsp-badge ${
              project.status === "completed" ? "bg-green-50 text-green-700"
              : project.status === "cancelled" ? "bg-red-50 text-red-700"
              : "bg-blue-50 text-blue-700"
            }`}>
              {project.status}
            </span>
          )}
        </div>
      </div>

      {/* Tab navigation */}
      <div className="bg-white border-b border-wsp-border flex gap-0 px-6 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-3.5 text-sm font-display font-medium tracking-wide transition-colors whitespace-nowrap
              ${activeTab === tab.id ? "wsp-tab-active" : "wsp-tab-inactive"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="max-w-6xl mx-auto py-6 px-6">
        <div className="bg-white rounded-lg border border-wsp-border p-6">
          {activeTab === "overview" && <OverviewSection project={project} />}
          {activeTab === "team" && <TeamSection project={project} />}
          {activeTab === "lessons" && <LessonsSection projectId={id!} />}
          {activeTab === "linked-proposals" && <LinkedProposalsSection />}
        </div>
      </div>
    </div>
  );
}
