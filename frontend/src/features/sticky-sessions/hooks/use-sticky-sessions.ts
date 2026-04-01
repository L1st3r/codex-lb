import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import {
  deleteStickySessions,
  listStickySessions,
  purgeStickySessions,
} from "@/features/sticky-sessions/api";
import type {
  StickySessionIdentifier,
  StickySessionsDeleteResponse,
  StickySessionsListParams,
} from "@/features/sticky-sessions/schemas";

const DEFAULT_STICKY_SESSIONS_LIMIT = 10;

export function useStickySessions() {
  const queryClient = useQueryClient();
  const [params, setParams] = useState<StickySessionsListParams>({
    staleOnly: false,
    offset: 0,
    limit: DEFAULT_STICKY_SESSIONS_LIMIT,
  });

  const stickySessionsQuery = useQuery({
    queryKey: ["sticky-sessions", "list", params],
    queryFn: () => listStickySessions(params),
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["sticky-sessions", "list"] });
  };

  const setOffset = (offset: number) => {
    setParams((current) => ({ ...current, offset }));
  };

  const setLimit = (limit: number) => {
    setParams((current) => ({ ...current, limit, offset: 0 }));
  };

  const deleteMutation = useMutation({
    mutationFn: (targets: StickySessionIdentifier[]) => deleteStickySessions({ sessions: targets }),
    onSuccess: async (response: StickySessionsDeleteResponse) => {
      if (response.deletedCount > 0 && response.failed.length === 0) {
        toast.success(response.deletedCount === 1 ? "Sticky session deleted" : `Deleted ${response.deletedCount} sessions`);
      } else if (response.deletedCount > 0) {
        toast.warning(
          `Deleted ${response.deletedCount} sessions. ${response.failed.length} could not be deleted.`,
        );
      } else {
        toast.error("No selected sessions could be deleted");
      }
      await invalidate();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete sticky sessions");
    },
  });

  const purgeMutation = useMutation({
    mutationFn: (staleOnly: boolean) => purgeStickySessions({ staleOnly }),
    onSuccess: (response) => {
      toast.success(`Purged ${response.deletedCount} sticky sessions`);
      invalidate();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to purge sticky sessions");
    },
  });

  return {
    params,
    setOffset,
    setLimit,
    stickySessionsQuery,
    deleteMutation,
    purgeMutation,
  };
}
