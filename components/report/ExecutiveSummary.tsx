import { Badge } from '@/components/ui/badge';
import { TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';

interface ExecutiveSummaryProps {
  status: "On Track" | "Behind Schedule" | "At Risk";
  highlights: string[];
  summary: string;
}

export function ExecutiveSummary({ status, highlights, summary }: ExecutiveSummaryProps) {
  // Status badge styling based on status
  const statusStyles = {
    "On Track": "bg-green-50 text-green-700 border-green-200",
    "Behind Schedule": "bg-orange-50 text-orange-700 border-orange-200",
    "At Risk": "bg-red-50 text-red-700 border-red-200"
  };

  // Icon selection based on highlight content
  const getIcon = (index: number) => {
    if (index === 0) return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    if (index === 1) return <AlertCircle className="h-5 w-5 text-amber-600" />;
    return <TrendingUp className="h-5 w-5 text-blue-600" />;
  };

  return (
    <div className="p-6 mb-6 bg-white border border-gray-200 rounded-xl">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-[#111827] mb-1">Executive Summary</h2>
          <p className="text-sm text-gray-500">
            Project overview for week ending {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <Badge variant="outline" className={statusStyles[status]}>
          {status}
        </Badge>
      </div>

      <div className="space-y-4">
        {/* Key Highlights - Dynamic from Excel data */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
          {highlights.slice(0, 3).map((highlight, index) => (
            <div key={index} className="flex items-center space-x-2">
              {getIcon(index)}
              <div>
                <p className="text-sm font-medium text-[#111827]">{highlight}</p>
                <p className="text-xs text-gray-500">Real-time data</p>
              </div>
            </div>
          ))}
        </div>

        {/* Main Summary Text - Dynamic or fallback */}
        <div className="prose prose-sm max-w-none">
          {summary && summary !== "Project progressing..." ? (
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
              {summary}
            </p>
          ) : (
            <>
              <p className="text-gray-700 leading-relaxed">
                Project delivery remains <span className="font-medium text-[#111827]">on track with strong momentum</span> across all design phases. 
                The construction documentation package has achieved significant progress with drawings completed and approved. 
                Current completion rate indicates efficient workflow optimization and team coordination.
              </p>
              <p className="text-gray-700 leading-relaxed mt-3">
                <span className="font-medium text-[#111827]">Key areas requiring attention:</span> Several items have been flagged 
                for technical review, primarily related to coordination and detailing. 
                The design team has prioritized these items for resolution within the next sprint cycle. 
                Overall project health remains <span className="font-medium text-green-700">positive</span> with no critical blockers identified.
              </p>
            </>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <div className="text-xs text-gray-500">
            {summary ? `${summary.split(' ').length} words` : 'Awaiting AI summary'}
          </div>
          <Badge variant="outline" className="bg-white text-[#111827] border-[#111827] hover:bg-[#111827] hover:text-white cursor-pointer transition-colors">
            Regenerate
          </Badge>
        </div>
      </div>
    </div>
  );
}
