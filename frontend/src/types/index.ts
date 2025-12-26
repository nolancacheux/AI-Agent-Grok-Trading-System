export type AgentStatus = 'IDLE' | 'ANALYZING' | 'TRADING' | 'ERROR';
export type TradeAction = 'buy' | 'sell' | 'close';
export type MarketStatus = 'OPEN' | 'CLOSED' | 'PRE_MARKET' | 'AFTER_HOURS';
export type SystemStatus = 'ON' | 'OFF';
export type TradingMode = 'MANUAL' | 'AUTO';

export interface Position {
  symbol: string;
  quantity: number;
  side: 'LONG' | 'SHORT';
  avgPrice: number;
  currentPrice: number;
  value: number;
  costBasis: number;
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

export interface NeuralLog {
  id: string;
  timestamp: string;
  type: 'analysis' | 'trade' | 'time' | 'price' | 'reflection';
  summary: string;
  details: string;
  status: 'complete' | 'pending' | 'error';
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
  costBasis: number;
  unrealizedPnl: number;
  positions: Position[];
  chatHistory: ChatMessage[];
  lastAction: string;
  lastActionTime: string;
  tradesToday: number;
  ibAccountId: string;
  tradingMode: TradingMode;
  sessionId: string;
}

export interface PortfolioSnapshot {
  timestamp: string;
  totalValue: number;
  cash: number;
  positionsValue: number;
  pnl: number;
  pnlPercent: number;
}

export interface PortfolioBalance {
  cashAvailable: number;
  holdingsValue: number;
  costBasis: number;
  unrealizedPnl: number;
  initialCapital: number;
  totalValue: number;
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

export interface SystemLog {
  id: string;
  timestamp: string;
  agent: string;
  message: string;
  type: 'analysis' | 'trade' | 'info' | 'error';
}
