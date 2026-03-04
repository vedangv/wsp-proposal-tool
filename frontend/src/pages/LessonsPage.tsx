import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import AppNav from "../components/AppNav";
import { lessonsApi, type Lesson } from "../api/lessons";

const SOURCE_LABELS: Record<string, string> = {
  proposal_debrief: "Proposal Debrief",
  project_delivery: "Project Delivery",
  technical: "Technical",
  general: "General",
};

const SOURCE_STYLES: Record<string, string> = {
  proposal_debrief: "bg-purple-100 text-purple-800",
  project_delivery: "bg-blue-100 text-blue-800",
  technical: "bg-teal-100 text-teal-800",
  general: "bg-gray-100 text-gray-800",
};

const CATEGORY_LABELS: Record<string, string> = {
  win_strategy: "Win Strategy",
  loss_reason: "Loss Reason",
  technical: "Technical",
  client_management: "Client Management",
  pricing: "Pricing",
  team: "Team",
  schedule: "Schedule",
  scope: "Scope",
  process: "Process",
};

const IMPACT_STYLES: Record<string, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-green-100 text-green-700",
};

const ALL_SOURCES = ["proposal_debrief", "project_delivery", "technical", "general"];
const ALL_CATEGORIES = ["win_strategy", "loss_reason", "technical", "client_management", "pricing", "team", "schedule", "scope", "process"];
const ALL_IMPACTS = ["high", "medium", "low"];
const ALL_SECTORS = ["Transportation", "Transit", "Structures", "Environment", "Water", "Buildings"];

export default function LessonsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const clientFromUrl = searchParams.get("client") || "";

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [impactFilter, setImpactFilter] = useState("");
  const [sectorFilter, setSectorFilter] = useState("");

  // Debounce search
  const debounceTimer = useMemo(() => {
    let timer: ReturnType<typeof setTimeout>;
    return (value: string) => {
      clearTimeout(timer);
      timer = setTimeout(() => setDebouncedSearch(value), 300);
    };
  }, []);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    debounceTimer(value);
  };

  const queryParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (debouncedSearch) params.search = debouncedSearch;
    if (sourceFilter) params.source = sourceFilter;
    if (categoryFilter) params.category = categoryFilter;
    if (impactFilter) params.impact = impactFilter;
    if (sectorFilter) params.sector = sectorFilter;
    if (clientFromUrl) params.client = clientFromUrl;
    return params;
  }, [debouncedSearch, sourceFilter, categoryFilter, impactFilter, sectorFilter, clientFromUrl]);

  const { data: lessons = [], isLoading } = useQuery({
    queryKey: ["lessons", queryParams],
    queryFn: () => lessonsApi.list(queryParams),
  });

  const truncate = (text: string | null, max: number) => {
    if (!text) return "";
    return text.length > max ? text.slice(0, max) + "..." : text;
  };

  return (
    <div className="min-h-screen bg-wsp-bg-soft">
      <AppNav />

      <main className="max-w-6xl mx-auto py-8 px-6">
        {/* Page title row */}
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="font-display text-2xl font-semibold text-wsp-dark tracking-tight">
              Lessons Learnt
            </h2>
            <p className="text-wsp-muted text-sm font-body mt-0.5">
              Knowledge base from proposals and projects
            </p>
          </div>
          <button
            onClick={() => navigate("/lessons/new")}
            className="wsp-btn-primary"
          >
            + Add Lesson
          </button>
        </div>

        {/* Search bar */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search lessons..."
            value={search}
            onChange={e => handleSearchChange(e.target.value)}
            className="wsp-input w-full"
          />
        </div>

        {/* Filter row */}
        <div className="flex gap-3 mb-6 flex-wrap">
          <select
            value={sourceFilter}
            onChange={e => setSourceFilter(e.target.value)}
            className="wsp-input text-sm"
          >
            <option value="">All Sources</option>
            {ALL_SOURCES.map(s => (
              <option key={s} value={s}>{SOURCE_LABELS[s]}</option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="wsp-input text-sm"
          >
            <option value="">All Categories</option>
            {ALL_CATEGORIES.map(c => (
              <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
            ))}
          </select>

          <select
            value={impactFilter}
            onChange={e => setImpactFilter(e.target.value)}
            className="wsp-input text-sm"
          >
            <option value="">All Impact</option>
            {ALL_IMPACTS.map(i => (
              <option key={i} value={i}>{i.charAt(0).toUpperCase() + i.slice(1)}</option>
            ))}
          </select>

          <select
            value={sectorFilter}
            onChange={e => setSectorFilter(e.target.value)}
            className="wsp-input text-sm"
          >
            <option value="">All Sectors</option>
            {ALL_SECTORS.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Client filter indicator */}
        {clientFromUrl && (
          <div className="mb-4 flex items-center gap-2">
            <span className="text-sm text-wsp-muted font-body">
              Filtered by client: <span className="font-semibold text-wsp-dark">{clientFromUrl}</span>
            </span>
            <button
              onClick={() => navigate("/lessons")}
              className="text-xs text-wsp-red hover:underline font-body"
            >
              Clear
            </button>
          </div>
        )}

        {/* Lessons list */}
        {isLoading ? (
          <p className="text-wsp-muted text-sm font-body py-8">Loading...</p>
        ) : lessons.length === 0 ? (
          <div className="wsp-card py-16 text-center">
            <p className="text-wsp-muted text-sm font-body">No lessons found.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {lessons.map((lesson: Lesson) => (
              <div
                key={lesson.id}
                onClick={() => navigate(`/lessons/${lesson.id}`)}
                className="wsp-card p-5 cursor-pointer hover:border-wsp-red transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-semibold text-wsp-dark text-sm mb-2">
                      {lesson.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`wsp-badge ${SOURCE_STYLES[lesson.source] || SOURCE_STYLES.general}`}>
                        {SOURCE_LABELS[lesson.source] || lesson.source}
                      </span>
                      <span className="wsp-badge bg-gray-100 text-gray-700">
                        {CATEGORY_LABELS[lesson.category] || lesson.category}
                      </span>
                      <span className={`wsp-badge ${IMPACT_STYLES[lesson.impact] || IMPACT_STYLES.low}`}>
                        {lesson.impact.charAt(0).toUpperCase() + lesson.impact.slice(1)}
                      </span>
                      {lesson.sector && (
                        <span className="text-xs text-wsp-muted font-body">
                          {lesson.sector}
                        </span>
                      )}
                    </div>
                    {lesson.recommendation && (
                      <p className="text-sm text-wsp-muted font-body">
                        {truncate(lesson.recommendation, 100)}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {lesson.region && (
                      <span className="text-xs text-wsp-muted font-body">{lesson.region}</span>
                    )}
                    {lesson.date_reported && (
                      <span className="text-xs text-wsp-muted font-mono">
                        {new Date(lesson.date_reported).toLocaleDateString("en-AU", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
