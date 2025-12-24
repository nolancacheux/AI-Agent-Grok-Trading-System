const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface ApiError {
  detail: string;
}

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail);
  }

  return response.json();
}

// Health check
export async function getHealth() {
  return fetchApi<{ status: string; ibkr_connected: boolean }>('/health');
}

// Portfolio
export async function getPortfolio() {
  return fetchApi<{
    cash: number;
    total_value: number;
    holdings_value: number;
    positions: Array<{
      symbol: string;
      quantity: number;
      avg_price: number;
      current_price: number;
      value: number;
      pnl: number;
    }>;
  }>('/api/portfolio');
}

export async function getPositions() {
  return fetchApi<{
    positions: Array<{
      symbol: string;
      quantity: number;
      avg_price: number;
      current_price: number;
    }>;
  }>('/api/portfolio/positions');
}

// Agent
export async function getAgentState() {
  return fetchApi<{
    name: string;
    status: 'IDLE' | 'ANALYZING' | 'TRADING' | 'ERROR';
    cash: number;
    initial_value: number;
    total_value: number;
    pnl: number;
    pnl_percent: number;
    positions: Array<{
      symbol: string;
      quantity: number;
      avg_price: number;
      current_price: number;
    }>;
    last_action: string | null;
    last_action_time: string | null;
    trades_today: number;
  }>('/api/agent/status');
}

export async function triggerAnalysis() {
  return fetchApi<{
    status: string;
    trade?: {
      id: string;
      action: string;
      symbol: string;
      quantity: number;
      price: number;
      reasoning: string;
    };
    message?: string;
  }>('/api/agent/analyze', { method: 'POST' });
}

export async function getTrades() {
  return fetchApi<{
    trades: Array<{
      id: string;
      timestamp: string;
      action: 'buy' | 'sell' | 'close';
      symbol: string;
      quantity: number;
      price: number;
      total_value: number;
      fee: number;
      reasoning: string;
      risk_score: number;
      status?: 'filled' | 'pending' | 'cancelled' | 'rejected';
    }>;
  }>('/api/agent/trades');
}

// Trading
export async function getStockPrice(symbol: string) {
  return fetchApi<{ symbol: string; price: number }>(`/api/price/${symbol}`);
}

export async function executeTrade(order: {
  symbol: string;
  action: 'buy' | 'sell' | 'close';
  quantity: number;
  reasoning?: string;
}) {
  return fetchApi<{
    success: boolean;
    order_id?: string;
    symbol: string;
    action: string;
    quantity: number;
    executed_price: number;
    total_value: number;
    fee: number;
    error?: string;
  }>('/api/trade', {
    method: 'POST',
    body: JSON.stringify(order),
  });
}
