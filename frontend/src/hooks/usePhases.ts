import { useQuery } from "@tanstack/react-query";
import { proposalsApi } from "../api/proposals";

const DEFAULT_PHASES = ["Study", "Preliminary", "Detailed", "Tender", "Construction"];

export function usePhases(proposalId: string): string[] {
  const { data: proposal } = useQuery({
    queryKey: ["proposal", proposalId],
    queryFn: () => proposalsApi.get(proposalId),
    enabled: !!proposalId,
  });

  return proposal?.phases ?? DEFAULT_PHASES;
}
