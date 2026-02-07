import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const monthlyData = [
  { month: 'Jan', planned: 45, actual: 42 },
  { month: 'Feb', planned: 52, actual: 48 },
  { month: 'Mar', planned: 61, actual: 58 },
  { month: 'Apr', planned: 58, actual: 61 },
  { month: 'May', planned: 63, actual: 59 },
  { month: 'Jun', planned: 70, actual: 73 },
  { month: 'Jul', planned: 68, actual: 71 },
  { month: 'Aug', planned: 75, actual: 68 },
  { month: 'Sep', planned: 72, actual: 75 }
];

export function PlannedVsActualChart() {
  const chartData = useMemo(() => monthlyData, []);

  return (
    <Card 
      className="mb-8 overflow-hidden transition-all duration-200 hover:shadow-md"
      style={{
        background: '#FEFCF9',
        border: '1px solid #111827'
      }}
    >
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-[#111827]">
          Planned vs Actual Document Issues
        </CardTitle>
        <p className="text-sm text-gray-600 mt-1">
          Monthly comparison of planned document releases versus actual submissions
        </p>
      </CardHeader>
      <CardContent className="p-6">
        <div className="w-full h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis 
                dataKey="month" 
                stroke="#6B7280"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="#6B7280"
                style={{ fontSize: '12px' }}
              />
              <Tooltip
                contentStyle={{
                  background: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  borderRadius: '6px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              />
              <Legend 
                wrapperStyle={{
                  paddingTop: '20px'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="planned" 
                stroke="#F97316" 
                strokeWidth={3}
                dot={{ fill: '#F97316', r: 4 }}
                activeDot={{ r: 6 }}
                name="Planned"
                isAnimationActive={false}
              />
              <Line 
                type="monotone" 
                dataKey="actual" 
                stroke="#111827" 
                strokeWidth={3}
                dot={{ fill: '#111827', r: 4 }}
                activeDot={{ r: 6 }}
                name="Actual"
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
