import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clipboard } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useMemo } from 'react';

const data = [
  { name: 'Approved', value: 1, color: '#10B981' },
  { name: 'Under Review', value: 2, color: '#3B82F6' },
  { name: 'Pending', value: 1, color: '#F59E0B' },
  { name: 'Rejected', value: 2, color: '#EF4444' },
  { name: 'Draft', value: 1, color: '#6B7280' }
];

export function TechnicalSubmittalSummary() {
  const memoizedData = useMemo(() => data.filter(d => d.value > 0), []);
  const total = useMemo(() => data.reduce((sum, item) => sum + item.value, 0), []);
  const approvalRate = useMemo(() => Math.round((data[0].value / total) * 100), [total]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
      {/* Left Card - Summary (2/3 width) */}
      <Card className="lg:col-span-3 border-[#111827] bg-[#FEFCF9]">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Clipboard className="h-5 w-5 text-[#F97316]" />
            <CardTitle className="text-[#111827]">Technical Submittal Summary</CardTitle>
          </div>
          <CardDescription>Current status of technical submittals</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Badges - Just badges, no cards */}
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-green-50 text-green-700 border-green-200 text-base px-3 py-1">
              <span className="font-bold">1</span>
              <span className="ml-1 font-normal">Approved</span>
            </Badge>
            <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-base px-3 py-1">
              <span className="font-bold">2</span>
              <span className="ml-1 font-normal">In Review</span>
            </Badge>
            <Badge className="bg-red-50 text-red-700 border-red-200 text-base px-3 py-1">
              <span className="font-bold">2</span>
              <span className="ml-1 font-normal">Rejected</span>
            </Badge>
          </div>

          {/* Summary Text - matching Figma */}
          <div className="space-y-3 text-sm text-gray-700">
            <p>
              Technical submittal tracking platform monitors contractor/consultant submissions currently tracked. The HVAC equipment 
              specifications from Mechanical Solutions Ltd. have achieved full approval status, establishing a foundation 
              for mechanical system procurement and installation scheduling.
            </p>
            <p>
              Submittal TS-002 covering curtain wall system details from Facade Experts Inc. remains under active 
              review with September 18th target completion.
            </p>
            <p>
              One approved submittal supports immediate procurement activities, while one item under review and one 
              pending review maintain project momentum. Fire protection system layout submittal requires resubmission 
              following initial rejection, with Safety First Systems addressing technical specifications. Electrical panel 
              schedules remain in draft status with PowerFlow Electrical, representing the lowest priority item in the 
              current cycle. The submittal approval rate of 20% reflects the early stage of coordination efforts, with 
              <span className="text-[#F97316] font-medium"> accelerated review processes</span> planned for upcoming critical path items.
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <span className="text-xs text-gray-500">174 words</span>
            <Badge variant="outline" className="bg-white text-[#111827] border-[#111827] hover:bg-[#111827] hover:text-white cursor-pointer">
              Regenerate
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Right Card - Donut Chart (1/3 width) */}
      <Card className="border-[#111827] bg-[#FEFCF9]">
        <CardHeader>
          <CardTitle className="text-[#111827]">Submittal Status</CardTitle>
          <CardDescription>Distribution of 5 total submittals</CardDescription>
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
