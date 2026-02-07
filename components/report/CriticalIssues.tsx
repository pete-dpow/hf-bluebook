import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, User } from 'lucide-react';

const criticalIssues = [
  {
    issue: "Structural Steel Drawings Missing",
    description: "Level 3-5 steel connection details not submitted",
    priority: "Critical",
    daysOverdue: 14,
    assignee: "John Smith"
  },
  {
    issue: "MEP Coordination Conflict",
    description: "HVAC ductwork clashing with structural beams in Zone B",
    priority: "Critical",
    daysOverdue: 9,
    assignee: "Sarah Johnson"
  },
  {
    issue: "Foundation Detail Approval Pending",
    description: "Engineer's stamp required for pile cap revisions",
    priority: "High",
    daysOverdue: 7,
    assignee: "Mike Chen"
  },
  {
    issue: "Fire Safety System Documentation",
    description: "Sprinkler layout drawings incomplete for floors 2-4",
    priority: "Critical",
    daysOverdue: 12,
    assignee: "Lisa Wong"
  },
  {
    issue: "Facade Panel Shop Drawings",
    description: "Curtain wall manufacturer shop drawings delayed",
    priority: "High",
    daysOverdue: 5,
    assignee: "Tom Wilson"
  }
];

export function CriticalIssues() {
  return (
    <Card 
      className="mb-8 overflow-hidden transition-all duration-200 hover:shadow-md"
      style={{
        background: '#FEFCF9',
        border: '1px solid #111827'
      }}
    >
      <CardHeader className="border-b border-gray-200" style={{ background: '#FEF2F2' }}>
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <CardTitle className="text-lg font-semibold text-[#111827]">
            Critical Issues Requiring Attention
          </CardTitle>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          High-priority items impacting project schedule
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow style={{ background: '#F9FAFB' }}>
              <TableHead className="font-semibold text-[#111827]">Issue</TableHead>
              <TableHead className="font-semibold text-[#111827]">Description</TableHead>
              <TableHead className="font-semibold text-[#111827]">Priority</TableHead>
              <TableHead className="font-semibold text-[#111827]">Days Overdue</TableHead>
              <TableHead className="font-semibold text-[#111827]">Assignee</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {criticalIssues.map((issue, index) => (
              <TableRow 
                key={index}
                className="hover:bg-red-50/30 transition-colors"
              >
                <TableCell className="font-medium text-[#111827]">
                  {issue.issue}
                </TableCell>
                <TableCell className="text-gray-700">
                  {issue.description}
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={issue.priority === "Critical" ? "destructive" : "default"}
                    className={
                      issue.priority === "Critical" 
                        ? "bg-red-100 text-red-800 border border-red-300 hover:bg-red-100" 
                        : "bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-100"
                    }
                  >
                    {issue.priority}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-red-600">
                    <Clock className="w-4 h-4" />
                    <span className="font-medium">{issue.daysOverdue} days</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-gray-700">
                    <User className="w-4 h-4" />
                    <span>{issue.assignee}</span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
