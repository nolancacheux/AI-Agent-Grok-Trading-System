export type AgentStatus = 'IDLE' | 'ANALYZING' | 'TRADING';
export type TradeAction = 'buy' | 'sell' | 'close';
export type MarketStatus = 'OPEN' | 'CLOSED' | 'PRE_MARKET' | 'AFTER_HOURS';

export interface Position {
  symbol: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  value: number;
  pnl: number;
  pnlPercent: number;
}

export interface Trade {
  id: string;
  timestamp: string;
  action: TradeAction;
  symbol: string;
  quantity: number;
  price: number;
  totalValue: number;
  fee: number;
  reasoning: string;
  evaluatedRisk: number;
  status: 'filled' | 'pending' | 'cancelled' | 'rejected';
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  timestamp: string;
  toolCalls?: unknown[];
}

export interface AgentState {
  name: string;
  pnl: number;
  pnlPercent: number;
  status: AgentStatus;
  cash: number;
  holdings: number;
  totalValue: number;
  initialValue: number;
  positions: Position[];
  chatHistory: ChatMessage[];
  lastAction: string;
  lastActionTime: string;
}

export interface PortfolioSnapshot {
  timestamp: string;
  totalValue: number;
  cash: number;
  positionsValue: number;
  pnl: number;
  pnlPercent: number;
}

export interface DailyStats {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  avgTradeDuration: string;
  bestStock: { symbol: string; pnl: number } | null;
  worstStock: { symbol: string; pnl: number } | null;
  totalFees: number;
}

export interface TimeRange {
  label: string;
  value: '1H' | '24H' | '7D' | 'ALL';
  hours: number | null;
}
