"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Check, X } from "lucide-react";

type PlanType = "free" | "standard" | "professional" | "bundle";
type BillingCycle = "monthly" | "yearly";

export default function PricingPage() {
  const router = useRouter();
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const [user, setUser] = useState<any>(null);
  const [subscriptionTier, setSubscriptionTier] = useState<string>("free");
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("yearly");

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      setMousePos({ x, y });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    checkAuth();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        loadSubscriptionTier(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user || null);
    
    if (session?.user) {
      loadSubscriptionTier(session.user.id);
    }
  }

  async function loadSubscriptionTier(userId: string) {
    const { data } = await supabase
      .from("users")
      .select("subscription_tier")
      .eq("id", userId)
      .single();
    
    if (data) {
      setSubscriptionTier(data.subscription_tier || "free");
    }
  }

  async function handleUpgrade(tier: string) {
    if (!user) {
      router.push("/");
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert("Please sign in first");
        router.push("/");
        return;
      }

      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tier: tier,
          billingCycle: billingCycle,
          token: session.access_token,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error("Upgrade error:", error);
      alert(`❌ ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  function openModal(plan: PlanType) {
    setSelectedPlan(plan);
  }

  function closeModal() {
    setSelectedPlan(null);
  }

  const getPricing = (monthly: number) => {
    if (billingCycle === "yearly") {
      return {
        price: Math.floor(monthly * 12 * 0.85),
        period: "/year",
        savings: Math.floor(monthly * 12 * 0.15),
      };
    }
    return {
      price: monthly,
      period: "/month",
      savings: 0,
    };
  };

  const standardPrice = getPricing(25);
  const professionalPrice = getPricing(90);

  return (
    <div className="min-h-screen p-8 relative overflow-hidden" style={{ background: "#FCFCFA" }}>
      {/* Mouse tracker gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%, rgba(37,99,235,0.08), transparent 60%)`,
          zIndex: 0,
        }}
      />

      {/* Content */}
      <div className="w-full max-w-7xl mx-auto relative z-10 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-7xl mb-4" style={{ fontFamily: "var(--font-cormorant)", fontWeight: 500, letterSpacing: "0.01em", color: "#2A2A2A" }}>
            Choose Your Plan
          </h1>
          <p className="text-xl mb-12" style={{ fontFamily: "var(--font-ibm-plex)", color: "#6B7280" }}>
            Start free, upgrade as you grow
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-3 bg-white rounded-full p-1.5 shadow-sm border-[3px] border-gray-200">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-8 py-3 rounded-full text-sm font-semibold transition-all ${billingCycle === "monthly" ? "bg-[#2A2A2A] text-white" : "text-gray-600 hover:text-gray-900"}`}
              style={{ fontFamily: "var(--font-ibm-plex)" }}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`px-8 py-3 rounded-full text-sm font-semibold transition-all relative ${billingCycle === "yearly" ? "bg-[#2A2A2A] text-white" : "text-gray-600 hover:text-gray-900"}`}
              style={{ fontFamily: "var(--font-ibm-plex)" }}
            >
              Yearly
              <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2.5 py-1 rounded-full font-bold">Save 15%</span>
            </button>
          </div>
        </div>

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* Free Card */}
          <PricingCard
            title="Free"
            price="£0"
            period="/forever"
            description="Try hf.bluebook instantly"
            features={["1 project", "3 files per project", "Basic AI chat", "Excel file upload", "Web interface only"]}
            buttonText="Try Free"
            onClick={() => openModal("free")}
            isCurrent={subscriptionTier === "free"}
          />

          {/* Standard Card */}
          <PricingCard
            title="Standard"
            price={`£${standardPrice.price}`}
            period={standardPrice.period}
            description="For project directors"
            features={["3 projects", "5 files per project", "WhatsApp integration", "M365 file import", "Hybrid AI intelligence", "Multi-org support"]}
            savings={standardPrice.savings > 0 ? `Save £${standardPrice.savings}` : undefined}
            buttonText="Upgrade"
            onClick={() => openModal("standard")}
            isCurrent={subscriptionTier === "standard"}
            isPopular
          />

          {/* Professional Card */}
          <PricingCard
            title="Professional"
            price={`£${professionalPrice.price}`}
            period={professionalPrice.period}
            description="For growing teams"
            features={["Unlimited projects", "Unlimited files", "Everything in Standard", "Priority support", "Higher token limits", "Advanced analytics"]}
            savings={professionalPrice.savings > 0 ? `Save £${professionalPrice.savings}` : undefined}
            buttonText="Upgrade"
            onClick={() => openModal("professional")}
            isCurrent={subscriptionTier === "professional"}
          />

          {/* Bundle Card */}
          <PricingCard
            title="PWA Bundle"
            price="£2,598"
            period="/year"
            description="All 8 DPoW.ai apps"
            features={["hf.bluebook + 7 more", "Complete ecosystem", "Everything included", "Best value for teams", "Priority support", "Coming Q1 2026"]}
            buttonText="Learn More"
            onClick={() => openModal("bundle")}
            highlight
          />
        </div>

        {/* Bottom Note */}
        <div className="text-center">
          <p className="text-base" style={{ fontFamily: "var(--font-ibm-plex)", color: "#6B7280" }}>
            All plans include a <strong>full refund</strong> for unused months if you cancel. <span className="text-[#2563EB] cursor-pointer hover:underline font-semibold">Learn more</span>
          </p>
        </div>
      </div>

      {/* Modals */}
      {selectedPlan && (
        <PlanModal
          plan={selectedPlan}
          billingCycle={billingCycle}
          onClose={closeModal}
          onUpgrade={handleUpgrade}
          loading={loading}
          subscriptionTier={subscriptionTier}
        />
      )}
    </div>
  );
}

function PricingCard({
  title,
  price,
  period,
  description,
  features,
  savings,
  buttonText,
  onClick,
  isCurrent = false,
  isPopular = false,
  highlight = false,
}: {
  title: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  savings?: string;
  buttonText: string;
  onClick: () => void;
  isCurrent?: boolean;
  isPopular?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-3xl shadow-lg p-10 transition-all cursor-pointer hover:shadow-xl relative ${
        isCurrent
          ? "border-[3px] border-[#2563EB]"
          : highlight
          ? "border-[3px] border-[#2A2A2A]"
          : "border-[3px] border-gray-200 hover:border-gray-300"
      }`}
    >
      {/* Popular Badge */}
      {isPopular && !isCurrent && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <div className="px-4 py-1.5 rounded-full text-xs font-bold" style={{ fontFamily: "var(--font-ibm-plex)", background: "#2A2A2A", color: "white" }}>
            MOST POPULAR
          </div>
        </div>
      )}

      {/* Current Badge */}
      {isCurrent && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <div className="px-4 py-1.5 rounded-full text-xs font-bold" style={{ fontFamily: "var(--font-ibm-plex)", background: "#2563EB", color: "white" }}>
            CURRENT PLAN
          </div>
        </div>
      )}

      <div className="mb-6">
        {/* Plan Name */}
        <h3 className="text-2xl font-medium mb-3" style={{ fontFamily: "var(--font-cormorant)", color: "#2A2A2A" }}>
          {title}
        </h3>

        {/* Price */}
        <div className="mb-3">
          <span className="text-5xl font-medium" style={{ fontFamily: "var(--font-cormorant)", color: "#2A2A2A" }}>
            {price}
          </span>
          <span className="text-lg text-gray-600" style={{ fontFamily: "var(--font-ibm-plex)" }}>
            {period}
          </span>
        </div>

        {/* Savings Badge */}
        {savings && (
          <div className="mb-3">
            <span className="inline-block px-3 py-1 rounded-full text-sm font-bold" style={{ fontFamily: "var(--font-ibm-plex)", background: "rgba(34, 197, 94, 0.15)", color: "#16A34A" }}>
              {savings}
            </span>
          </div>
        )}

        {/* Description */}
        <p className="text-sm text-gray-600 mb-6 pb-6 border-b-2 border-gray-100" style={{ fontFamily: "var(--font-ibm-plex)" }}>
          {description}
        </p>

        {/* Features */}
        <div className="space-y-3 mb-8">
          {features.map((feature, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center mt-0.5">
                <Check className="w-3 h-3 text-gray-700" strokeWidth={3} />
              </div>
              <span className="text-sm text-gray-700 leading-relaxed" style={{ fontFamily: "var(--font-ibm-plex)" }}>
                {feature}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Button */}
      <button
        className={`w-full py-4 rounded-xl font-semibold text-base transition-all ${
          isCurrent
            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
            : highlight
            ? "bg-[#2A2A2A] text-white hover:bg-gray-800 shadow-lg"
            : "bg-[#2563EB] text-white hover:bg-blue-600 shadow-lg"
        }`}
        style={{ fontFamily: "var(--font-ibm-plex)" }}
        onClick={(e) => {
          e.stopPropagation();
          if (!isCurrent) onClick();
        }}
      >
        {isCurrent ? "Current Plan" : buttonText}
      </button>
    </div>
  );
}

function PlanModal({
  plan,
  billingCycle,
  onClose,
  onUpgrade,
  loading,
  subscriptionTier,
}: {
  plan: PlanType;
  billingCycle: BillingCycle;
  onClose: () => void;
  onUpgrade: (tier: string) => void;
  loading: boolean;
  subscriptionTier: string;
}) {
  const router = useRouter();

  const planDetails = {
    free: {
      title: "Start Free",
      subtitle: "No credit card required",
      features: [
        { icon: "FileSpreadsheet", title: "1 Project", desc: "Perfect for testing hf.bluebook" },
        { icon: "Upload", title: "3 Files", desc: "Upload Excel, CSV, or XLSX files" },
        { icon: "MessageSquare", title: "Basic AI Chat", desc: "Ask questions about your data" },
        { icon: "Zap", title: "Instant Insights", desc: "Get answers in seconds" },
      ],
      price: "£0 forever",
      cta: "Start Free",
      action: () => router.push("/"),
    },
    standard: {
      title: "Standard Plan",
      subtitle: "Perfect for project directors",
      features: [
        { icon: "FolderOpen", title: "3 Projects", desc: "Manage multiple jobs simultaneously" },
        { icon: "FileStack", title: "5 Files Each", desc: "Up to 5 Excel files per project" },
        { icon: "MessageCircle", title: "WhatsApp Integration", desc: "Chat from site, no laptop needed" },
        { icon: "Cloud", title: "M365 Import", desc: "OneDrive & SharePoint file import" },
        { icon: "Brain", title: "Hybrid AI", desc: "Industry knowledge + your data" },
        { icon: "Users", title: "Multi-Org", desc: "Invite team members, share projects" },
      ],
      price: billingCycle === "yearly" ? "£255/year (save £45)" : "£25/month",
      cta: "Continue to Checkout",
      action: () => onUpgrade("standard"),
    },
    professional: {
      title: "Professional Plan",
      subtitle: "For teams managing unlimited projects",
      features: [
        { icon: "Infinity", title: "Unlimited Projects", desc: "No limits on number of projects" },
        { icon: "Database", title: "Unlimited Files", desc: "Upload as many files as you need" },
        { icon: "CheckCircle", title: "Everything in Standard", desc: "WhatsApp, M365, Hybrid AI, Multi-org" },
        { icon: "Headphones", title: "Priority Support", desc: "Email & chat support within 2 hours" },
        { icon: "Gauge", title: "Higher Token Limits", desc: "Process larger files and longer chats" },
        { icon: "BarChart", title: "Advanced Analytics", desc: "Track usage and insights" },
      ],
      price: billingCycle === "yearly" ? "£918/year (save £162)" : "£90/month",
      cta: "Continue to Checkout",
      action: () => onUpgrade("professional"),
    },
    bundle: {
      title: "PWA Bundle",
      subtitle: "Complete DPoW.ai Ecosystem",
      features: [
        { icon: "MessageSquare", title: "hf.bluebook", desc: "AI insights from Excel files" },
        { icon: "List", title: "dpow.list", desc: "Equipment schedules from emails" },
        { icon: "FileText", title: "dpow.spec", desc: "Specification intelligence" },
        { icon: "Sparkles", title: "dpow.brief", desc: "AI-powered project briefs" },
        { icon: "Calendar", title: "dpow.plan", desc: "Construction programme management" },
        { icon: "AlertTriangle", title: "dpow.risk", desc: "Risk assessment automation" },
        { icon: "DollarSign", title: "dpow.cost", desc: "Cost management & tracking" },
        { icon: "Clock", title: "dpow.time", desc: "Time tracking & reporting" },
      ],
      price: "£2,598/year - Coming Q1 2026",
      cta: "Notify Me",
      action: onClose,
    },
  };

  const details = planDetails[plan];
  const isCurrent = subscriptionTier === plan;

  // Icon mapping
  const iconMap: Record<string, any> = {
    FileSpreadsheet: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M8 13h2"/><path d="M14 13h2"/><path d="M8 17h2"/><path d="M14 17h2"/></svg>,
    Upload: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>,
    MessageSquare: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
    Zap: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></svg>,
    FolderOpen: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"/></svg>,
    FileStack: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7h-3a2 2 0 0 1-2-2V2"/><path d="M21 6v6.5c0 .8-.7 1.5-1.5 1.5h-7c-.8 0-1.5-.7-1.5-1.5v-9c0-.8.7-1.5 1.5-1.5H17Z"/><path d="M7 8v8.8c0 .3.2.6.4.8.2.2.5.4.8.4H15"/><path d="M3 12v8.8c0 .3.2.6.4.8.2.2.5.4.8.4H11"/></svg>,
    MessageCircle: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>,
    Cloud: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>,
    Brain: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/><path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/><path d="M17.599 6.5a3 3 0 0 0 .399-1.375"/><path d="M6.003 5.125A3 3 0 0 0 6.401 6.5"/><path d="M3.477 10.896a4 4 0 0 1 .585-.396"/><path d="M19.938 10.5a4 4 0 0 1 .585.396"/><path d="M6 18a4 4 0 0 1-1.967-.516"/><path d="M19.967 17.484A4 4 0 0 1 18 18"/></svg>,
    Users: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    Infinity: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 12c-2-2.67-4-4-6-4a4 4 0 1 0 0 8c2 0 4-1.33 6-4Zm0 0c2 2.67 4 4 6 4a4 4 0 0 0 0-8c-2 0-4 1.33-6 4Z"/></svg>,
    Database: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg>,
    CheckCircle: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>,
    Headphones: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/></svg>,
    Gauge: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/></svg>,
    BarChart: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/></svg>,
    List: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>,
    FileText: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>,
    Sparkles: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>,
    Calendar: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>,
    AlertTriangle: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>,
    DollarSign: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
    Clock: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  };

  return (
    <div onClick={onClose} className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6" style={{ backdropFilter: "blur(12px)" }}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl max-w-3xl w-full p-12 relative shadow-2xl border-[3px] border-gray-200 max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-8 right-8 w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-all">
          <X className="w-6 h-6 text-gray-600" />
        </button>

        <div className="mb-10">
          <h2 className="text-5xl font-medium mb-3" style={{ fontFamily: "var(--font-cormorant)", color: "#2A2A2A" }}>
            {details.title}
          </h2>
          <p className="text-xl text-gray-600" style={{ fontFamily: "var(--font-ibm-plex)" }}>
            {details.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-10">
          {details.features.map((feature, i) => {
            const IconComponent = iconMap[feature.icon];
            return (
              <div key={i} className="flex gap-4 p-4 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-all">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white flex items-center justify-center border-2 border-gray-200">
                  <div className="text-[#2563EB]">
                    {IconComponent && <IconComponent />}
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold mb-1" style={{ fontFamily: "var(--font-ibm-plex)", color: "#2A2A2A" }}>
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed" style={{ fontFamily: "var(--font-ibm-plex)" }}>
                    {feature.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center mb-8 p-6 rounded-2xl" style={{ background: "#FCFCFA" }}>
          <p className="text-3xl font-semibold" style={{ fontFamily: "var(--font-cormorant)", color: "#2A2A2A" }}>
            {details.price}
          </p>
        </div>

        <button
          onClick={details.action}
          disabled={loading || isCurrent}
          className={`w-full py-5 rounded-xl font-semibold text-lg transition-all ${
            isCurrent ? "bg-gray-200 text-gray-500 cursor-not-allowed" : loading ? "bg-gray-200 text-gray-600 cursor-wait" : "bg-[#2563EB] text-white hover:bg-blue-600 shadow-xl hover:shadow-2xl"
          }`}
          style={{ fontFamily: "var(--font-ibm-plex)" }}
        >
          {loading ? "Loading..." : isCurrent ? "Current Plan" : details.cta}
        </button>
      </div>
    </div>
  );
}
