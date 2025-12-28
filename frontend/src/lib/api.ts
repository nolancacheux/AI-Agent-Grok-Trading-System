const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws';

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
  return fetchApi<{
    status: string;
    ibkr_connected: boolean;
    scheduler_mode: 'MANUAL' | 'AUTO';
    scheduler_running: boolean;
    market_status: 'CLOSED' | 'PRE_MARKET' | 'OPEN' | 'AFTER_HOURS';
  }>('/health');
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

export async function getPortfolioHistory(hours: number = 24) {
  return fetchApi<{
    history: Array<{
      id: number;
      timestamp: string;
      total_value: number;
      cash: number;
      holdings_value: number;
      pnl: number;
      pnl_percent: number;
    }>;
    count: number;
  }>(`/api/portfolio/history?hours=${hours}`);
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
      value: number;
      pnl: number;
      pnl_percent: number;
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
    decision?: {
      action?: string;
      symbol?: string;
      reasoning?: string;
    };
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
      evaluated_risk: number;
      pnl?: number;
      status?: 'filled' | 'pending' | 'cancelled' | 'rejected';
    }>;
  }>('/api/agent/trades');
}

export async function getDecisions(options: { limit?: number; action?: string; symbol?: string } = {}) {
  const params = new URLSearchParams();
  if (options.limit) params.append('limit', options.limit.toString());
  if (options.action) params.append('action', options.action);
  if (options.symbol) params.append('symbol', options.symbol);

  return fetchApi<{
    decisions: Array<{
      id: number;
      timestamp: string;
      action: 'buy' | 'sell' | 'close' | 'keep';
      symbol?: string;
      quantity?: number;
      reasoning: string;
      context?: string;
      risk_score?: number;
      trading_session_id?: string;
      executed: boolean;
      trade_id?: number;
    }>;
  }>(`/api/agent/decisions?${params.toString()}`);
}

export async function getLastDecision() {
  return fetchApi<{
    current_session: Record<string, unknown> | null;
    last_persisted: {
      id: number;
      timestamp: string;
      action: string;
      symbol?: string;
      reasoning: string;
      context?: string;
      risk_score?: number;
      executed: boolean;
    } | null;
  }>('/api/agent/last-decision');
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

// Scheduler
export async function getSchedulerStatus() {
  return fetchApi<{
    is_running: boolean;
    mode: 'MANUAL' | 'AUTO';
    market_status: 'CLOSED' | 'PRE_MARKET' | 'OPEN' | 'AFTER_HOURS';
    is_market_open: boolean;
    next_jobs: Array<{
      id: string;
      name: string;
      next_run: string | null;
    }>;
    trading_interval_minutes: number;
    trade_count_since_reflection: number;
    reflection_trades_threshold: number;
  }>('/api/scheduler/status');
}

export async function setSchedulerMode(mode: 'MANUAL' | 'AUTO') {
  return fetchApi<{ mode: string }>(`/api/scheduler/mode/${mode}`, { method: 'POST' });
}

export async function triggerTradingLoop() {
  return fetchApi<{ message: string }>('/api/scheduler/trigger', { method: 'POST' });
}

// Broker Connection
export async function disconnectBroker(reconnectMinutes: number = 5) {
  return fetchApi<{
    status: string;
    message: string;
    reconnect_at?: number;
  }>(`/api/broker/disconnect?reconnect_minutes=${reconnectMinutes}`, { method: 'POST' });
}

export async function reconnectBroker() {
  return fetchApi<{
    status: string;
    message: string;
  }>('/api/broker/reconnect', { method: 'POST' });
}

// Chat History
export async function getChatHistory(limit: number = 50) {
  return fetchApi<{
    messages: Array<{
      id: number;
      timestamp: string;
      role: 'system' | 'user' | 'assistant';
      content: string;
      trading_session_id?: string;
      tokens_used?: number;
    }>;
  }>(`/api/chat/history?limit=${limit}`);
}

// Reflections
export async function getReflections(limit: number = 10) {
  return fetchApi<{
    reflections: Array<{
      id: number;
      timestamp: string;
      period_start: string;
      period_end: string;
      trades_analyzed: number;
      total_pnl: number;
      win_rate: number;
      content: string;
      lessons_learned?: string;
      strategy_adjustments?: string;
      sentiment_score?: number;
    }>;
  }>(`/api/reflections?limit=${limit}`);
}

export async function generateReflection(hours: number = 24) {
  return fetchApi<{
    id: number;
    type: string;
    period: { start: string; end: string };
    stats: Record<string, number>;
    reflection: string;
    lessons_learned?: string;
    strategy_adjustments?: string;
    sentiment_score?: number;
  }>(`/api/reflections/generate?hours=${hours}`, { method: 'POST' });
}

// System Logs
export async function getLogs(options: { limit?: number; level?: string; component?: string } = {}) {
  const params = new URLSearchParams();
  if (options.limit) params.append('limit', options.limit.toString());
  if (options.level) params.append('level', options.level);
  if (options.component) params.append('component', options.component);

  return fetchApi<{
    logs: Array<{
      id: number;
      timestamp: string;
      level: string;
      component?: string;
      message: string;
      details?: string;
    }>;
  }>(`/api/logs?${params.toString()}`);
}

// Statistics
export async function getStats(days: number = 30) {
  return fetchApi<{
    total_trades: number;
    total_volume: number;
    total_fees: number;
    realized_pnl: number;
    winning_trades: number;
    losing_trades: number;
    win_rate: number;
  }>(`/api/stats?days=${days}`);
}

// WebSocket connection
export type WebSocketMessage = {
  type: 'agent_status' | 'trade' | 'log' | 'portfolio_update' | 'chat_message' | 'reflection' | 'market_status' | 'mode_change' | 'init' | 'pong';
  data: Record<string, unknown>;
  timestamp: string;
};

export function createWebSocket(
  onMessage: (message: WebSocketMessage) => void,
  onError?: (error: Event) => void,
  onClose?: (event: CloseEvent) => void
): WebSocket {
  const ws = new WebSocket(WS_URL);

  ws.onopen = () => {
    console.log('WebSocket connected');
  };

  ws.onmessage = (event) => {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      onMessage(message);
    } catch (e) {
      console.error('Failed to parse WebSocket message:', e);
    }
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
    onError?.(error);
  };

  ws.onclose = (event) => {
    console.log('WebSocket closed:', event.code, event.reason);
    onClose?.(event);
  };

  return ws;
}

export function sendWebSocketMessage(ws: WebSocket, type: string, data?: Record<string, unknown>) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, ...data }));
  }
}
