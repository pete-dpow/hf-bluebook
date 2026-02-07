/**
 * dpow.report - Excel Data Processing Helpers
 * 
 * Helper functions to process Excel data for premium report components
 * File: /lib/reportHelpers.ts
 */

type Row = (string | number | null)[];

interface ExcelData {
  headers: string[];
  allRows: Row[];
}

// ============================================================================
// 1. FILTER FUNCTIONS - EXACT COPY OF FREEMIUM LOGIC
// ============================================================================

/**
 * Filter rows by Type column (DR/TS/SL)
 */
export function filterByType(rows: Row[], headers: string[], type: string): Row[] {
  console.log('🔍 All headers:', headers);
  
  const typeIdx = headers.findIndex(h => String(h).trim() === "Type");
  console.log('🔍 Type column index:', typeIdx);
  
  if (typeIdx === -1) {
    console.log('❌ Type column not found');
    return [];
  }
  
  const filtered = rows.filter(row => {
    const cellValue = String(row[typeIdx] || "").trim().toUpperCase();
    return cellValue === type.toUpperCase();
  });
  
  console.log(`✅ Found ${filtered.length} rows with Type="${type}"`);
  return filtered;
}

/**
 * Filter rows by STATUS column (A/U/R/C)
 */
export function filterByStatus(rows: Row[], headers: string[], status: string): Row[] {
  const statusIdx = headers.findIndex(h => String(h).trim() === "STATUS");
  
  if (statusIdx === -1) {
    console.log('❌ STATUS column not found');
    return [];
  }
  
  return rows.filter(row => {
    const cellValue = String(row[statusIdx] || "").trim().toUpperCase();
    return cellValue === status.toUpperCase();
  });
}

/**
 * Filter rows by multiple criteria
 */
export function filterByMultiple(
  rows: Row[], 
  headers: string[], 
  filters: { column: string; value: string }[]
): Row[] {
  return rows.filter(row => {
    return filters.every(filter => {
      const colIdx = headers.findIndex(h => 
        String(h || "").toLowerCase().includes(filter.column.toLowerCase())
      );
      if (colIdx === -1) return false;
      
      const cellValue = String(row[colIdx] || "").trim().toUpperCase();
      return cellValue === filter.value.toUpperCase();
    });
  });
}

// ============================================================================
// 2. COUNT FUNCTIONS
// ============================================================================

/**
 * Count rows by Type
 */
export function countByType(rows: Row[], headers: string[], type: string): number {
  return filterByType(rows, headers, type).length;
}

/**
 * Count rows by Status
 */
export function countByStatus(rows: Row[], headers: string[], status: string): number {
  return filterByStatus(rows, headers, status).length;
}

/**
 * Get status counts for a filtered set of rows
 */
export function getStatusCounts(rows: Row[], headers: string[]) {
  const statusIdx = headers.findIndex(h => String(h).trim() === "STATUS");
  
  if (statusIdx === -1) {
    return { approved: 0, underReview: 0, rejected: 0, critical: 0 };
  }
  
  const approved = rows.filter(r => 
    String(r[statusIdx] || "").trim().toUpperCase() === "A"
  ).length;
  
  const underReview = rows.filter(r => 
    String(r[statusIdx] || "").trim().toUpperCase() === "U"
  ).length;
  
  const rejected = rows.filter(r => 
    String(r[statusIdx] || "").trim().toUpperCase() === "R"
  ).length;
  
  const critical = rows.filter(r => 
    String(r[statusIdx] || "").trim().toUpperCase() === "C"
  ).length;
  
  return { approved, underReview, rejected, critical };
}

// ============================================================================
// 3. DATE FUNCTIONS
// ============================================================================

/**
 * Parse Excel date (handles both serial numbers and date strings)
 */
export function parseDate(dateValue: any): Date | null {
  if (!dateValue) return null;
  
  // Handle Excel serial numbers (days since 1900-01-01)
  if (typeof dateValue === 'number') {
    // Excel serial date (25569 = 1970-01-01)
    const jsDate = new Date((dateValue - 25569) * 86400 * 1000);
    return isNaN(jsDate.getTime()) ? null : jsDate;
  }
  
  // Handle date strings
  if (typeof dateValue === 'string') {
    try {
      const parsed = new Date(dateValue);
      return isNaN(parsed.getTime()) ? null : parsed;
    } catch {
      return null;
    }
  }
  
  return null;
}

/**
 * Group rows by month for timeline charts
 */
export function groupByMonth(
  rows: Row[], 
  headers: string[], 
  dateColumn: string
): { month: string; count: number }[] {
  const colIdx = headers.findIndex(h => 
    String(h || "").toLowerCase().includes(dateColumn.toLowerCase())
  );
  
  if (colIdx === -1) return [];
  
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  
  const monthlyCounts = new Array(12).fill(0);
  
  rows.forEach(row => {
    const date = parseDate(row[colIdx]);
    if (date) {
      const monthIdx = date.getMonth();
      monthlyCounts[monthIdx]++;
    }
  });
  
  return months.map((month, idx) => ({
    month,
    count: monthlyCounts[idx]
  }));
}

/**
 * Filter rows for upcoming tasks (next N days)
 */
export function getUpcomingTasks(
  rows: Row[], 
  headers: string[], 
  days: number = 14
): Row[] {
  const startDateIdx = headers.findIndex(h => 
    String(h || "").toLowerCase().includes("start date")
  );
  
  if (startDateIdx === -1) return [];
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const futureDate = new Date(today);
  futureDate.setDate(futureDate.getDate() + days);
  
  return rows.filter(row => {
    const startDate = parseDate(row[startDateIdx]);
    if (!startDate) return false;
    
    return startDate >= today && startDate <= futureDate;
  }).sort((a, b) => {
    const dateA = parseDate(a[startDateIdx]);
    const dateB = parseDate(b[startDateIdx]);
    if (!dateA || !dateB) return 0;
    return dateA.getTime() - dateB.getTime();
  });
}

// ============================================================================
// 4. COMMENT FUNCTIONS
// ============================================================================

/**
 * Find the latest comment column (by date in column name)
 */
export function findLatestCommentColumn(headers: string[]): string | null {
  const commentCols = headers.filter(h => 
    /comment/i.test(String(h || ""))
  );
  
  if (commentCols.length === 0) return null;
  
  // Parse dates from column names
  const parseCommentDate = (colName: string): number => {
    const match = colName.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (!match) return 0;
    
    try {
      const day = parseInt(match[1]);
      const month = parseInt(match[2]);
      const year = parseInt(match[3]);
      return new Date(year, month - 1, day).getTime();
    } catch {
      return 0;
    }
  };
  
  // Sort by date (newest first)
  commentCols.sort((a, b) => parseCommentDate(b) - parseCommentDate(a));
  
  return commentCols[0];
}

/**
 * Get latest comment from a set of rows
 */
export function getLatestComment(
  rows: Row[], 
  headers: string[], 
  commentColumn?: string | null
): string {
  const commentCol = commentColumn || findLatestCommentColumn(headers);
  if (!commentCol) return "No comments available";
  
  const colIdx = headers.indexOf(commentCol);
  if (colIdx === -1) return "No comments available";
  
  // Find first non-empty comment
  for (const row of rows) {
    const comment = String(row[colIdx] || "").trim();
    if (comment && comment !== "") {
      return comment;
    }
  }
  
  return "No recent updates";
}

// ============================================================================
// 5. ROW TO OBJECT CONVERTER
// ============================================================================

/**
 * Convert row array to object with named properties
 */
export function rowToObject(row: Row, headers: string[]): any {
  const obj: any = {};
  headers.forEach((header, idx) => {
    obj[header] = row[idx];
  });
  return obj;
}

/**
 * Convert all rows to objects
 */
export function rowsToObjects(rows: Row[], headers: string[]): any[] {
  return rows.map(row => rowToObject(row, headers));
}

// ============================================================================
// 6. MAIN DATA PROCESSOR
// ============================================================================

/**
 * Process all Excel data for premium report components
 */
export function processReportData(excelData: ExcelData) {
  const { headers, allRows } = excelData;
  
  console.log('🔍 Processing with headers:', headers);
  
  // Get basic counts
  const totalDocuments = allRows.length;
  
  // Filter by type
  const drawings = filterByType(allRows, headers, "DR");
  const technical = filterByType(allRows, headers, "TS");
  const samples = filterByType(allRows, headers, "SL");
  
  console.log('📊 Filtered counts:', {
    drawings: drawings.length,
    technical: technical.length,
    samples: samples.length
  });
  
  // Get status counts for all documents
  const allStatusCounts = getStatusCounts(allRows, headers);
  
  // Get status counts for each type
  const drawingsStatus = getStatusCounts(drawings, headers);
  const technicalStatus = getStatusCounts(technical, headers);
  const samplesStatus = getStatusCounts(samples, headers);
  
  // Calculate approval rates
  const drawingsTotal = drawings.length || 1;
  const technicalTotal = technical.length || 1;
  const samplesTotal = samples.length || 1;
  
  const drawingsApprovalRate = Math.round((drawingsStatus.approved / drawingsTotal) * 100);
  const technicalApprovalRate = Math.round((technicalStatus.approved / technicalTotal) * 100);
  const samplesPassRate = Math.round((samplesStatus.approved / samplesTotal) * 100);
  
  // Get critical issues
  const criticalIssues = filterByStatus(allRows, headers, "C");
  
  // Calculate overall project completion
  const progressIdx = headers.findIndex(h => 
    String(h || "").toLowerCase().includes("progress")
  );
  
  let overallProgress = 0;
  if (progressIdx !== -1) {
    const progressValues = allRows
      .map(r => Number(r[progressIdx]) || 0)
      .filter(p => !isNaN(p));
    
    if (progressValues.length > 0) {
      const sum = progressValues.reduce((a, b) => a + b, 0);
      overallProgress = Math.round((sum / progressValues.length) * 100);
    }
  }
  
  // Get latest comment
  const latestCommentCol = findLatestCommentColumn(headers);
  const drawingsComment = getLatestComment(drawings, headers, latestCommentCol);
  
  // Get top 5 technical submittals
  const technicalObjects = rowsToObjects(technical.slice(0, 5), headers);
  const topTechnical = technicalObjects.map(obj => ({
    title: String(obj["Document Title"] || "Untitled"),
    rev: String(obj["Current REV"] || ""),
    status: String(obj["STATUS"] || "")
  }));
  
  // Get critical issues as objects
  const criticalObjects = rowsToObjects(criticalIssues.slice(0, 10), headers);
  const criticalIssuesList = criticalObjects.map(obj => ({
    id: String(obj["Number (6 digits)"] || ""),
    title: String(obj["Document Title"] || "Untitled"),
    type: String(obj["Type"] || ""),
    status: String(obj["STATUS"] || ""),
    comment: String(obj[latestCommentCol || ""] || "No comment"),
    overdue: Boolean(obj["OVERDUE +21 DAYS"])
  }));
  
  // Get upcoming tasks (next 14 days)
  const upcomingTasks = getUpcomingTasks(allRows, headers, 14).slice(0, 7);
  const upcomingObjects = rowsToObjects(upcomingTasks, headers);
  const upcomingTasksList = upcomingObjects.map(obj => ({
    name: String(obj["Document Title"] || "Untitled"),
    startDate: obj["Start Date"],
    endDate: obj["End Date"],
    progress: Number(obj["Progress"] || 0),
    status: String(obj["STATUS"] || "")
  }));
  
  // Get TIDP documents
  const tidpIdx = headers.findIndex(h => 
    String(h || "").toLowerCase().includes("tidp")
  );
  
  const tidpDocuments = tidpIdx !== -1 
    ? allRows.filter(r => r[tidpIdx])
    : allRows;
  
  const tidpObjects = rowsToObjects(tidpDocuments.slice(0, 20), headers);
  const tidpList = tidpObjects.map(obj => ({
    tidp: String(obj["TIDP"] || ""),
    title: String(obj["Document Title"] || "Untitled"),
    type: String(obj["Type"] || ""),
    rev: String(obj["Current REV"] || ""),
    status: String(obj["STATUS"] || ""),
    planned: obj["PLANNED"],
    actual: obj["ACTUAL DATE"],
    comment: String(obj[latestCommentCol || ""] || "")
  }));
  
  // Build planned vs actual chart data
  const plannedByMonth = groupByMonth(allRows, headers, "PLANNED");
  const actualByMonth = groupByMonth(allRows, headers, "ACTUAL DATE");
  
  const chartData = plannedByMonth.map((item, idx) => ({
    month: item.month,
    planned: item.count,
    actual: actualByMonth[idx]?.count || 0
  }));
  
  // Determine project health
  const criticalCount = criticalIssues.length;
  const overdueIdx = headers.findIndex(h => 
    String(h || "").toLowerCase().includes("overdue")
  );
  const overdueCount = overdueIdx !== -1 
    ? allRows.filter(r => r[overdueIdx]).length 
    : 0;
  
  let projectHealth: "On Track" | "Behind Schedule" | "At Risk" = "On Track";
  if (criticalCount > 10) projectHealth = "At Risk";
  else if (overdueCount > 20) projectHealth = "Behind Schedule";
  
  // Return all component data
  return {
    statsCards: {
      totalDocuments,
      drawings: drawings.length,
      technical: technical.length,
      samples: samples.length,
      approved: allStatusCounts.approved,
      underReview: allStatusCounts.underReview,
      rejected: allStatusCounts.rejected,
      critical: allStatusCounts.critical,
      approvalRate: Math.round((allStatusCounts.approved / totalDocuments) * 100)
    },
    
    drawingsSummary: {
      summaryText: drawingsComment,
      stats: {
        approved: drawingsStatus.approved,
        underReview: drawingsStatus.underReview,
        rejected: drawingsStatus.rejected
      }
    },
    
    technicalSummary: {
      approved: technicalStatus.approved,
      underReview: technicalStatus.underReview,
      rejected: technicalStatus.rejected,
      total: technical.length,
      approvalRate: technicalApprovalRate,
      topSubmittals: topTechnical
    },
    
    sampleSummary: {
      passed: samplesStatus.approved,
      failed: samplesStatus.rejected,
      pending: samplesStatus.underReview,
      total: samples.length,
      passRate: samplesPassRate
    },
    
    scheduleSummary: {
      completed: 0,
      inProgress: 0,
      notStarted: 0,
      total: totalDocuments,
      completionRate: overallProgress
    },
    
    executiveSummary: {
      status: projectHealth,
      highlights: [
        `${drawingsApprovalRate}% drawing approval rate`,
        `${criticalCount} critical issues require attention`,
        `Schedule ${overallProgress}% complete`
      ],
      summary: "Project progressing..."
    },
    
    criticalIssues: {
      issues: criticalIssuesList
    },
    
    plannedVsActual: {
      data: chartData
    },
    
    twoWeekLookAhead: {
      tasks: upcomingTasksList
    },
    
    tidpSchedule: {
      documents: tidpList
    },
    
    promoBanner: {}
  };
}

// ============================================================================
// 7. FALLBACK / DEMO DATA
// ============================================================================

/**
 * Get demo data when Excel is invalid or missing
 */
export function getDemoReportData() {
  return {
    statsCards: {
      totalDocuments: 494,
      drawings: 280,
      technical: 150,
      samples: 64,
      approved: 320,
      underReview: 120,
      rejected: 40,
      critical: 14,
      approvalRate: 65
    },
    drawingsSummary: {
      summaryText: "Demo data - upload Excel to see real comments",
      stats: {
        approved: 180,
        underReview: 85,
        rejected: 15
      }
    },
    technicalSummary: {
      approved: 80,
      underReview: 50,
      rejected: 20,
      total: 150,
      approvalRate: 53,
      topSubmittals: [
        { title: "MEP Coordination", rev: "P01", status: "A" },
        { title: "Structural Calcs", rev: "P02", status: "U" },
        { title: "Fire Strategy", rev: "P01", status: "A" },
        { title: "Facade Details", rev: "P03", status: "R" },
        { title: "HVAC Schedule", rev: "P02", status: "U" }
      ]
    },
    sampleSummary: {
      passed: 32,
      failed: 10,
      pending: 22,
      total: 64,
      passRate: 50
    },
    scheduleSummary: {
      completed: 45,
      inProgress: 120,
      notStarted: 80,
      total: 245,
      completionRate: 35
    },
    executiveSummary: {
      status: "On Track" as const,
      highlights: [
        "64% drawing approval rate",
        "15 critical issues require attention",
        "Schedule 35% complete"
      ],
      summary: "Demo data - upload Excel to see real executive summary"
    },
    criticalIssues: {
      issues: [
        { id: "005001", title: "Fire Strategy", type: "DR", status: "C", comment: "Awaiting approval", overdue: true },
        { id: "005002", title: "MEP Layouts", type: "TS", status: "C", comment: "Client review", overdue: false }
      ]
    },
    plannedVsActual: {
      data: [
        { month: "Jan", planned: 45, actual: 42 },
        { month: "Feb", planned: 52, actual: 48 },
        { month: "Mar", planned: 48, actual: 46 },
        { month: "Apr", planned: 61, actual: 58 },
        { month: "May", planned: 55, actual: 52 },
        { month: "Jun", planned: 67, actual: 65 },
        { month: "Jul", planned: 69, actual: 62 },
        { month: "Aug", planned: 72, actual: 68 },
        { month: "Sep", planned: 78, actual: 75 }
      ]
    },
    twoWeekLookAhead: {
      tasks: [
        { name: "Fire Strategy Approval", startDate: "2025-11-29", endDate: "2025-12-05", progress: 0, status: "U" },
        { name: "MEP Coordination", startDate: "2025-12-02", endDate: "2025-12-10", progress: 0.3, status: "U" }
      ]
    },
    tidpSchedule: {
      documents: [
        { tidp: "A-001", title: "Site Plan", type: "DR", rev: "P02", status: "A", planned: "2025-01-15", actual: "2025-01-18", comment: "Approved" }
      ]
    },
    promoBanner: {}
  };
}
