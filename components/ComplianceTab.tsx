"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ShieldCheck, Loader2, CheckCircle2 } from "lucide-react";

const CATEGORY_COLORS: Record<string, string> = {
  legislation: "bg-purple-50 text-purple-700",
  approved_document: "bg-blue-50 text-blue-700",
  british_standard: "bg-emerald-50 text-emerald-700",
  european_standard: "bg-amber-50 text-amber-700",
  industry_guidance: "bg-gray-100 text-gray-600",
};

const CATEGORY_LABELS: Record<string, string> = {
  legislation: "Legislation",
  approved_document: "Approved Document",
  british_standard: "British Standard",
  european_standard: "European Standard",
  industry_guidance: "Industry Guidance",
};

interface ComplianceTabProps {
  quoteId: string;
}

interface ComplianceRegulation {
  regulation: {
    id: string;
    name: string;
    reference: string;
    category: string;
    status: string;
  };
  products: {
    id: string;
    product_name: string;
    product_code: string;
    compliance_notes: string | null;
    test_evidence_ref: string | null;
  }[];
}

export default function ComplianceTab({ quoteId }: ComplianceTabProps) {
  const [regulations, setRegulations] = useState<ComplianceRegulation[]>([]);
  const [productsChecked, setProductsChecked] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCompliance();
  }, [quoteId]);

  async function loadCompliance() {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch(`/api/quotes/${quoteId}/compliance`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (res.ok) {
      const data = await res.json();
      setRegulations(data.regulations || []);
      setProductsChecked(data.products_checked || 0);
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-medium text-gray-900" style={{ fontFamily: "var(--font-ibm-plex)" }}>
            Compliance Coverage
          </h2>
          <span className="text-xs text-gray-500" style={{ fontFamily: "var(--font-ibm-plex)" }}>
            {productsChecked} product{productsChecked !== 1 ? "s" : ""} checked
          </span>
        </div>
      </div>

      {regulations.length === 0 ? (
        <div className="text-center py-8 px-6">
          <ShieldCheck size={28} className="mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-400" style={{ fontFamily: "var(--font-ibm-plex)" }}>
            {productsChecked === 0
              ? "No catalog products in this quote"
              : "No regulation links found for quoted products"}
          </p>
          <p className="text-xs text-gray-400 mt-1" style={{ fontFamily: "var(--font-ibm-plex)" }}>
            Link regulations to products in the Products section
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {regulations.map((item) => (
            <div key={item.regulation.id} className="px-6 py-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-900" style={{ fontFamily: "var(--font-ibm-plex)" }}>
                      {item.regulation.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-gray-500" style={{ fontFamily: "var(--font-ibm-plex)" }}>
                      {item.regulation.reference}
                    </span>
                    <span className={`px-1.5 py-0.5 text-xs rounded ${CATEGORY_COLORS[item.regulation.category] || "bg-gray-100 text-gray-600"}`}>
                      {CATEGORY_LABELS[item.regulation.category] || item.regulation.category}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {item.products.map((p) => (
                      <span
                        key={p.id}
                        className="px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded"
                        title={p.compliance_notes || undefined}
                      >
                        {p.product_code || p.product_name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
