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

export const agentsApi = {
  startCVFetch: (proposalId: string, names: string[]) =>
    api.post<{ job_id: string; status: string }>("/api/agents/cv-fetch", {
      proposal_id: proposalId,
      names,
    }).then(r => r.data),

  pollJob: (jobId: string) =>
    api.get<JobStatus>(`/api/agents/jobs/${jobId}`).then(r => r.data),
};
