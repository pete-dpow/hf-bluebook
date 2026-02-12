"use client";

import { Clock, CheckCircle, XCircle, Globe } from "lucide-react";

interface SupplierRequestCardProps {
  request: {
    id: string;
    supplier_name: string;
    supplier_website?: string;
    reason?: string;
    status: string;
    created_at: string;
    rejected_reason?: string;
  };
  isAdmin: boolean;
  onApprove?: (id: string) => void;
  onReject?: (id: string, reason: string) => void;
}

export default function SupplierRequestCard({ request, isAdmin, onApprove, onReject }: SupplierRequestCardProps) {
  const statusConfig: Record<string, { icon: React.ReactNode; color: string }> = {
    pending: { icon: <Clock size={14} />, color: "bg-amber-50 text-amber-700" },
    approved: { icon: <CheckCircle size={14} />, color: "bg-green-50 text-green-700" },
    rejected: { icon: <XCircle size={14} />, color: "bg-red-50 text-red-600" },
    completed: { icon: <CheckCircle size={14} />, color: "bg-blue-50 text-blue-700" },
  };

  const { icon, color } = statusConfig[request.status] || statusConfig.pending;

  return (
    <div className="p-4 border border-gray-200 rounded-lg bg-white">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="text-sm font-medium text-gray-900" style={{ fontFamily: "var(--font-ibm-plex)" }}>
            {request.supplier_name}
          </h4>
          {request.supplier_website && (
            <div className="flex items-center gap-1 mt-0.5">
              <Globe size={12} className="text-gray-400" />
              <span className="text-xs text-gray-500">{request.supplier_website}</span>
            </div>
          )}
        </div>
        <span className={`flex items-center gap-1 px-2 py-0.5 text-xs rounded-full ${color}`}>
          {icon}
          {request.status}
        </span>
      </div>

      {request.reason && (
        <p className="mt-2 text-sm text-gray-600" style={{ fontFamily: "var(--font-ibm-plex)" }}>
          {request.reason}
        </p>
      )}

      {request.rejected_reason && (
        <p className="mt-2 text-sm text-red-600" style={{ fontFamily: "var(--font-ibm-plex)" }}>
          Rejected: {request.rejected_reason}
        </p>
      )}

      {isAdmin && request.status === "pending" && (
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => onApprove?.(request.id)}
            className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition"
          >
            Approve
          </button>
          <button
            onClick={() => {
              const reason = prompt("Rejection reason:");
              if (reason) onReject?.(request.id, reason);
            }}
            className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition"
          >
            Reject
          </button>
        </div>
      )}

      <p className="mt-2 text-xs text-gray-400" style={{ fontFamily: "var(--font-ibm-plex)" }}>
        {new Date(request.created_at).toLocaleDateString("en-GB")}
      </p>
    </div>
  );
}
