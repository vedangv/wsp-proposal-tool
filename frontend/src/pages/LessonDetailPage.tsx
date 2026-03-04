import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { lessonsApi, type Lesson } from "../api/lessons";
import { projectsApi, type Project } from "../api/projects";
import { proposalsApi, type Proposal } from "../api/proposals";
import AppNav from "../components/AppNav";

const SOURCE_OPTIONS = [
  { value: "proposal_debrief", label: "Proposal Debrief" },
  { value: "project_delivery", label: "Project Delivery" },
  { value: "technical", label: "Technical" },
  { value: "general", label: "General" },
];

const CATEGORY_OPTIONS = [
  { value: "win_strategy", label: "Win Strategy" },
  { value: "loss_reason", label: "Loss Reason" },
  { value: "technical", label: "Technical" },
  { value: "client_management", label: "Client Management" },
  { value: "pricing", label: "Pricing" },
  { value: "team", label: "Team" },
  { value: "schedule", label: "Schedule" },
  { value: "scope", label: "Scope" },
  { value: "process", label: "Process" },
];

const IMPACT_OPTIONS = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const SECTOR_OPTIONS = [
  "Transportation",
  "Transit",
  "Structures",
  "Environment",
  "Water",
  "Buildings",
];

type LessonFormData = Omit<Lesson, "id" | "updated_at">;

function getInitialFormData(searchParams: URLSearchParams): Partial<LessonFormData> {
  return {
    title: "",
    description: searchParams.get("description") || "",
    source: searchParams.get("source") || "general",
    category: searchParams.get("category") || "technical",
    impact: "medium",
    recommendation: searchParams.get("recommendation") || "",
    sector: null,
    disciplines: [],
    client: searchParams.get("client") || "",
    region: "",
    project_id: searchParams.get("project_id") || null,
    proposal_id: searchParams.get("proposal_id") || null,
    reported_by: "",
    date_reported: new Date().toISOString().slice(0, 10),
  };
}

export default function LessonDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const isCreateMode = !id || id === "new";

  // ---------- Edit mode: fetch lesson ----------
  const { data: lesson, isLoading } = useQuery({
    queryKey: ["lesson", id],
    queryFn: () => lessonsApi.get(id!),
    enabled: !isCreateMode,
  });

  // ---------- Dropdown data ----------
  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: () => projectsApi.list(),
  });
  const { data: proposals } = useQuery({
    queryKey: ["proposals"],
    queryFn: () => proposalsApi.list(),
  });

  // ---------- Create mode: local state ----------
  const [formData, setFormData] = useState<Partial<LessonFormData>>(() =>
    getInitialFormData(searchParams)
  );

  // Sync form data when lesson loads in edit mode
  useEffect(() => {
    if (lesson && !isCreateMode) {
      setFormData({
        title: lesson.title,
        description: lesson.description || "",
        source: lesson.source,
        category: lesson.category,
        impact: lesson.impact,
        recommendation: lesson.recommendation || "",
        sector: lesson.sector,
        disciplines: lesson.disciplines || [],
        client: lesson.client || "",
        region: lesson.region || "",
        project_id: lesson.project_id,
        proposal_id: lesson.proposal_id,
        reported_by: lesson.reported_by || "",
        date_reported: lesson.date_reported || "",
      });
    }
  }, [lesson, isCreateMode]);

  // ---------- Edit mode: blur-to-save ----------
  const updateMutation = useMutation({
    mutationFn: (data: Partial<Lesson>) => lessonsApi.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lesson", id] });
    },
  });

  const saveField = (field: string, value: any) => {
    if (isCreateMode) return;
    updateMutation.mutate({ [field]: value });
  };

  // ---------- Create mode: save ----------
  const createMutation = useMutation({
    mutationFn: (data: Partial<Lesson>) => lessonsApi.create(data),
    onSuccess: (newLesson) => {
      queryClient.invalidateQueries({ queryKey: ["lessons"] });
      navigate(`/lessons/${newLesson.id}`);
    },
  });

  const handleCreate = () => {
    createMutation.mutate(formData as Partial<Lesson>);
  };

  // ---------- Field change helpers ----------
  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleBlur = (field: string) => {
    if (!isCreateMode) {
      saveField(field, (formData as any)[field]);
    }
  };

  const handleSelectChange = (field: string, value: string) => {
    const val = value === "" ? null : value;
    setFormData((prev) => ({ ...prev, [field]: val }));
    if (!isCreateMode) {
      saveField(field, val);
    }
  };

  // ---------- Disciplines ----------
  const disciplinesStr = (formData.disciplines || []).join(", ");
  const [disciplinesInput, setDisciplinesInput] = useState(disciplinesStr);
  useEffect(() => {
    setDisciplinesInput((formData.disciplines || []).join(", "));
  }, [formData.disciplines]);

  const handleDisciplinesBlur = () => {
    const arr = disciplinesInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    updateField("disciplines", arr);
    if (!isCreateMode) {
      saveField("disciplines", arr);
    }
  };

  // ---------- Loading / Not found ----------
  if (!isCreateMode && isLoading) {
    return (
      <div className="min-h-screen bg-wsp-bg-soft">
        <AppNav />
        <div className="flex items-center justify-center py-32">
          <span className="text-wsp-muted font-body text-sm tracking-wide">Loading lesson...</span>
        </div>
      </div>
    );
  }

  if (!isCreateMode && !lesson) {
    return (
      <div className="min-h-screen bg-wsp-bg-soft">
        <AppNav />
        <div className="flex items-center justify-center py-32">
          <span className="text-wsp-red font-body text-sm">Lesson not found.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-wsp-bg-soft">
      <AppNav />

      <div className="max-w-4xl mx-auto px-6 py-6">
        {/* Back button */}
        <button
          onClick={() => navigate("/lessons")}
          className="text-wsp-muted hover:text-wsp-dark text-sm font-display tracking-wide uppercase
                     transition-colors flex items-center gap-1.5 mb-6"
        >
          &larr; Back to Lessons
        </button>

        {/* Title */}
        <input
          type="text"
          value={formData.title || ""}
          onChange={(e) => updateField("title", e.target.value)}
          onBlur={() => handleBlur("title")}
          placeholder="Lesson title..."
          className="w-full text-2xl font-display font-semibold text-wsp-dark bg-transparent
                     border-0 border-b-2 border-transparent focus:border-wsp-red
                     focus:outline-none pb-2 mb-8 placeholder:text-wsp-muted/40"
        />

        {/* Field grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mb-8">
          {/* Source */}
          <div>
            <label className="block text-xs font-display tracking-widest uppercase text-wsp-muted mb-1">
              Source
            </label>
            <select
              value={formData.source || ""}
              onChange={(e) => handleSelectChange("source", e.target.value)}
              className="wsp-input w-full"
            >
              {SOURCE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-display tracking-widest uppercase text-wsp-muted mb-1">
              Category
            </label>
            <select
              value={formData.category || ""}
              onChange={(e) => handleSelectChange("category", e.target.value)}
              className="wsp-input w-full"
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Impact */}
          <div>
            <label className="block text-xs font-display tracking-widest uppercase text-wsp-muted mb-1">
              Impact
            </label>
            <select
              value={formData.impact || ""}
              onChange={(e) => handleSelectChange("impact", e.target.value)}
              className="wsp-input w-full"
            >
              {IMPACT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sector */}
          <div>
            <label className="block text-xs font-display tracking-widest uppercase text-wsp-muted mb-1">
              Sector
            </label>
            <select
              value={formData.sector || ""}
              onChange={(e) => handleSelectChange("sector", e.target.value)}
              className="wsp-input w-full"
            >
              <option value="">-- Select --</option>
              {SECTOR_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Region */}
          <div>
            <label className="block text-xs font-display tracking-widest uppercase text-wsp-muted mb-1">
              Region
            </label>
            <input
              type="text"
              value={formData.region || ""}
              onChange={(e) => updateField("region", e.target.value)}
              onBlur={() => handleBlur("region")}
              placeholder="e.g. Ontario"
              className="wsp-input w-full"
            />
          </div>

          {/* Client */}
          <div>
            <label className="block text-xs font-display tracking-widest uppercase text-wsp-muted mb-1">
              Client
            </label>
            <input
              type="text"
              value={formData.client || ""}
              onChange={(e) => updateField("client", e.target.value)}
              onBlur={() => handleBlur("client")}
              placeholder="e.g. Ministry of Transportation"
              className="wsp-input w-full"
            />
          </div>

          {/* Reported by */}
          <div>
            <label className="block text-xs font-display tracking-widest uppercase text-wsp-muted mb-1">
              Reported by
            </label>
            <input
              type="text"
              value={formData.reported_by || ""}
              onChange={(e) => updateField("reported_by", e.target.value)}
              onBlur={() => handleBlur("reported_by")}
              placeholder="Name"
              className="wsp-input w-full"
            />
          </div>

          {/* Date reported */}
          <div>
            <label className="block text-xs font-display tracking-widest uppercase text-wsp-muted mb-1">
              Date reported
            </label>
            <input
              type="date"
              value={formData.date_reported || ""}
              onChange={(e) => {
                updateField("date_reported", e.target.value);
                if (!isCreateMode) saveField("date_reported", e.target.value);
              }}
              className="wsp-input w-full"
            />
          </div>
        </div>

        {/* Full-width textareas */}
        <div className="space-y-4 mb-8">
          <div>
            <label className="block text-xs font-display tracking-widest uppercase text-wsp-muted mb-1">
              Description
            </label>
            <textarea
              value={formData.description || ""}
              onChange={(e) => updateField("description", e.target.value)}
              onBlur={() => handleBlur("description")}
              rows={4}
              placeholder="Describe the lesson learnt..."
              className="wsp-input w-full resize-y"
            />
          </div>

          <div>
            <label className="block text-xs font-display tracking-widest uppercase text-wsp-muted mb-1">
              Recommendation
            </label>
            <textarea
              value={formData.recommendation || ""}
              onChange={(e) => updateField("recommendation", e.target.value)}
              onBlur={() => handleBlur("recommendation")}
              rows={3}
              placeholder="What should be done differently next time?"
              className="wsp-input w-full resize-y"
            />
          </div>
        </div>

        {/* Disciplines */}
        <div className="mb-6">
          <label className="block text-xs font-display tracking-widest uppercase text-wsp-muted mb-1">
            Disciplines
          </label>
          <input
            type="text"
            value={disciplinesInput}
            onChange={(e) => setDisciplinesInput(e.target.value)}
            onBlur={handleDisciplinesBlur}
            placeholder="e.g. Structural, Geotechnical, Environmental"
            className="wsp-input w-full"
          />
          <p className="text-xs text-wsp-muted mt-1">Comma-separated list</p>
        </div>

        {/* Linked Project */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mb-8">
          <div>
            <label className="block text-xs font-display tracking-widest uppercase text-wsp-muted mb-1">
              Linked Project
            </label>
            <div className="flex items-center gap-2">
              <select
                value={formData.project_id || ""}
                onChange={(e) => handleSelectChange("project_id", e.target.value)}
                className="wsp-input w-full"
              >
                <option value="">-- None --</option>
                {(projects || []).map((p: Project) => (
                  <option key={p.id} value={p.id}>
                    {p.project_number ? `${p.project_number} - ` : ""}{p.project_name}
                  </option>
                ))}
              </select>
              {formData.project_id && (
                <button
                  onClick={() => navigate(`/projects/${formData.project_id}`)}
                  className="text-wsp-red hover:text-wsp-dark transition-colors shrink-0"
                  title="Go to project"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Linked Proposal */}
          <div>
            <label className="block text-xs font-display tracking-widest uppercase text-wsp-muted mb-1">
              Linked Proposal
            </label>
            <div className="flex items-center gap-2">
              <select
                value={formData.proposal_id || ""}
                onChange={(e) => handleSelectChange("proposal_id", e.target.value)}
                className="wsp-input w-full"
              >
                <option value="">-- None --</option>
                {(proposals || []).map((p: Proposal) => (
                  <option key={p.id} value={p.id}>
                    {p.proposal_number} - {p.title}
                  </option>
                ))}
              </select>
              {formData.proposal_id && (
                <button
                  onClick={() => navigate(`/proposals/${formData.proposal_id}`)}
                  className="text-wsp-red hover:text-wsp-dark transition-colors shrink-0"
                  title="Go to proposal"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Create mode: Save button */}
        {isCreateMode && (
          <div className="flex justify-end pt-4 border-t border-wsp-border">
            <button
              onClick={handleCreate}
              disabled={createMutation.isPending || !formData.title}
              className="bg-wsp-red text-white px-6 py-2 text-sm font-display tracking-widest uppercase
                         hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createMutation.isPending ? "Saving..." : "Save Lesson"}
            </button>
          </div>
        )}

        {/* Edit mode: auto-save indicator */}
        {!isCreateMode && updateMutation.isPending && (
          <div className="fixed bottom-6 right-6 bg-wsp-dark text-white text-xs font-body px-3 py-1.5 rounded shadow-lg">
            Saving...
          </div>
        )}
      </div>
    </div>
  );
}
