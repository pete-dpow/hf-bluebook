export const ABBREVIATION_TABLE: Record<string, string> = {
  'BD': 'Basis of Design',
  'BR': 'Brief',
  'CB': 'Cost Benchmarking',
  'CD': 'Cost Document',
  'CF': 'Final Account',
  'CH': 'Change Management',
  'CI': 'Cost – Insurance',
  'CM': 'Commissioning',
  'CO': 'Correspondence',
  'CP': 'Cost Planning',
  'CR': 'Cost Report',
  'CS': 'Co-ordinated Services',
  'DE': 'Drawing – Detail',
  'DI': 'Design & Implementation Standard',
  'DR': 'Drawing',
  'DS': 'Delivery Specification',
  'EC': 'External Compliance',
  'ES': 'Equipment Schedule',
  'FB': 'Fabrication',
  'GA': 'Drawing – General Arrangement',
  'IM': 'Interface Management',
  'KN': 'Knowledge',
  'LD': 'Legal',
  'LS': 'Linear Schedule',
  'M2': '2D Model',
  'M3': '3D Model',
  'ME': 'Meeting Minutes',
  'ML': 'Manufacturers Literature',
  'OM': 'Operation & Maintenance',
  'PD': 'Survey Requirement',
  'PI': 'Photograph',
  'PM': 'Performance Report',
  'PR': 'Procedure',
  'PT': 'Procurement & Tendering',
  'PY': 'Payment Certificate',
  'QU': 'Quality',
  'RD': 'Room Data Sheet',
  'RI': 'Request for Information',
  'RG': 'Request for Information',
  'RO': 'Risk and Opportunity',
  'RP': 'Report – Periodic',
  'SC': 'Drawing – Line Diagram Schematic',
  'SE': 'Drawing – Section',
  'SK': 'Drawing – Sketch',
  'SR': 'Site Record',
  'SS': 'Drawing – Single Service',
  'ST': 'ITPP System Testing',
  'SY': 'Safety',
  'TA': 'Technical Approval',
  'TD': 'Technical Detail',
  'TQ': 'Technical Query',
  'TR': 'Technical Review',
  'TS': 'Technical Submittal',
  'TW': 'Drawing – Temporary Works',
  'VM': 'Volume Management',
  'WP': 'Working Procedure',
  'N/A': 'None applicable'
};

export const INDUSTRY_DEFINITIONS: Record<string, string> = {
  'Status A': 'Approved for use – no further action required.',
  'Status B': 'Approved with comments – subject to minor revision; monitor for reissue risk.',
  'Status C': 'Commented / Not Approved – design or coordination issue; high risk if unresolved.',
  'Status D': 'For Record Only – informational issue, no review required.',
  'IFT': 'Issued For Tender – pre-contract design deliverable.',
  'IFC': 'Issued For Construction – finalised for site issue.',
  'QA Rejected': 'Failed quality assurance; rework immediately required.',
  'Sprint': 'Short-term programme delivery window, typically one to two weeks.',
  'Programme Impact': 'Delay or cost exposure resulting from unresolved deliverables or late approvals.',
  'Blocker': 'Critical unresolved issue preventing progress.'
};

export function expandAbbreviations(text: string): string {
  if (!text) return text;

  let expanded = String(text);

  for (const [abbr, meaning] of Object.entries(ABBREVIATION_TABLE)) {
    const patterns = [
      new RegExp(`\\b${abbr}\\b`, 'gi'),
      new RegExp(`\\(${abbr}\\)`, 'gi'),
      new RegExp(`^${abbr}\\s`, 'gi'),
      new RegExp(`\\s${abbr}$`, 'gi'),
      new RegExp(`\\s${abbr}\\s`, 'gi'),
    ];

    for (const pattern of patterns) {
      expanded = expanded.replace(pattern, (match) => {
        const hasParens = match.includes('(');
        const prefix = match.match(/^\s+/)?.[0] || '';
        const suffix = match.match(/\s+$/)?.[0] || '';

        if (hasParens) {
          return `(${meaning})`;
        }
        return `${prefix}${meaning}${suffix}`;
      });
    }
  }

  return expanded;
}

export function cleanDatasetRow(row: Record<string, any>): Record<string, any> {
  const cleaned: Record<string, any> = {};

  for (const [key, value] of Object.entries(row)) {
    if (typeof value === 'string') {
      cleaned[key] = expandAbbreviations(value);
    } else {
      cleaned[key] = value;
    }
  }

  return cleaned;
}

export const LEXICON_SYSTEM_CONTEXT = `You are interpreting design and construction project data. Before summarising, expand all abbreviations into their full professional meanings. Never include shorthand codes in your response. The COMMENTS column is the authoritative source for reasons — abbreviations inside comments must be expanded for clarity. Always write in complete, plain professional language suitable for senior stakeholders.

KEY ABBREVIATIONS (auto-expanded in data, but understand these):
- DR = Drawing
- GA = Drawing – General Arrangement
- SK = Drawing – Sketch
- Status A = Approved for use
- Status B = Approved with comments (monitor for reissue risk)
- Status C = Commented / Not Approved (design/coordination issue, high risk)
- Status D = For Record Only
- IFT = Issued For Tender
- IFC = Issued For Construction

INDUSTRY TERMS:
- Sprint: Short-term programme delivery window (1-2 weeks)
- Programme Impact: Delay/cost exposure from unresolved deliverables
- Blocker: Critical unresolved issue preventing progress`;
