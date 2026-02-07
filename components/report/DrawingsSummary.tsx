import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useMemo } from 'react';

interface DrawingsSummaryProps {
  summaryText: string;
  stats: {
    approved: number;
    underReview: number;
    rejected: number;
  };
}

export function DrawingsSummary({ summaryText, stats }: DrawingsSummaryProps) {
  const total = stats.approved + stats.underReview + stats.rejected;
  const approvalRate = total > 0 ? Math.round((stats.approved / total) * 100) : 0;

  const data = useMemo(() => [
    { name: 'Approved', value: stats.approved, color: '#10B981' },
    { name: 'Under Review', value: stats.underReview, color: '#3B82F6' },
    { name: 'Rejected', value: stats.rejected, color: '#EF4444' }
  ].filter(d => d.value > 0), [stats]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
      {/* Left Card - Summary (3/4 width) */}
      <Card className="lg:col-span-3 border-[#111827] bg-[#FEFCF9]">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-[#F97316]" />
            <CardTitle className="text-[#111827]">Drawings Summary</CardTitle>
          </div>
          <CardDescription>Current status of drawing submissions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-green-50 text-green-700 border-green-200 text-base px-3 py-1">
              <span className="font-bold">{stats.approved}</span>
              <span className="ml-1 font-normal">Approved</span>
            </Badge>
            <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-base px-3 py-1">
              <span className="font-bold">{stats.underReview}</span>
              <span className="ml-1 font-normal">Under Review</span>
            </Badge>
            <Badge className="bg-red-50 text-red-700 border-red-200 text-base px-3 py-1">
              <span className="font-bold">{stats.rejected}</span>
              <span className="ml-1 font-normal">Rejected</span>
            </Badge>
          </div>

          {/* Summary Text */}
          <div className="space-y-3 text-sm text-gray-700">
            {summaryText ? (
              summaryText.split('\n\n').map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))
            ) : (
              <p className="text-gray-500 italic">No drawing summary available. Generate one from the main page.</p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <span className="text-xs text-gray-500">{summaryText ? summaryText.split(' ').length : 0} words</span>
            <Badge variant="outline" className="bg-white text-[#111827] border-[#111827] hover:bg-[#111827] hover:text-white cursor-pointer">
              Regenerate
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Right Card - Donut Chart (1/4 width) */}
      <Card className="border-[#111827] bg-[#FEFCF9]">
        <CardHeader>
          <CardTitle className="text-[#111827]">Approval Status</CardTitle>
          <CardDescription>Distribution of {total} total drawings</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          {/* Donut Chart */}
          <div className="relative w-48 h-48 mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  startAngle={90}
                  endAngle={450}
                  paddingAngle={2}
                  dataKey="value"
                  isAnimationActive={false}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-4xl font-bold text-[#111827]">{approvalRate}%</div>
              <div className="text-sm text-gray-500">Approved</div>
            </div>
          </div>

          {/* Legend */}
          <div className="w-full space-y-2">
            {data.map((item, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-gray-600">{item.name}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="font-semibold text-[#111827]">{item.value}</span>
                  <span className="text-gray-500 w-10 text-right">
                    {Math.round((item.value / total) * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
