import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TestTube, MapPin, Calendar, CheckCircle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useMemo } from 'react';

const data = [
  { name: 'Passed', value: 2, color: '#10B981' },
  { name: 'Pending', value: 1, color: '#F59E0B' },
  { name: 'Failed', value: 1, color: '#EF4444' }
];

export function SampleSummary() {
  const memoizedData = useMemo(() => data, []);
  const total = useMemo(() => data.reduce((sum, item) => sum + item.value, 0), []);
  const passRate = useMemo(() => Math.round((data[0].value / total) * 100), [total]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
      {/* Left Card - Summary (3/4 width) */}
      <Card className="lg:col-span-3 border-[#111827] bg-[#FEFCF9]">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <TestTube className="h-5 w-5 text-[#F97316]" />
            <CardTitle className="text-[#111827]">Sample Summary</CardTitle>
          </div>
          <CardDescription>Material testing results and quality control</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-green-50 text-green-700 border-green-200 text-base px-3 py-1">
              <span className="font-bold">{data[0].value}</span>
              <span className="ml-1 font-normal">{data[0].name}</span>
            </Badge>
            <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-base px-3 py-1">
              <span className="font-bold">{data[1].value}</span>
              <span className="ml-1 font-normal">{data[1].name}</span>
            </Badge>
            <Badge className="bg-red-50 text-red-700 border-red-200 text-base px-3 py-1">
              <span className="font-bold">{data[2].value}</span>
              <span className="ml-1 font-normal">{data[2].name}</span>
            </Badge>
          </div>

          {/* Summary Text */}
          <div className="space-y-3 text-sm text-gray-700">
            <p>
              Material testing protocols demonstrate strong compliance performance. Foundation concrete core testing achieved 
              35.2 MPa compressive strength, exceeding the 30 MPa requirement by 17%, while steel reinforcement 
              tensile strength reached 520 MPa against the 500 MPa standard. These critical structural material 
              approvals support continued construction progress and validate design assumptions for load-bearing 
              elements.
            </p>
            <p>
              One soil sample from Excavation Zone B requires remedial action, with bearing capacity testing yielding 
              180 kN/m² against the required 200 kN/m² standard. Brick masonry water absorption testing remains 
              pending final laboratory analysis, collected from the east wall facade installation. The 50% pass rate 
              <span className="text-[#EF4444] font-medium"> reflects typical early-stage construction quality control outcomes</span>, with 
              planned for addressing the failed soil bearing capacity through foundation design modifications or soil 
              improvement techniques.
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <span className="text-xs text-gray-500">162 words</span>
            <Badge variant="outline" className="bg-white text-[#111827] border-[#111827] hover:bg-[#111827] hover:text-white cursor-pointer">
              Regenerate
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Right Card - Donut Chart (1/4 width) */}
      <Card className="border-[#111827] bg-[#FEFCF9]">
        <CardHeader>
          <CardTitle className="text-[#111827]">Test Results</CardTitle>
          <CardDescription>Distribution of 4 total samples</CardDescription>
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
              <div className="text-4xl font-bold text-[#111827]">{passRate}%</div>
              <div className="text-sm text-gray-500">Pass Rate</div>
            </div>
          </div>

          {/* Legend */}
          <div className="w-full space-y-2">
            {memoizedData.map((item, index) => (
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
