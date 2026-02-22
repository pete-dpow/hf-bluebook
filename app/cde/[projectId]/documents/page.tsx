"use client";

// Documents page — Aconex-pattern layout per v5 HTML
// Full-height split: sub-header + toolbar + (filter panel + grid) + status bar

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import DocsSubHeader from "@/components/cde/DocsSubHeader";
import DocumentToolbar from "@/components/cde/DocumentToolbar";
import FilterPanel from "@/components/cde/FilterPanel";
import DocumentGrid from "@/components/cde/DocumentGrid";
import StatusBar from "@/components/cde/StatusBar";
import DocumentDetail from "@/components/cde/DocumentDetail";
import UploadModal from "@/components/cde/UploadModal";

interface Filters {
  search: string;
  docTypes: string[];
  status: string;
  discipline: string;
  building: string;
}

export default function DocumentsPage() {
  const routeParams = useParams();
  const projectId = routeParams.projectId as string;

  const [documents, setDocuments] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState("uploaded_at");
  const [sortDir, setSortDir] = useState("desc");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [projectCode, setProjectCode] = useState("");
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState<Filters>({
    search: "",
    docTypes: [],
    status: "",
    discipline: "",
    building: "",
  });

  // Status counts for sub-header
  const [statusCounts, setStatusCounts] = useState({ S0: 0, S1: 0, S3: 0, S4: 0, A: 0, C: 0 });

  // Load project info
  useEffect(() => {
    async function loadProject() {
      const { data } = await supabase
        .from("cde_projects")
        .select("project_code")
        .eq("id", projectId)
        .single();
      if (data) setProjectCode(data.project_code);
    }
    loadProject();
  }, [projectId]);

  // Load documents
  const loadDocuments = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const queryParams = new URLSearchParams({
      projectId,
      page: String(page),
      limit: "50",
      sortBy,
      sortDir,
    });

    if (filters.search) queryParams.set("search", filters.search);
    if (filters.status) queryParams.set("status", filters.status);
    if (filters.discipline) queryParams.set("discipline", filters.discipline);
    if (filters.building) queryParams.set("building", filters.building);
    if (filters.docTypes.length > 0) queryParams.set("docType", filters.docTypes[0]);

    const res = await fetch(`/api/cde/documents?${queryParams}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (res.ok) {
      const data = await res.json();
      setDocuments(data.documents);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    }
    setLoading(false);
  }, [projectId, page, sortBy, sortDir, filters]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Load status counts
  useEffect(() => {
    async function loadCounts() {
      const codes = ["S0", "S1", "S3", "S4", "A", "C"] as const;
      const results = await Promise.all(
        codes.map((code) =>
          supabase
            .from("cde_documents")
            .select("id", { count: "exact", head: true })
            .eq("project_id", projectId)
            .eq("status", code)
        )
      );
      const counts = { S0: 0, S1: 0, S3: 0, S4: 0, A: 0, C: 0 };
      codes.forEach((code, i) => {
        counts[code] = results[i].count || 0;
      });
      setStatusCounts(counts);
    }
    loadCounts();
  }, [projectId, documents]);

  function handleSort(column: string) {
    if (sortBy === column) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortDir("asc");
    }
    setPage(1);
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function selectAll() {
    if (selectedIds.length === documents.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(documents.map((d) => d.id));
    }
  }

  // Get unique buildings for filter
  const buildings = Array.from(new Set(documents.map((d) => d.building).filter(Boolean)));

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Sub-header */}
      <DocsSubHeader
        totalDocs={total}
        statusCounts={statusCounts}
        syncPending={documents.filter((d) => d.needs_metadata).length}
      />

      {/* Toolbar */}
      <DocumentToolbar
        projectId={projectId}
        onUploadClick={() => setShowUpload(true)}
        onFilterToggle={() => setShowFilters(!showFilters)}
        onRefresh={loadDocuments}
        filterActive={showFilters}
        selectedCount={selectedIds.length}
      />

      {/* Main split: filters + grid */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {showFilters && (
          <FilterPanel
            filters={filters}
            onChange={(f) => { setFilters(f); setPage(1); }}
            buildings={buildings}
          />
        )}

        <DocumentGrid
          documents={documents}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onSelectAll={selectAll}
          onRowClick={(doc) => setDetailId(doc.id)}
          sortBy={sortBy}
          sortDir={sortDir}
          onSort={handleSort}
        />
      </div>

      {/* Status bar */}
      <StatusBar
        shown={documents.length}
        total={total}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />

      {/* Detail slide-out */}
      <DocumentDetail
        documentId={detailId}
        onClose={() => setDetailId(null)}
      />

      {/* Upload modal */}
      {showUpload && (
        <UploadModal
          projectId={projectId}
          projectCode={projectCode}
          onClose={() => setShowUpload(false)}
          onUploaded={loadDocuments}
        />
      )}
    </div>
  );
}
