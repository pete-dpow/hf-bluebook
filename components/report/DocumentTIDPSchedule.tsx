import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileText, Calendar, User, MessageSquare } from 'lucide-react';

interface TIDPDocument {
  document: string;
  revision: string;
  status: 'Complete' | 'In Progress' | 'Review' | 'Overdue' | 'Draft';
  dueDate: string;
  assignee: string;
  comments: string;
}

const documents: TIDPDocument[] = [
  {
    document: "Architectural General Arrangement Plans",
    revision: "P3",
    status: "Complete",
    dueDate: "Dec 1, 2024",
    assignee: "John Smith",
    comments: "Approved with minor redline corrections"
  },
  {
    document: "Structural Foundation Details",
    revision: "P2",
    status: "Complete",
    dueDate: "Nov 28, 2024",
    assignee: "Sarah Johnson",
    comments: "Engineer's stamp received"
  },
  {
    document: "MEP Coordination Drawings - Level 1",
    revision: "P1",
    status: "In Progress",
    dueDate: "Dec 18, 2024",
    assignee: "Mike Chen",
    comments: "Awaiting clash detection results"
  },
  {
    document: "Fire Protection System Layout",
    revision: "P1",
    status: "In Progress",
    dueDate: "Dec 20, 2024",
    assignee: "Lisa Wong",
    comments: "Hydraulic calculations in progress"
  },
  {
    document: "Facade Panel Shop Drawings",
    revision: "D2",
    status: "Overdue",
    dueDate: "Dec 5, 2024",
    assignee: "Tom Wilson",
    comments: "Manufacturer delays, revised ETA Dec 19"
  },
  {
    document: "Electrical Single Line Diagrams",
    revision: "P2",
    status: "Review",
    dueDate: "Dec 15, 2024",
    assignee: "Emma Davis",
    comments: "Under engineer review"
  },
  {
    document: "HVAC Equipment Schedules",
    revision: "P3",
    status: "Complete",
    dueDate: "Nov 30, 2024",
    assignee: "James Brown",
    comments: "Approved for procurement"
  },
  {
    document: "Plumbing Riser Diagrams",
    revision: "P1",
    status: "In Progress",
    dueDate: "Dec 22, 2024",
    assignee: "Maria Garcia",
    comments: "Coordinating with structural penetrations"
  },
  {
    document: "Landscape Site Plan",
    revision: "D1",
    status: "Draft",
    dueDate: "Jan 5, 2025",
    assignee: "David Lee",
    comments: "Initial concept under development"
  },
  {
    document: "Structural Steel Connection Details",
    revision: "P1",
    status: "Overdue",
    dueDate: "Dec 2, 2024",
    assignee: "Robert Taylor",
    comments: "14 days overdue, expedite required"
  },
  {
    document: "Ceiling Reflected Plans",
    revision: "P2",
    status: "Review",
    dueDate: "Dec 16, 2024",
    assignee: "Jennifer White",
    comments: "Coordinating with MEP services"
  },
  {
    document: "Window Wall Details",
    revision: "P2",
    status: "Complete",
    dueDate: "Dec 8, 2024",
    assignee: "Michael Brown",
    comments: "Thermal analysis approved"
  },
  {
    document: "Site Drainage Plan",
    revision: "P1",
    status: "In Progress",
    dueDate: "Dec 25, 2024",
    assignee: "Laura Martinez",
    comments: "Civil engineering review ongoing"
  },
  {
    document: "Elevator Machine Room Layouts",
    revision: "D1",
    status: "Draft",
    dueDate: "Jan 8, 2025",
    assignee: "Kevin Anderson",
    comments: "Vendor input pending"
  },
  {
    document: "Building Automation System Schematics",
    revision: "P1",
    status: "Review",
    dueDate: "Dec 19, 2024",
    assignee: "Nancy Wilson",
    comments: "Controls engineer reviewing"
  },
  {
    document: "Parking Layout Plans",
    revision: "D2",
    status: "Draft",
    dueDate: "Jan 10, 2025",
    assignee: "Christopher Moore",
    comments: "Traffic flow analysis in progress"
  },
  {
    document: "Foundation Waterproofing Details",
    revision: "P2",
    status: "Overdue",
    dueDate: "Dec 6, 2024",
    assignee: "Patricia Thomas",
    comments: "Specification clarification needed"
  },
  {
    document: "Roof Drainage Plan",
    revision: "P1",
    status: "Review",
    dueDate: "Dec 17, 2024",
    assignee: "Daniel Jackson",
    comments: "Hydraulic sizing verification underway"
  },
  {
    document: "Emergency Generator Installation Details",
    revision: "D1",
    status: "Draft",
    dueDate: "Jan 12, 2025",
    assignee: "Barbara Harris",
    comments: "Generator specifications being finalized"
  },
  {
    document: "Interior Finishes Schedule",
    revision: "P1",
    status: "Overdue",
    dueDate: "Dec 10, 2024",
    assignee: "Richard Clark",
    comments: "Material samples pending client approval"
  }
];

const statusConfig = {
  'Complete': { bg: '#ECFDF5', text: '#10B981', border: '#10B981' },
  'In Progress': { bg: '#EFF6FF', text: '#3B82F6', border: '#3B82F6' },
  'Review': { bg: '#F0F9FF', text: '#0EA5E9', border: '#0EA5E9' },
  'Overdue': { bg: '#FEF2F2', text: '#EF4444', border: '#EF4444' },
  'Draft': { bg: '#FFFBEB', text: '#F59E0B', border: '#F59E0B' }
};

export function DocumentTIDPSchedule() {
  const statusCounts = documents.reduce((acc, doc) => {
    acc[doc.status] = (acc[doc.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Card 
      className="mb-8 overflow-hidden transition-all duration-200 hover:shadow-md"
      style={{
        background: '#FEFCF9',
        border: '1px solid #111827'
      }}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-[#111827]">
              Document & TIDP Schedule
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Technical Information Delivery Plan - All project documents and deliverables
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-red-100 text-red-800 border border-red-300 hover:bg-red-100">
              {statusCounts['Overdue'] || 0} Overdue
            </Badge>
            <Badge className="bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-100">
              {statusCounts['Draft'] || 0} Draft
            </Badge>
            <Badge className="bg-blue-100 text-blue-800 border border-blue-300 hover:bg-blue-100">
              {statusCounts['In Progress'] || 0} In Progress
            </Badge>
            <Badge className="bg-green-100 text-green-800 border border-green-300 hover:bg-green-100">
              {statusCounts['Complete'] || 0} Complete
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow style={{ background: '#F9FAFB' }}>
                <TableHead className="font-semibold text-[#111827] w-[30%]">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Document
                  </div>
                </TableHead>
                <TableHead className="font-semibold text-[#111827]">Revision</TableHead>
                <TableHead className="font-semibold text-[#111827]">Status</TableHead>
                <TableHead className="font-semibold text-[#111827]">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Due Date
                  </div>
                </TableHead>
                <TableHead className="font-semibold text-[#111827]">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Assignee
                  </div>
                </TableHead>
                <TableHead className="font-semibold text-[#111827] w-[25%]">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Comments
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc, index) => {
                const config = statusConfig[doc.status];
                return (
                  <TableRow 
                    key={index}
                    className="hover:bg-gray-50/50 transition-colors"
                    style={{
                      borderLeft: `4px solid ${config.border}`
                    }}
                  >
                    <TableCell className="font-medium text-[#111827]">
                      {doc.document}
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded border border-gray-300">
                        {doc.revision}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        className="border"
                        style={{
                          background: config.bg,
                          color: config.text,
                          borderColor: config.border
                        }}
                      >
                        {doc.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-700">
                      {doc.dueDate}
                    </TableCell>
                    <TableCell className="text-gray-700">
                      {doc.assignee}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {doc.comments}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
