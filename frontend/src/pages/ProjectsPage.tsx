import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import AppNav from "../components/AppNav";
import { projectsApi, type Project } from "../api/projects";

const SECTORS = ["All", "Transportation", "Transit", "Structures", "Environment", "Water", "Buildings"];
const STATUSES = ["All", "active", "completed", "cancelled"];

const STATUS_STYLES: Record<string, string> = {
  completed: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  active:    "bg-blue-50 text-blue-700 border border-blue-200",
  cancelled: "bg-gray-100 text-gray-500 border border-gray-200",
};

function formatCurrency(value: number | null): string {
  if (value == null) return "—";
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toLocaleString()}`;
}

function useDebounce(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value);
  useMemo(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function ProjectsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [sectorFilter, setSectorFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const debouncedSearch = useDebounce(search, 300);

  const queryParams = useMemo(() => {
    const p: Record<string, string> = {};
    if (debouncedSearch) p.search = debouncedSearch;
    if (sectorFilter !== "All") p.sector = sectorFilter;
    if (statusFilter !== "All") p.status = statusFilter;
    return p;
  }, [debouncedSearch, sectorFilter, statusFilter]);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects", queryParams],
    queryFn: () => projectsApi.list(queryParams),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Project>) => projectsApi.create(data),
    onSuccess: (project) => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      navigate(`/projects/${project.id}`);
    },
  });

  return (
    <div className="min-h-screen bg-wsp-bg-soft">
      <AppNav />

      <main className="max-w-6xl mx-auto py-8 px-6">
        {/* Page title row */}
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="font-display text-2xl font-semibold text-wsp-dark tracking-tight">Projects</h2>
            <p className="text-wsp-muted text-sm font-body mt-0.5">Master project registry</p>
          </div>
          <button
            onClick={() => createMutation.mutate({ project_name: "New Project" })}
            disabled={createMutation.isPending}
            className="wsp-btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            + Add Project
          </button>
        </div>

        {/* Search + Filters */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-wsp-muted pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by name, client, or project number..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="wsp-input w-full pl-9"
            />
          </div>
          <select
            value={sectorFilter}
            onChange={e => setSectorFilter(e.target.value)}
            className="wsp-input"
          >
            {SECTORS.map(s => (
              <option key={s} value={s}>{s === "All" ? "All Sectors" : s}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="wsp-input"
          >
            {STATUSES.map(s => (
              <option key={s} value={s}>
                {s === "All" ? "All Statuses" : s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <svg className="animate-spin h-6 w-6 text-wsp-red" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : projects.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-wsp-muted text-sm font-body">No projects found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(project => (
              <div
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}`)}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md hover:border-wsp-red/30 transition-all group"
              >
                {/* Top row: project number + status badge */}
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs text-wsp-muted tracking-wider">
                    {project.project_number || "—"}
                  </span>
                  <span className={`wsp-badge text-[10px] ${STATUS_STYLES[project.status] || STATUS_STYLES.active}`}>
                    {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                  </span>
                </div>

                {/* Project name */}
                <h3 className="font-display font-semibold text-wsp-dark text-sm mb-2 group-hover:text-wsp-red transition-colors line-clamp-2">
                  {project.project_name}
                </h3>

                {/* Details */}
                <div className="space-y-1 text-xs font-body text-wsp-muted">
                  {project.client && (
                    <div className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <span className="truncate">{project.client}</span>
                    </div>
                  )}
                  {project.location && (
                    <div className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="truncate">{project.location}</span>
                    </div>
                  )}
                </div>

                {/* Bottom row: value + year */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <span className="font-mono text-sm font-semibold text-wsp-dark">
                    {formatCurrency(project.contract_value)}
                  </span>
                  {project.year_completed && (
                    <span className="text-xs text-wsp-muted font-mono">{project.year_completed}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
