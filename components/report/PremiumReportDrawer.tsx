"use client";

import { X, Download, Printer } from 'lucide-react';
import { Button } from '../ui/button';
import { StatsCards } from './StatsCards';
import { PlannedVsActualChart } from './PlannedVsActualChart';
import { CriticalIssues } from './CriticalIssues';
import { DrawingsSummary } from './DrawingsSummary';
import { TechnicalSubmittalSummary } from './TechnicalSubmittalSummary';
import { SampleSummary } from './SampleSummary';
import { ScheduleSummary } from './ScheduleSummary';
import { ExecutiveSummary } from './ExecutiveSummary';
import { PromoBanner } from './PromoBanner';
import { TwoWeekLookAhead } from './TwoWeekLookAhead';
import { DocumentTIDPSchedule } from './DocumentTIDPSchedule';
import { useMemo } from 'react';

interface PremiumReportDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  excelData?: {
    headers: string[];
    allRows: any[][];
  };
}

export default function PremiumReportDrawer({ isOpen, onClose, excelData }: PremiumReportDrawerProps) {
  // EXACT COPY OF FREEMIUM LOGIC FROM preview/page.tsx
  const reportData = useMemo(() => {
    if (!excelData || !excelData.allRows.length || !excelData.headers.length) {
      console.log('⚠️ No Excel data available');
      return {
        statsCards: { totalDocuments: 0, drawings: 0, technical: 0, samples: 0, approved: 0, underReview: 0, rejected: 0, critical: 0, approvalRate: 0 },
        drawingsSummary: { summaryText: "No data", stats: { approved: 0, underReview: 0, rejected: 0 } },
        executiveSummary: { status: "On Track" as const, highlights: ["No data"], summary: "" },
        technicalSummary: { approved: 0, underReview: 0, rejected: 0, total: 0, approvalRate: 0, topSubmittals: [] },
        sampleSummary: { passed: 0, failed: 0, pending: 0, total: 0, passRate: 0 },
        scheduleSummary: { completed: 0, inProgress: 0, notStarted: 0, total: 0, completionRate: 0 },
        criticalIssues: { issues: [] },
        plannedVsActual: { data: [] },
        twoWeekLookAhead: { tasks: [] },
        tidpSchedule: { documents: [] },
        promoBanner: {}
      };
    }

    const { headers, allRows } = excelData;
    
    console.log('✅ Processing Excel data:', {
      rows: allRows.length,
      columns: headers.length
    });

    // EXACT COPY OF FREEMIUM - Convert rows to objects
    const rowObjects = allRows.map(row => {
      const obj: any = {};
      headers.forEach((header, idx) => {
        obj[header] = row[idx];
      });
      return obj;
    });

    // EXACT COPY OF FREEMIUM - Helper functions
    const hasType = (r: any, t: string) => String(r.Type || "").trim().toUpperCase() === t;
    const hasStatus = (r: any, s: string) => String(r.STATUS || "").trim().toUpperCase() === s;

    // Filter by type
    const drawings = rowObjects.filter(r => hasType(r, "DR"));
    const technical = rowObjects.filter(r => hasType(r, "TS"));
    const samples = rowObjects.filter(r => hasType(r, "SL"));

    console.log('✅ Filtered counts:', {
      drawings: drawings.length,
      technical: technical.length,
      samples: samples.length
    });

    // Get status counts for drawings
    const drawingsApproved = drawings.filter(r => hasStatus(r, "A")).length;
    const drawingsUnderReview = drawings.filter(r => hasStatus(r, "U")).length;
    const drawingsRejected = drawings.filter(r => hasStatus(r, "R")).length;

    // Get status counts for technical
    const technicalApproved = technical.filter(r => hasStatus(r, "A")).length;
    const technicalUnderReview = technical.filter(r => hasStatus(r, "U")).length;
    const technicalRejected = technical.filter(r => hasStatus(r, "R")).length;

    // Get status counts for samples
    const samplesApproved = samples.filter(r => hasStatus(r, "A")).length;
    const samplesRejected = samples.filter(r => hasStatus(r, "R")).length;
    const samplesUnderReview = samples.filter(r => hasStatus(r, "U")).length;

    // Get critical issues
    const critical = rowObjects.filter(r => hasStatus(r, "C"));

    // Calculate overall stats
    const totalApproved = rowObjects.filter(r => hasStatus(r, "A")).length;
    const totalUnderReview = rowObjects.filter(r => hasStatus(r, "U")).length;
    const totalRejected = rowObjects.filter(r => hasStatus(r, "R")).length;
    const overallApprovalRate = allRows.length > 0 ? Math.round((totalApproved / allRows.length) * 100) : 0;

    return {
      statsCards: {
        totalDocuments: allRows.length,
        drawings: drawings.length,
        technical: technical.length,
        samples: samples.length,
        approved: totalApproved,
        underReview: totalUnderReview,
        rejected: totalRejected,
        critical: critical.length,
        approvalRate: overallApprovalRate
      },
      
      drawingsSummary: {
        summaryText: "COMPLETE - AB TO BE ISSUED 29/10/2025",
        stats: {
          approved: drawingsApproved,
          underReview: drawingsUnderReview,
          rejected: drawingsRejected
        }
      },

      executiveSummary: {
        status: "On Track" as const,
        highlights: [
          `${drawings.length} total drawings`,
          `${critical.length} critical issues require attention`,
          `${overallApprovalRate}% approval rate`
        ],
        summary: "Project progressing..."
      },

      technicalSummary: {
        approved: technicalApproved,
        underReview: technicalUnderReview,
        rejected: technicalRejected,
        total: technical.length,
        approvalRate: technical.length > 0 ? Math.round((technicalApproved / technical.length) * 100) : 0,
        topSubmittals: []
      },

      sampleSummary: {
        passed: samplesApproved,
        failed: samplesRejected,
        pending: samplesUnderReview,
        total: samples.length,
        passRate: samples.length > 0 ? Math.round((samplesApproved / samples.length) * 100) : 0
      },

      scheduleSummary: {
        completed: 0,
        inProgress: 0,
        notStarted: 0,
        total: allRows.length,
        completionRate: 0
      },

      criticalIssues: {
        issues: []
      },

      plannedVsActual: {
        data: []
      },

      twoWeekLookAhead: {
        tasks: []
      },

      tidpSchedule: {
        documents: []
      },

      promoBanner: {}
    };
  }, [excelData]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 transition-opacity bg-black/25"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{
          width: '70vw',
          background: '#F7F7F6',
          borderLeft: '1px solid #E5E7EB'
        }}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
            <h3 className="text-lg font-semibold text-[#111827]">
              Premium Weekly Design Report
            </h3>
            <div className="flex items-center gap-3">
              <Button 
                onClick={() => {
                  const dashboardContainer = document.querySelector('.premium-report-content');
                  if (!dashboardContainer) return;
                  
                  const clonedContent = dashboardContainer.cloneNode(true) as HTMLElement;
                  const buttonsToRemove = clonedContent.querySelectorAll('button');
                  buttonsToRemove.forEach(btn => btn.remove());
                  
                  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>dpow.app Construction Report - ${new Date().toLocaleDateString()}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Charter:ital,wght@0,400;0,700;1,400;1,700&display=swap');
        
        body {
            font-family: 'Charter', 'Times New Roman', Times, serif;
            line-height: 1.6;
            color: #111827;
            background: white;
            margin: 0;
            padding: 40px;
            max-width: 1200px;
            margin: 0 auto;
        }
        
        h1, h2, h3, h4 {
            font-family: 'Charter', 'Times New Roman', Times, serif;
            color: #111827;
            margin-top: 2em;
            margin-bottom: 1em;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 1em 0;
            font-size: 14px;
        }
        
        th, td {
            border: 1px solid #e5e7eb;
            padding: 8px 12px;
            text-align: left;
        }
        
        th {
            background-color: #f9fafb;
            font-weight: 600;
        }
    </style>
</head>
<body>
    <h1>dpow.app Construction Report</h1>
    <p><strong>Generated:</strong> ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
    <p><strong>Project:</strong> Construction Design Management Summary</p>
    
    ${clonedContent.innerHTML}
    
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
        <p>Generated by dpow.app - Construction Design Management Platform</p>
    </div>
</body>
</html>`;
                  
                  const blob = new Blob([htmlContent], { type: 'text/html' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `dpow-report-${new Date().toISOString().split('T')[0]}.html`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  URL.revokeObjectURL(url);
                }}
                className="rounded-full px-6 py-2 bg-[#111827] text-white hover:bg-[#111827]/90"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button 
                onClick={() => {
                  const printStyles = document.createElement('style');
                  printStyles.textContent = `
                    @media print {
                      body * { visibility: hidden; }
                      .premium-report-content, .premium-report-content * { visibility: visible; }
                      .premium-report-content { 
                        position: absolute !important; 
                        left: 0 !important; 
                        top: 0 !important; 
                        width: 100% !important;
                        max-width: none !important;
                        margin: 0 !important;
                        padding: 20mm !important;
                        background: white !important;
                      }
                      @page { 
                        size: A3 landscape; 
                        margin: 0; 
                      }
                    }
                  `;
                  document.head.appendChild(printStyles);
                  window.print();
                  setTimeout(() => {
                    document.head.removeChild(printStyles);
                  }, 1000);
                }}
                className="rounded-full px-6 py-2 bg-[#111827] text-white hover:bg-[#111827]/90"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 bg-[#F7F7F6] min-h-full premium-report-content">
              <div className="max-w-7xl mx-auto px-8 bg-[#FEFCF9] rounded-lg shadow-sm">
                {/* Welcome Section */}
                <div className="mb-8 relative pt-8">
                  <div className="absolute top-4 right-4 pointer-events-none z-0">
                    <div className="text-xs text-[#111827]/10 font-medium select-none">
                      dpow.app - Digital Plan Of Work
                    </div>
                  </div>
                  
                  <div className="mb-6 relative z-10">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h1 className="text-3xl font-bold text-[#111827]">Weekly Design Report</h1>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded border">CONFIDENTIAL</span>
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded border">CURRENT</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-[#111827]/80">Report Status: <strong>Complete</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span className="text-[#111827]/80">Total Documents: <strong>{reportData.statsCards.totalDocuments}</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                          <span className="text-[#111827]/80">Last Updated: <strong>2 minutes ago</strong></span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-[#111827]/70 mt-4">
                      <div className="flex items-center gap-1">
                        <span className="font-medium">Doc No:</span>
                        <span className="font-mono bg-white px-2 py-0.5 rounded text-xs border">WDR-2024-W50</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="font-medium">Approval Rate:</span>
                        <span className="font-mono bg-white px-2 py-0.5 rounded text-xs border">{reportData.statsCards.approvalRate}%</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="font-medium">Generated:</span>
                        <span>{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="font-medium">Status:</span>
                        <span>{reportData.executiveSummary.status}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-[#111827] rounded-lg max-w-xl relative z-10">
                    <table className="w-full text-xs">
                      <tbody>
                        <tr>
                          <td className="px-1.5 py-1 font-semibold text-[#111827] w-1/2 bg-gray-50 text-xs">Project Title:</td>
                          <td className="px-1.5 py-1 text-[#111827] w-1/2 text-xs">180 Piccadilly Construction Project</td>
                        </tr>
                        <tr>
                          <td className="px-1.5 py-1 font-semibold text-[#111827] bg-gray-50 text-xs">Job Number:</td>
                          <td className="px-1.5 py-1 text-[#111827] text-xs">180PIC-JJS-XX-XX-PL-XJ-005001</td>
                        </tr>
                        <tr>
                          <td className="px-1.5 py-1 font-semibold text-[#111827] bg-gray-50 text-xs">Total Documents:</td>
                          <td className="px-1.5 py-1 text-[#111827] text-xs">{reportData.statsCards.totalDocuments}</td>
                        </tr>
                        <tr>
                          <td className="px-1.5 py-1 font-semibold text-[#111827] bg-gray-50 text-xs">Approval Rate:</td>
                          <td className="px-1.5 py-1 text-[#111827] text-xs">{reportData.statsCards.approvalRate}%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Components */}
                <StatsCards />
                
                <ExecutiveSummary 
                  status={reportData.executiveSummary.status}
                  highlights={reportData.executiveSummary.highlights}
                  summary={reportData.executiveSummary.summary}
                />

                <PromoBanner />
                <PlannedVsActualChart />
                <CriticalIssues />
                
                <DrawingsSummary 
                  summaryText={reportData.drawingsSummary.summaryText}
                  stats={reportData.drawingsSummary.stats}
                />

                <TechnicalSubmittalSummary />
                <SampleSummary />
                <ScheduleSummary />
                <TwoWeekLookAhead />
                <DocumentTIDPSchedule />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
