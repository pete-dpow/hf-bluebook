import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useMemo } from 'react';

const data = [
  { name: 'Complete', value: 1, color: '#10B981' },
  { name: 'In Progress', value: 1, color: '#3B82F6' },
  { name: 'Upcoming', value: 2, color: '#6B7280' },
  { name: 'At Risk', value: 1, color: '#EF4444' }
];

export function ScheduleSummary() {
  const memoizedData = useMemo(() => data.filter(d => d.value > 0), []);
  const total = useMemo(() => data.reduce((sum, item) => sum + item.value, 0), []);
  const completeRate = useMemo(() => Math.round((data[0].value / total) * 100), [total]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
      {/* Left Card - Summary (3/4 width) */}
      <Card className="lg:col-span-3 border-[#111827] bg-[#FEFCF9]">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-[#F97316]" />
            <CardTitle className="text-[#111827]">Schedule Summary</CardTitle>
          </div>
          <CardDescription>Project milestone tracking and performance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-green-50 text-green-700 border-green-200 text-base px-3 py-1">
              <span className="font-bold">1</span>
              <span className="ml-1 font-normal">Complete</span>
            </Badge>
            <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-base px-3 py-1">
              <span className="font-bold">1</span>
              <span className="ml-1 font-normal">In Progress</span>
            </Badge>
            <Badge className="bg-red-50 text-red-700 border-red-200 text-base px-3 py-1">
              <span className="font-bold">1</span>
              <span className="ml-1 font-normal">At Risk</span>
            </Badge>
          </div>

          {/* Summary Text */}
          <div className="space-y-3 text-sm text-gray-700">
            <p>
              <span className="line-through">Project milestone execution demonstrates</span> <span className="font-medium text-[#111827]">measured progress</span> with foundation completion achieved despite a 3-day delay from the original August 30th target, finalizing on September 2nd. Ground floor slab operations are currently advancing through the structural phase at approximately 60% completion, maintaining alignment with the September 15th planned milestone. Upcoming steel frame installation for Level 1 remains on schedule for September 28th delivery, supporting the sequential construction workflow.
            </p>
            <p>
              <span className="font-medium text-[#111827]">Schedule risk assessment:</span> The exterior envelope milestone faces potential delays with a 5-day buffer concern for the October 25th target date, primarily due to coordination dependencies from preceding structural and MEP activities. MEP rough-in work for Level 1 maintains its October 12th schedule with no current impediments identified. <span className="line-through">Overall project delivery shows</span> <span className="font-medium text-[#F97316]">8 days of cumulative delay</span> across completed and at-risk milestones, representing manageable variance within typical construction project parameters and requiring proactive schedule compression strategies for subsequent phases.
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <span className="text-xs text-gray-500">189 words</span>
            <Badge variant="outline" className="bg-white text-[#111827] border-[#111827] hover:bg-[#111827] hover:text-white cursor-pointer">
              Regenerate
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Right Card - Donut Chart (1/4 width) */}
      <Card className="border-[#111827] bg-[#FEFCF9]">
        <CardHeader>
          <CardTitle className="text-[#111827]">Milestone Status</CardTitle>
          <CardDescription>Distribution of 5 total milestones</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          {/* Donut Chart */}
          <div className="relative w-48 h-48 mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={memoizedData}
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
                  {memoizedData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-4xl font-bold text-[#111827]">{completeRate}%</div>
              <div className="text-sm text-gray-500">Complete</div>
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
