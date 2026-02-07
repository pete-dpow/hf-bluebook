import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from 'lucide-react';

const tasks = [
  { name: 'Foundation Pour - Building A', assignee: 'Ryan Chen', priority: 'high', startDay: 0, duration: 3, color: '#3B82F6' },
  { name: 'MEP Rough-in Inspection', assignee: 'Sarah Kim', priority: 'high', startDay: 2, duration: 2, color: '#10B981' },
  { name: 'Exterior Wall Framing', assignee: 'Mike Torres', priority: 'medium', startDay: 4, duration: 5, color: '#3B82F6' },
  { name: 'Window Installation - Phase 1', assignee: 'Lisa Park', priority: 'medium', startDay: 6, duration: 4, color: '#A855F7' },
  { name: 'Site Drainage System', assignee: 'David Wilson', priority: 'high', startDay: 1, duration: 6, color: '#F97316' },
  { name: 'HVAC Ductwork - Level 2', assignee: 'Alex Rivera', priority: 'medium', startDay: 8, duration: 4, color: '#10B981' },
  { name: 'Roofing Membrane Install', assignee: 'Emma Davis', priority: 'low', startDay: 9, duration: 3, color: '#A855F7' }
];

const dates = Array.from({ length: 14 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() + i);
  return {
    day: date.toLocaleDateString('en-US', { weekday: 'short' }),
    date: date.getDate()
  };
});

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high': return 'bg-red-50 text-red-700 border-red-200';
    case 'medium': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    case 'low': return 'bg-green-50 text-green-700 border-green-200';
    default: return 'bg-gray-50 text-gray-700 border-gray-200';
  }
};

export function TwoWeekLookAhead() {
  return (
    <Card className="border-[#111827] bg-[#FEFCF9] mb-6">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-[#F97316]" />
          <CardTitle className="text-[#111827]">Two Week Look-Ahead Schedule</CardTitle>
        </div>
        <CardDescription>Upcoming activities and resource allocation for the next 14 days</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Header Row */}
          <div className="flex items-center">
            <div className="w-72 flex-shrink-0"></div>
            <div className="flex-1 flex">
              {dates.map((d, i) => (
                <div key={i} className="flex-1 text-center">
                  <div className="text-xs font-semibold text-[#111827]">{d.day}</div>
                  <div className="text-xs text-gray-600">{d.date}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Task Rows */}
          {tasks.map((task, idx) => (
            <div key={idx} className="flex items-center">
              {/* Task Info */}
              <div className="w-72 flex-shrink-0 pr-4">
                <div className="text-sm font-medium text-[#111827] mb-1">{task.name}</div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600">{task.assignee}</span>
                  <Badge className={`text-xs ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </Badge>
                </div>
              </div>

              {/* Timeline */}
              <div className="flex-1 flex gap-1">
                {dates.map((_, dayIndex) => {
                  const isTaskDay = dayIndex >= task.startDay && dayIndex < task.startDay + task.duration;
                  return (
                    <div key={dayIndex} className="flex-1 h-12 flex items-center justify-center">
                      {isTaskDay && (
                        <div 
                          className="w-full h-10 rounded"
                          style={{ backgroundColor: task.color }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#3B82F6' }}></div>
              <span className="text-gray-600">Structural</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10B981' }}></div>
              <span className="text-gray-600">MEP</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#A855F7' }}></div>
              <span className="text-gray-600">Architectural</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#F97316' }}></div>
              <span className="text-gray-600">Civil</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
