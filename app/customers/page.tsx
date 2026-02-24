"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2, Users, FileText, PoundSterling, Repeat } from "lucide-react";

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
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-blue-50 text-blue-700",
  approved: "bg-green-50 text-green-700",
  rejected: "bg-red-50 text-red-600",
  cancelled: "bg-gray-100 text-gray-500",
};

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
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
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadCustomers(value), 300);
  }

  const totalClients = customers.length;
  const activeQuotes = customers.reduce((sum, c) => sum + c.quote_count, 0);
  const totalValue = customers.reduce((sum, c) => sum + c.total_value, 0);
  const repeatClients = customers.filter((c) => c.quote_count > 1).length;

  function formatDate(d: string): string {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <div className="min-h-screen bg-[#FCFCFA] p-8" style={{ marginLeft: "64px" }}>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl" style={{ fontFamily: "var(--font-cormorant)", fontWeight: 500, color: "#2A2A2A" }}>
              Customers
            </h1>
            <p className="text-sm text-gray-500 mt-1" style={{ fontFamily: "var(--font-ibm-plex)" }}>
              {totalClients} client{totalClients !== 1 ? "s" : ""} across all quotes
            </p>
          </div>
        </div>

        {/* Stats Row */}
        {!loading && customers.length > 0 && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Users size={16} className="text-blue-600" />
                <span className="text-sm text-gray-500" style={{ fontFamily: "var(--font-ibm-plex)" }}>Total Clients</span>
              </div>
              <p className="text-2xl font-medium text-gray-900" style={{ fontFamily: "var(--font-ibm-plex)" }}>{totalClients}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <FileText size={16} className="text-blue-600" />
                <span className="text-sm text-gray-500" style={{ fontFamily: "var(--font-ibm-plex)" }}>Total Quotes</span>
              </div>
              <p className="text-2xl font-medium text-gray-900" style={{ fontFamily: "var(--font-ibm-plex)" }}>{activeQuotes}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <PoundSterling size={16} className="text-blue-600" />
                <span className="text-sm text-gray-500" style={{ fontFamily: "var(--font-ibm-plex)" }}>Total Value</span>
              </div>
              <p className="text-2xl font-medium text-gray-900" style={{ fontFamily: "var(--font-ibm-plex)" }}>
                £{totalValue.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Repeat size={16} className="text-purple-600" />
                <span className="text-sm text-gray-500" style={{ fontFamily: "var(--font-ibm-plex)" }}>Repeat Clients</span>
              </div>
              <p className="text-2xl font-medium text-gray-900" style={{ fontFamily: "var(--font-ibm-plex)" }}>{repeatClients}</p>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search customers..."
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 w-64"
            style={{ fontFamily: "var(--font-ibm-plex)" }}
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-16">
            <Users size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 mb-2" style={{ fontFamily: "var(--font-ibm-plex)" }}>
              No customers yet
            </p>
            <p className="text-sm text-gray-400" style={{ fontFamily: "var(--font-ibm-plex)" }}>
              Customers will appear here once you create quotes
            </p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase" style={{ fontFamily: "var(--font-ibm-plex)" }}>Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase" style={{ fontFamily: "var(--font-ibm-plex)" }}>Email</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase" style={{ fontFamily: "var(--font-ibm-plex)" }}>Quotes</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase" style={{ fontFamily: "var(--font-ibm-plex)" }}>Total Value</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase" style={{ fontFamily: "var(--font-ibm-plex)" }}>Last Activity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase" style={{ fontFamily: "var(--font-ibm-plex)" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c, idx) => (
                  <tr
                    key={idx}
                    onClick={() => router.push(`/quotes?search=${encodeURIComponent(c.client_name)}`)}
                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition"
                  >
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900" style={{ fontFamily: "var(--font-ibm-plex)" }}>
                        {c.client_name}
                      </div>
                      {c.client_phone && (
                        <div className="text-xs text-gray-400" style={{ fontFamily: "var(--font-ibm-plex)" }}>
                          {c.client_phone}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500" style={{ fontFamily: "var(--font-ibm-plex)" }}>
                      {c.client_email || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-center" style={{ fontFamily: "var(--font-ibm-plex)" }}>
                      {c.quote_count}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right" style={{ fontFamily: "var(--font-ibm-plex)" }}>
                      £{c.total_value.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500" style={{ fontFamily: "var(--font-ibm-plex)" }}>
                      {formatDate(c.last_quote_date)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {c.statuses.map((s) => (
                          <span
                            key={s}
                            className={`px-2 py-0.5 text-xs rounded-full capitalize ${STATUS_COLORS[s] || "bg-gray-100 text-gray-600"}`}
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
          </div>
        )}
      </div>
    </div>
  );
}
