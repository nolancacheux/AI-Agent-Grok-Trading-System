'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAgentState, getTrades, triggerAnalysis, getHealth } from '@/lib/api';

export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: getHealth,
    refetchInterval: 10000, // Check every 10 seconds
    retry: false,
  });
}

export function useAgentState() {
  return useQuery({
    queryKey: ['agentState'],
    queryFn: getAgentState,
    refetchInterval: 5000, // Refresh every 5 seconds
    retry: 2,
  });
}

export function useTrades() {
  return useQuery({
    queryKey: ['trades'],
    queryFn: getTrades,
    refetchInterval: 10000, // Refresh every 10 seconds
  });
}

export function useTriggerAnalysis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: triggerAnalysis,
    onSuccess: () => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['agentState'] });
      queryClient.invalidateQueries({ queryKey: ['trades'] });
    },
  });
}
