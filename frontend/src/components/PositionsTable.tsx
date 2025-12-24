'use client';

import type { Position } from '@/types';
import { formatCurrency } from '@/data/mockData';

interface PositionsTableProps {
  positions: Position[];
  onClosePosition?: (symbol: string) => void;
}

export function PositionsTable({ positions, onClosePosition }: PositionsTableProps) {
  if (positions.length === 0) {
    return (
      <div className="card">
        <div className="card-header">Positions</div>
        <div className="card-body">
          <div className="text-center py-8 text-text-muted">
            <p className="text-sm">No open positions</p>
          </div>
        </div>
      </div>
    );
  }

  const totalValue = positions.reduce((sum, p) => sum + p.value, 0);
  const totalPnl = positions.reduce((sum, p) => sum + p.pnl, 0);

  return (
    <div className="card overflow-hidden">
      <div className="card-header flex items-center justify-between">
        <span>Positions</span>
        <span className="badge badge-gray">{positions.length}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Symbol</th>
              <th className="text-right">Qty</th>
              <th className="text-right">Avg Price</th>
              <th className="text-right">Current</th>
              <th className="text-right">Value</th>
              <th className="text-right">P&L</th>
              {onClosePosition && <th className="text-right">Action</th>}
            </tr>
          </thead>
          <tbody>
            {positions.map((position) => {
              const isProfit = position.pnl >= 0;
              return (
                <tr key={position.symbol}>
                  <td>
                    <span className="font-semibold text-text-primary">
                      {position.symbol}
                    </span>
                  </td>
                  <td className="text-right">{position.quantity}</td>
                  <td className="text-right">{formatCurrency(position.avgPrice)}</td>
                  <td className="text-right">{formatCurrency(position.currentPrice)}</td>
                  <td className="text-right">{formatCurrency(position.value)}</td>
                  <td className="text-right">
                    <div className="flex flex-col items-end">
                      <span className={isProfit ? 'text-accent-green' : 'text-accent-red'}>
                        {isProfit ? '+' : ''}{formatCurrency(position.pnl)}
                      </span>
                      <span className={`text-xs ${isProfit ? 'text-accent-green' : 'text-accent-red'}`}>
                        {isProfit ? '+' : ''}{position.pnlPercent.toFixed(2)}%
                      </span>
                    </div>
                  </td>
                  {onClosePosition && (
                    <td className="text-right">
                      <button
                        onClick={() => onClosePosition(position.symbol)}
                        className="btn btn-ghost text-xs px-3 py-1 text-accent-red hover:bg-accent-red/10"
                      >
                        Close
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="p-4 border-t border-border-primary flex justify-between items-center text-sm">
        <div>
          <span className="text-text-muted">Total Value: </span>
          <span className="font-mono font-semibold">{formatCurrency(totalValue)}</span>
        </div>
        <div>
          <span className="text-text-muted">Total P&L: </span>
          <span className={`font-mono font-semibold ${totalPnl >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
            {totalPnl >= 0 ? '+' : ''}{formatCurrency(totalPnl)}
          </span>
        </div>
      </div>
    </div>
  );
}
