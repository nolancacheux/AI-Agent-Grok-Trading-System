'use client';

import type { Position } from '@/types';
import { formatCurrency, formatPercent } from '@/data/mockData';

interface PositionsTableProps {
  positions: Position[];
  onClosePosition?: (symbol: string) => void;
}

export function PositionsTable({ positions, onClosePosition }: PositionsTableProps) {
  if (positions.length === 0) {
    return (
      <div className="terminal-panel p-4 h-full">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-neon-green text-lg font-mono">&gt;&gt;</span>
          <h2 className="text-sm font-medium text-terminal-text uppercase tracking-widest">
            Current Positions
          </h2>
        </div>
        <div className="flex items-center justify-center h-32 text-terminal-text">
          <div className="text-center">
            <div className="text-2xl mb-2 opacity-50">[ ]</div>
            <div className="text-sm">No open positions</div>
          </div>
        </div>
      </div>
    );
  }

  const totalValue = positions.reduce((sum, p) => sum + p.value, 0);
  const totalPnl = positions.reduce((sum, p) => sum + p.pnl, 0);

  return (
    <div className="terminal-panel p-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-neon-green text-lg font-mono">&gt;&gt;</span>
          <h2 className="text-sm font-medium text-terminal-text uppercase tracking-widest">
            Current Positions
          </h2>
          <span className="text-xs px-2 py-0.5 bg-neon-green/20 text-neon-green rounded">
            {positions.length}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-terminal-text text-xs uppercase tracking-wider border-b border-terminal-border">
              <th className="text-left py-2 pr-2">Symbol</th>
              <th className="text-right py-2 px-2">Qty</th>
              <th className="text-right py-2 px-2">Avg Price</th>
              <th className="text-right py-2 px-2">Current</th>
              <th className="text-right py-2 px-2">Value</th>
              <th className="text-right py-2 px-2">P&L</th>
              <th className="text-right py-2 pl-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((position) => {
              const isProfit = position.pnl >= 0;

              return (
                <tr
                  key={position.symbol}
                  className="trade-row border-b border-terminal-border/50 hover:bg-terminal-gray/30"
                >
                  <td className="py-3 pr-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-1 h-8 rounded-full ${
                          isProfit ? 'bg-neon-green' : 'bg-neon-red'
                        }`}
                      />
                      <span className="font-bold text-white">{position.symbol}</span>
                    </div>
                  </td>
                  <td className="text-right py-3 px-2 text-white">
                    {position.quantity}
                  </td>
                  <td className="text-right py-3 px-2 text-terminal-text">
                    ${position.avgPrice.toFixed(2)}
                  </td>
                  <td className="text-right py-3 px-2">
                    <span
                      className={
                        position.currentPrice > position.avgPrice
                          ? 'text-neon-green'
                          : position.currentPrice < position.avgPrice
                          ? 'text-neon-red'
                          : 'text-white'
                      }
                    >
                      ${position.currentPrice.toFixed(2)}
                    </span>
                  </td>
                  <td className="text-right py-3 px-2 text-white font-medium">
                    {formatCurrency(position.value)}
                  </td>
                  <td className="text-right py-3 px-2">
                    <div className="flex flex-col items-end">
                      <span
                        className={`font-medium ${
                          isProfit ? 'text-neon-green' : 'text-neon-red'
                        }`}
                      >
                        {formatCurrency(position.pnl)}
                      </span>
                      <span
                        className={`text-xs ${
                          isProfit ? 'text-neon-green/70' : 'text-neon-red/70'
                        }`}
                      >
                        {formatPercent(position.pnlPercent)}
                      </span>
                    </div>
                  </td>
                  <td className="text-right py-3 pl-2">
                    <button
                      onClick={() => onClosePosition?.(position.symbol)}
                      className="btn-terminal-danger text-xs px-2 py-1"
                    >
                      CLOSE
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer Summary */}
      <div className="mt-4 pt-4 border-t border-terminal-border flex justify-between items-center">
        <div className="text-sm">
          <span className="text-terminal-text">Total Value: </span>
          <span className="text-white font-bold">{formatCurrency(totalValue)}</span>
        </div>
        <div className="text-sm">
          <span className="text-terminal-text">Total P&L: </span>
          <span
            className={`font-bold ${
              totalPnl >= 0 ? 'text-neon-green' : 'text-neon-red'
            }`}
          >
            {formatCurrency(totalPnl)}
          </span>
        </div>
      </div>
    </div>
  );
}
