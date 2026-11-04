import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getLinkedDevices, revokeDevice } from "@/services/linked-devices";
import type { LinkedDevice } from "@/lib/types/linked-devices";

export function useLinkedDevices() {
  return useQuery<LinkedDevice[]>({
    queryKey: ["linked-devices"],
    queryFn: getLinkedDevices,
  });
}

export function useRevokeDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: revokeDevice,
    onSuccess: (_data, deviceId) => {
      queryClient.setQueryData<LinkedDevice[]>(["linked-devices"], (old) =>
        old ? old.filter((d) => d.id !== deviceId) : old,
      );
    },
  });
}