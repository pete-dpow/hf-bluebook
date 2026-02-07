import { useMemo } from 'react';
import { CheckCircle2, Clock, AlertCircle, FileText, XCircle, TrendingUp } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const stats = [
  {
    title: 'Completed Drawings',
    subtitle: 'Approved & signed off',
    value: '247',
    icon: CheckCircle2,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    trend: '+12%',
    trendPositive: true
  },
  {
    title: 'Issues Flagged',
    subtitle: 'Requiring attention',
    value: '23',
    icon: AlertCircle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    trend: '-8%',
    trendPositive: false
  },
  {
    title: 'Overdue Items',
    subtitle: 'Past deadline',
    value: '7',
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    trend: '+2%',
    trendPositive: true
  },
  {
    title: 'In Progress',
    subtitle: 'Under review',
    value: '89',
    icon: Clock,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    trend: '+5%',
    trendPositive: true
  },
  {
    title: 'Not Started',
    subtitle: 'Pending initiation',
    value: '41',
    icon: FileText,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    trend: '0%',
    trendPositive: null
  },
  {
    title: 'On Schedule',
    subtitle: 'Meeting deadlines',
    value: '312',
    icon: TrendingUp,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    trend: '+8%',
    trendPositive: true
  }
];

const chartData = [
  { name: 'Completed', value: 247, color: '#10B981' },
  { name: 'In Progress', value: 89, color: '#3B82F6' },
  { name: 'Issues', value: 23, color: '#F59E0B' }
];

export function StatsCards() {
  const memoizedChartData = useMemo(() => chartData, []);
  const legendData = useMemo(() => memoizedChartData.slice(0, 3), [memoizedChartData]);

  const renderStatusCard = (stat: typeof stats[0], key: number) => {
    const IconComponent = stat.icon;
    const trendColor = stat.trendPositive === true ? 'text-green-600' : stat.trendPositive === false ? 'text-red-600' : 'text-gray-600';
    const trendIconColor = stat.trendPositive === true ? 'text-green-500' : stat.trendPositive === false ? 'text-red-500' : 'text-gray-500';
    
    return (
      <div 
        key={key} 
        className="p-3 bg-white border border-gray-200 rounded-xl hover:shadow-lg transition-all duration-200"
      >
        <div className="flex flex-col h-full min-h-[85px]">
          {/* Header with icon and trend */}
          <div className="flex items-start justify-between mb-2">
            <div className={`p-1.5 rounded-md ${stat.bgColor}`}>
              <IconComponent className={`h-3 w-3 ${stat.color}`} />
            </div>
            <div className="flex items-center space-x-1">
              <TrendingUp className={`h-2 w-2 ${trendIconColor}`} />
              <span className={`text-xs font-medium ${trendColor}`}>{stat.trend}</span>
            </div>
          </div>
          
          {/* Content with title and number side by side */}
          <div className="flex-1 flex flex-col justify-center">
            <div className="flex items-baseline justify-between mb-1">
              <h3 className="text-gray-900 font-semibold text-xs leading-tight flex-1 pr-2">
                {stat.title}
              </h3>
              <div className="text-lg font-bold text-gray-900 tracking-tight">
                {stat.value}
              </div>
            </div>
            <p className="text-xs text-gray-500 leading-tight">{stat.subtitle}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      {/* Columns 1-3: Status cards in pairs */}
      {[0, 2, 4].map((startIndex, columnIndex) => (
        <div key={columnIndex} className="space-y-6">
          {stats.slice(startIndex, startIndex + 2).map((stat, index) =>
            renderStatusCard(stat, startIndex + index)
          )}
        </div>
      ))}

      {/* Column 4: Project Overview Card */}
      <div className="flex items-start">
        <div className="w-full h-full bg-white border border-gray-200 rounded-xl hover:shadow-lg transition-all duration-200 p-3">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-md bg-orange-50">
                  <FileText className="h-3 w-3 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-gray-900 font-semibold text-xs leading-tight">Project Overview</h3>
                  <p className="text-xs text-gray-500">Total: 400 documents</p>
                </div>
              </div>
              <button className="text-gray-400 hover:text-gray-600">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
                </svg>
              </button>
            </div>
            
            <div className="flex-1 flex flex-col items-center justify-center min-h-0">
              {/* Doughnut Chart */}
              <div className="relative w-20 h-20 flex-shrink-0 mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={memoizedChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={28}
                      outerRadius={40}
                      startAngle={90}
                      endAngle={450}
                      dataKey="value"
                      isAnimationActive={false}
                    >
                      {memoizedChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold text-gray-900">62%</span>
                  <span className="text-sm text-gray-500">Done</span>
                </div>
              </div>
              
              {/* Legend */}
              <div className="w-full space-y-1.5">
                {legendData.map((item, index) => (
                  <div key={`legend-${index}`} className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: item.color }}
                      ></div>
                      <span className="text-gray-600 truncate text-xs">{item.name}</span>
                    </div>
                    <span className="font-medium text-gray-900">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
