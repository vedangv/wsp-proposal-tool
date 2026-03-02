import api from "./client";

export interface CVResult {
  requested_name: string;
  employee_id: string;
  employee_name: string;
  role_on_project: string;
  years_experience: number;
  disciplines: string[];
  education: string;
  summary: string;
  key_projects: { name: string; value: string; role: string }[];
}

export interface JobStatus {
  job_id: string;
  status: "pending" | "running" | "complete" | "error";
  result: CVResult[] | null;
  created_at: string;
  completed_at: string | null;
}

export interface RFPScopeResult {
  section_name: string;
  content: string;
}

export interface DeliverableResult {
  deliverable_ref: string;
  title: string;
  type: string;
  description: string;
  responsible_party: string;
}

export interface RelevantProjectResult {
  project_name: string;
  client: string;
  contract_value: number;
  year_completed: string;
  location: string;
  wsp_role: string;
  project_manager: string;
  services_performed: string;
  relevance_notes: string;
}

export const agentsApi = {
  startCVFetch: (proposalId: string, names: string[]) =>
    api.post<{ job_id: string; status: string }>("/api/agents/cv-fetch", {
      proposal_id: proposalId,
      names,
    }).then(r => r.data),

  startRFPExtract: (proposalId: string) =>
    api.post<{ job_id: string; status: string }>("/api/agents/rfp-extract", {
      proposal_id: proposalId,
    }).then(r => r.data),

  startRelevantProjectsFetch: (proposalId: string) =>
    api.post<{ job_id: string; status: string }>("/api/agents/relevant-projects-fetch", {
      proposal_id: proposalId,
    }).then(r => r.data),

  startDeliverablesFetch: (proposalId: string) =>
    api.post<{ job_id: string; status: string }>("/api/agents/deliverables-fetch", {
      proposal_id: proposalId,
    }).then(r => r.data),

  pollJob: (jobId: string) =>
    api.get<JobStatus>(`/api/agents/jobs/${jobId}`).then(r => r.data),
};
