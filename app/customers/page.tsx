"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  Loader2, Users, FileText, PoundSterling, Repeat,
  Search, TrendingUp, Download, ChevronLeft, ChevronRight,
} from "lucide-react";

const fontInter = { fontFamily: "var(--font-inter)" };

interface Customer {
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  quote_count: number;
  total_value: number;
  last_quote_date: string;
  statuses: string[];
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-50 text-gray-500 border-gray-200",
  sent: "bg-blue-50 text-blue-700 border-blue-200",
  approved: "bg-green-50 text-green-700 border-green-200",
  rejected: "bg-red-50 text-red-600 border-red-200",
  cancelled: "bg-gray-100 text-gray-500 border-gray-200",
};

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [dense, setDense] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadCustomers();
  }, []);

  async function loadCustomers(searchTerm?: string) {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/auth"); return; }

    const params = new URLSearchParams();
    if (searchTerm) params.set("search", searchTerm);

    const res = await fetch(`/api/customers?${params}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (res.ok) {
      const data = await res.json();
      setCustomers(data.customers || []);
    }
    setLoading(false);
  }

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadCustomers(value), 300);
  }

  const totalClients = customers.length;
  const activeQuotes = customers.reduce((sum, c) => sum + c.quote_count, 0);
  const totalValue = customers.reduce((sum, c) => sum + c.total_value, 0);
  const repeatClients = customers.filter((c) => c.quote_count > 1).length;

  const totalPages = Math.ceil(customers.length / rowsPerPage);
  const paginatedCustomers = customers.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  function formatDate(d: string): string {
    if (!d) return "\u2014";
    return new Date(d).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <div className="min-h-screen bg-[#FCFCFA] p-8" style={{ marginLeft: "64px", ...fontInter }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
              <Users size={18} className="text-gray-600" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Customers</h1>
              <p className="text-xs text-gray-500">
                {totalClients} client{totalClients !== 1 ? "s" : ""} across all quotes
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              const csv = ["Name,Email,Phone,Quotes,Total Value,Last Activity"];
              customers.forEach((c) => {
                csv.push([
                  c.client_name,
                  c.client_email || "",
                  c.client_phone || "",
                  c.quote_count,
                  c.total_value.toFixed(2),
                  c.last_quote_date || "",
                ].join(","));
              });
              const blob = new Blob([csv.join("\n")], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "customers.csv";
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-orange-600 border border-orange-200 rounded-lg hover:bg-orange-50 transition"
          >
            <Download size={16} />
            Export
          </button>
        </div>

        {/* Stats Cards */}
        {!loading && customers.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white border border-gray-200 rounded-xl p-4 relative overflow-hidden">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Clients</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">{totalClients}</div>
              <div className="flex items-center gap-1 mt-1 text-xs text-blue-600">
                <TrendingUp size={12} />
                <span>All time</span>
              </div>
              <div className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <Users size={16} className="text-blue-500" />
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4 relative overflow-hidden">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Quotes</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">{activeQuotes}</div>
              <div className="flex items-center gap-1 mt-1 text-xs text-green-600">
                <FileText size={12} />
                <span>Across all clients</span>
              </div>
              <div className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                <FileText size={16} className="text-green-500" />
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4 relative overflow-hidden">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Value</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">
                {"\u00A3"}{totalValue.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </div>
              <div className="flex items-center gap-1 mt-1 text-xs text-amber-600">
                <PoundSterling size={12} />
                <span>Pipeline value</span>
              </div>
              <div className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                <PoundSterling size={16} className="text-amber-500" />
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4 relative overflow-hidden">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Repeat Clients</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">{repeatClients}</div>
              <div className="flex items-center gap-1 mt-1 text-xs text-purple-600">
                <Repeat size={12} />
                <span>{totalClients > 0 ? Math.round((repeatClients / totalClients) * 100) : 0}% retention</span>
              </div>
              <div className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                <Repeat size={16} className="text-purple-500" />
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {/* Search bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search customers..."
                className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-blue-400 w-56"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : customers.length === 0 ? (
            <div className="text-center py-16">
              <Users size={32} className="mx-auto text-gray-300 mb-3" />
              <p className="text-sm text-gray-500 mb-1">No customers yet</p>
              <p className="text-xs text-gray-400">Customers will appear here once you create quotes</p>
            </div>
          ) : (
            <>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Customer</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Email</th>
                    <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500">Quotes</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500">Total Value</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Last Activity</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedCustomers.map((c, idx) => (
                    <tr
                      key={idx}
                      onClick={() => router.push(`/quotes?search=${encodeURIComponent(c.client_name)}`)}
                      className="border-b border-gray-50 hover:bg-gray-50/80 cursor-pointer transition"
                    >
                      <td className={`px-4 ${dense ? "py-2" : "py-3"}`}>
                        <div className="text-sm font-medium text-gray-900">{c.client_name}</div>
                        {c.client_phone && (
                          <div className="text-xs text-gray-400">{c.client_phone}</div>
                        )}
                      </td>
                      <td className={`px-4 ${dense ? "py-2" : "py-3"} text-sm text-gray-500`}>
                        {c.client_email || "\u2014"}
                      </td>
                      <td className={`px-4 ${dense ? "py-2" : "py-3"} text-sm text-gray-900 text-center`}>
                        {c.quote_count}
                      </td>
                      <td className={`px-4 ${dense ? "py-2" : "py-3"} text-sm text-gray-900 text-right`}>
                        {"\u00A3"}{c.total_value.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className={`px-4 ${dense ? "py-2" : "py-3"} text-sm text-gray-500`}>
                        {formatDate(c.last_quote_date)}
                      </td>
                      <td className={`px-4 ${dense ? "py-2" : "py-3"}`}>
                        <div className="flex flex-wrap gap-1">
                          {c.statuses.map((s) => (
                            <span
                              key={s}
                              className={`px-2 py-0.5 text-xs font-medium rounded-full border capitalize ${STATUS_COLORS[s] || "bg-gray-100 text-gray-600 border-gray-200"}`}
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination Bar */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setDense(!dense)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${dense ? "bg-gray-800" : "bg-gray-300"}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${dense ? "translate-x-5" : ""}`} />
                  </button>
                  <span className="text-xs text-gray-500">Dense</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>Rows per page:</span>
                    <select
                      value={rowsPerPage}
                      onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(1); }}
                      className="border border-gray-200 rounded px-1 py-0.5 text-xs bg-white"
                    >
                      {[6, 8, 10, 20, 50].map((n) => <option key={n} value={n}>{String(n).padStart(2, "0")}</option>)}
                    </select>
                  </div>
                  <span className="text-xs text-gray-500">
                    {customers.length > 0
                      ? `${(page - 1) * rowsPerPage + 1}-${Math.min(page * rowsPerPage, customers.length)} of ${customers.length}`
                      : "0 items"}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 transition"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 transition"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
