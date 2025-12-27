'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAgentState,
  getTrades,
  triggerAnalysis,
  getHealth,
  getPortfolioHistory,
  getChatHistory,
  getReflections,
  getSchedulerStatus,
  setSchedulerMode,
  getDecisions,
  getLastDecision,
} from '@/lib/api';

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

export function usePortfolioHistory(hours: number = 24) {
  return useQuery({
    queryKey: ['portfolioHistory', hours],
    queryFn: () => getPortfolioHistory(hours),
    refetchInterval: 60000, // Refresh every minute
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

export function useChatHistory(limit: number = 50) {
  return useQuery({
    queryKey: ['chatHistory', limit],
    queryFn: () => getChatHistory(limit),
    refetchInterval: 10000, // Refresh every 10 seconds
  });
}

export function useReflections(limit: number = 10) {
  return useQuery({
    queryKey: ['reflections', limit],
    queryFn: () => getReflections(limit),
    refetchInterval: 60000, // Refresh every minute
  });
}

export function useSchedulerStatus() {
  return useQuery({
    queryKey: ['schedulerStatus'],
    queryFn: getSchedulerStatus,
    refetchInterval: 5000, // Refresh every 5 seconds
    retry: 2,
  });
}

export function useSetSchedulerMode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: setSchedulerMode,
    onSuccess: () => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['schedulerStatus'] });
      queryClient.invalidateQueries({ queryKey: ['health'] });
    },
  });
}

export function useDecisions(options: { limit?: number; action?: string; symbol?: string } = {}) {
  return useQuery({
    queryKey: ['decisions', options],
    queryFn: () => getDecisions(options),
    refetchInterval: 10000, // Refresh every 10 seconds
  });
}

export function useLastDecision() {
  return useQuery({
    queryKey: ['lastDecision'],
    queryFn: getLastDecision,
    refetchInterval: 5000, // Refresh every 5 seconds
  });
}
