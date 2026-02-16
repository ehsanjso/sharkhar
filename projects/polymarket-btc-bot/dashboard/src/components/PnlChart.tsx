import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { PnlDataPoint } from '../types';

interface PnlChartProps {
  data: PnlDataPoint[];
}

export function PnlChart({ data }: PnlChartProps) {
  const maxValue = Math.max(...data.map(d => d.cumulative), 0);
  const minValue = Math.min(...data.map(d => d.cumulative), 0);

  return (
    <div className="glass rounded-xl p-4 md:p-6">
      <h3 className="text-base md:text-lg font-medium text-white mb-3 md:mb-4">Cumulative P&L</h3>
      
      <div className="h-48 md:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="50%" stopColor="#22c55e" stopOpacity={0.1} />
                <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a38" vertical={false} />
            
            <XAxis
              dataKey="market"
              stroke="#6b7280"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `#${value}`}
              interval="preserveStartEnd"
            />
            
            <YAxis
              stroke="#6b7280"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `$${value}`}
              domain={[minValue - 20, maxValue + 20]}
              width={40}
            />
            
            <Tooltip
              contentStyle={{
                backgroundColor: '#1a1a24',
                border: '1px solid #2a2a38',
                borderRadius: '8px',
                color: '#e5e5e5',
                fontSize: '12px',
              }}
              formatter={(value) => [`$${(value as number).toFixed(2)}`, 'P&L']}
              labelFormatter={(label) => `Market #${label}`}
            />
            
            <ReferenceLine y={0} stroke="#4a4a58" strokeDasharray="3 3" />
            
            <Area
              type="monotone"
              dataKey="cumulative"
              stroke="#22c55e"
              strokeWidth={2}
              fill="url(#colorPnl)"
              dot={(props) => {
                const { cx, cy, payload } = props;
                if (!cx || !cy) return null;
                const isNegative = payload.pnl < 0;
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={3}
                    fill={isNegative ? '#ef4444' : '#22c55e'}
                    stroke="none"
                  />
                );
              }}
              activeDot={{
                r: 5,
                stroke: '#fff',
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
