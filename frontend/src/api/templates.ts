import api from "./client";

export interface TemplateWBSItem {
  wbs_code: string;
  description: string;
  phase: string;
}

export interface TemplateData {
  phases: string[];
  target_dlm: number;
  wbs_items: TemplateWBSItem[];
}

export interface ProposalTemplate {
  id: string;
  name: string;
  description: string | null;
  template_data: TemplateData;
  created_at: string;
}

export const templatesApi = {
  list: () => api.get<ProposalTemplate[]>("/api/templates/").then(r => r.data),
  createProposal: (data: {
    template_id: string;
    proposal_number: string;
    title: string;
    client_name?: string;
  }) => api.post("/api/templates/create-proposal", data).then(r => r.data),
};
