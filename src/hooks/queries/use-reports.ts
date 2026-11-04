import { useQuery } from "@tanstack/react-query";
import { getReportsData } from "@/services/reports";
import type { ReportsData } from "@/services/reports";

export function useReports() {
  return useQuery<ReportsData>({
    queryKey: ["reports"],
    queryFn: getReportsData,
  });
}
