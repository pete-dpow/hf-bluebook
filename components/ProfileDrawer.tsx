"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  X, Building2, Plus, Crown, LogOut, ArrowLeft, Mail, Users, UserPlus, Trash2,
  User, Settings, ChevronDown, ChevronRight, Phone, CheckCircle, AlertCircle,
  Smartphone, Link as LinkIcon, Sparkles, Zap
} from "lucide-react";

export default function ProfileDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [activeOrg, setActiveOrg] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [members, setMembers] = useState<any[]>([]);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [microsoftConnected, setMicrosoftConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  
  // NEW: Collapsible sections state
  const [showIntegrations, setShowIntegrations] = useState(true);
  const [showOrganizations, setShowOrganizations] = useState(true);
  const [showWhatsAppNumbers, setShowWhatsAppNumbers] = useState(false);
  const [showMemorySettings, setShowMemorySettings] = useState(false);
  const [memoryCount, setMemoryCount] = useState<number>(0);
  const [clearingMemory, setClearingMemory] = useState(false);
  const [memorySuccess, setMemorySuccess] = useState<string | null>(null);
  const [whatsappConnected, setWhatsappConnected] = useState(false);
  const [whatsappPhoneNumber, setWhatsappPhoneNumber] = useState<string | null>(null);
  const [activeProjectName, setActiveProjectName] = useState<string | null>(null);
  const [sendingTest, setSendingTest] = useState(false);
  
  // NEW: WhatsApp state
  const [whatsappNumbers, setWhatsappNumbers] = useState<string[]>([]);
  const [newPhoneNumber, setNewPhoneNumber] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // ⭐ NEW: Task 19 - Project/File counts
  const [projectCount, setProjectCount] = useState<number>(0);
  const [fileCount, setFileCount] = useState<number>(0);

  // ⭐ NEW: Task 87 - Subscription status
  const [subscriptionTier, setSubscriptionTier] = useState<string>('free');

  useEffect(() => {
    checkAuth();
    checkMicrosoftConnection();
    
    // Auto-open profile on M365 success
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('m365_success') === 'true') {
        setIsOpen(true);
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
    
    const trigger = document.getElementById("profile-trigger");
    if (!trigger) return;

    const handleClick = () => setIsOpen(true);
    trigger.addEventListener("click", handleClick);
    window.addEventListener("openProfileDrawer", handleClick as EventListener);

    return () => {
      trigger.removeEventListener("click", handleClick);
      window.removeEventListener("openProfileDrawer", handleClick as EventListener);
    };
  }, []);

  useEffect(() => {
    if (user) {
      loadOrganizations();
      loadProjectFileCount(); // ⭐ NEW: Task 19
      loadSubscriptionStatus(); // ⭐ NEW: Task 87
    }
  }, [user]);

  useEffect(() => {
    if (showMembers && activeOrg) {
      loadMembers();
    }
  }, [showMembers, activeOrg]);

  // NEW: Load WhatsApp numbers when section opens
  useEffect(() => {
    if (showWhatsAppNumbers && activeOrg) {
      loadWhatsAppNumbers();
    }
  }, [showWhatsAppNumbers, activeOrg]);

  // Load memory count when section opens
  useEffect(() => {
    if (showMemorySettings && user) {
      loadMemoryCount();
    }
  }, [showMemorySettings, user]);

  // Load WhatsApp info when integrations section opens
  useEffect(() => {
    if (showIntegrations && user && activeOrg) {
      loadWhatsAppInfo();
    }
  }, [showIntegrations, user, activeOrg]);
  
  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user || null);
  }

  async function checkMicrosoftConnection() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("users")
        .select("microsoft_access_token")
        .eq("id", user.id)
        .single();

      setMicrosoftConnected(!!data?.microsoft_access_token);
    } catch (error) {
      console.error("Error checking Microsoft connection:", error);
    }
  }

  // ⭐ NEW: Task 19 - Load project and file counts
  async function loadProjectFileCount() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Use SQL functions to get counts
      const { data, error } = await supabase.rpc('get_user_project_count', { user_uuid: user.id });
      if (!error && data !== null) {
        setProjectCount(data);
      }

      const { data: fileData, error: fileError } = await supabase.rpc('get_user_file_count', { user_uuid: user.id });
      if (!fileError && fileData !== null) {
        setFileCount(fileData);
      }
    } catch (error) {
      console.error('Error loading counts:', error);
    }
  }

  // ⭐ NEW: Task 87 - Load subscription status
  async function loadSubscriptionStatus() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("users")
        .select("subscription_tier")
        .eq("id", user.id)
        .single();

      if (data?.subscription_tier) {
        setSubscriptionTier(data.subscription_tier);
      }
    } catch (error) {
      console.error('Error loading subscription:', error);
    }
  }

  async function handleConnectMicrosoft() {
    setIsConnecting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      window.location.href = `/api/microsoft/auth?userId=${user.id}`;
    }
  }

  async function handleDisconnectMicrosoft() {
    if (!confirm('Disconnect Microsoft 365? This will remove access to your OneDrive files.')) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const response = await fetch('/api/microsoft/disconnect', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      
      if (response.ok) {
        setMicrosoftConnected(false);
        alert('Microsoft 365 disconnected successfully');
      } else {
        alert('Failed to disconnect Microsoft 365');
      }
    } catch (error) {
      console.error('Disconnect error:', error);
      alert('Failed to disconnect Microsoft 365');
    }
  }

  async function loadOrganizations() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch("/api/organizations/list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: session.access_token }),
    });

    const data = await res.json();
    if (data.organizations) {
      setOrganizations(data.organizations);
      
      const { data: userData } = await supabase
        .from("users")
        .select("active_organization_id")
        .eq("id", session.user.id)
        .single();

      if (userData?.active_organization_id) {
        const active = data.organizations.find(
          (org: any) => org.id === userData.active_organization_id
        );
        setActiveOrg(active || null);
      }
    }
  }

  async function loadMembers() {
    if (!activeOrg) return;

    const { data, error } = await supabase
      .from("organization_members")
      .select(`
        id,
        role,
        created_at,
        user_id,
        users:user_id (
          email
        )
      `)
      .eq("organization_id", activeOrg.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setMembers(data);
    }
  }

  // Load memory count
  async function loadMemoryCount() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/memory', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMemoryCount(data.memories.count || 0);
      }
    } catch (error) {
      console.error('Error loading memory count:', error);
    }
  }

  // Clear all memories
  async function handleClearMemory() {
    if (!confirm('Clear all saved preferences and context?\n\nThis will reset hf.bluebook\'s memory of your preferences. This action cannot be undone.')) {
      return;
    }
    setClearingMemory(true);
    setMemorySuccess(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const response = await fetch('/api/memory?clearAll=true', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setMemoryCount(0);
        setMemorySuccess(`✅ ${data.message}`);
        setTimeout(() => setMemorySuccess(null), 5000);
      } else {
        throw new Error('Failed to clear memory');
      }
    } catch (error) {
      console.error('Error clearing memory:', error);
      alert('Failed to clear memory. Please try again.');
    } finally {
      setClearingMemory(false);
    }
  }

  // Load WhatsApp connection info
  async function loadWhatsAppInfo() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      // Get WhatsApp connection status (check if user has approved number)
      if (activeOrg) {
        const { data: orgData } = await supabase
          .from("organizations")
          .select("whatsapp_allowed_numbers")
          .eq("id", activeOrg.id)
          .single();
        const allowedNumbers = orgData?.whatsapp_allowed_numbers || [];
        setWhatsappConnected(allowedNumbers.length > 0);
        setWhatsappPhoneNumber(allowedNumbers[0] || null);
      }
      // Get active project name
      const { data: userData } = await supabase
        .from("users")
        .select("active_project_id")
        .eq("id", session.user.id)
        .single();
      if (userData?.active_project_id) {
        const { data: projectData } = await supabase
          .from("projects")
          .select("name")
          .eq("id", userData.active_project_id)
          .single();
        setActiveProjectName(projectData?.name || null);
      }
    } catch (error) {
      console.error('Error loading WhatsApp info:', error);
    }
  }

  // Send test WhatsApp message
  async function handleSendTestWhatsApp() {
    if (!whatsappPhoneNumber) {
      alert('No WhatsApp number connected');
      return;
    }

    if (!activeProjectName) {
      alert('No active project set. Load a project first.');
      return;
    }

    setSendingTest(true);
    try {
      const testMessage = `✅ WhatsApp connection working!\n\nActive project: ${activeProjectName}\n\nYou can now send questions about this project via WhatsApp.`;
      
      const response = await fetch('/api/whatsapp/send-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: whatsappPhoneNumber,
          message: testMessage,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(`✅ Test message sent to ${whatsappPhoneNumber}`);
      } else {
        alert(`❌ Error: ${data.error || 'Unknown error'}`);
        console.error('API error:', data);
      }
    } catch (error) {
      console.error('Send test error:', error);
      alert(`❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSendingTest(false);
    }
  }

  // Load WhatsApp numbers
  async function loadWhatsAppNumbers() {
    if (!activeOrg) return;

    const { data, error } = await supabase
      .from("organizations")
      .select("whatsapp_allowed_numbers")
      .eq("id", activeOrg.id)
      .single();

    if (!error && data) {
      setWhatsappNumbers(data.whatsapp_allowed_numbers || []);
    }
  }

  // Validate UK phone number
  function validatePhoneNumber(phone: string): boolean {
    // Remove spaces and common separators
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');
    
    // Check for UK mobile format: +44 7xxx xxxxxx or 07xxx xxxxxx
    const ukMobileRegex = /^(\+44|0)7\d{9}$/;
    
    if (!ukMobileRegex.test(cleaned)) {
      setPhoneError("Please enter a valid UK mobile number (e.g., +44 7700 900123 or 07700 900123)");
      return false;
    }
    
    setPhoneError(null);
    return true;
  }

  // Format phone number to consistent format
  function formatPhoneNumber(phone: string): string {
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');
    
    // Convert to +44 format
    if (cleaned.startsWith('0')) {
      return '+44' + cleaned.substring(1);
    }
    
    return cleaned;
  }

  // Add WhatsApp number
  async function handleAddWhatsAppNumber() {
    if (!newPhoneNumber.trim() || !activeOrg) return;
    
    if (!validatePhoneNumber(newPhoneNumber)) return;
    
    const formatted = formatPhoneNumber(newPhoneNumber);
    
    // Check for duplicates
    if (whatsappNumbers.includes(formatted)) {
      setPhoneError("This number is already in the whitelist");
      return;
    }
    
    setLoading(true);
    try {
      const updatedNumbers = [...whatsappNumbers, formatted];
      
      const { error } = await supabase
        .from("organizations")
        .update({ whatsapp_allowed_numbers: updatedNumbers })
        .eq("id", activeOrg.id);

      if (!error) {
        setWhatsappNumbers(updatedNumbers);
        setNewPhoneNumber("");
        setPhoneError(null);
      } else {
        alert("Failed to add phone number");
      }
    } catch (err) {
      console.error("Add phone error:", err);
      alert("Failed to add phone number");
    } finally {
      setLoading(false);
    }
  }

  // Remove WhatsApp number
  async function handleRemoveWhatsAppNumber(phone: string) {
    if (!confirm(`Remove ${phone} from WhatsApp whitelist?`)) return;
    
    setLoading(true);
    try {
      const updatedNumbers = whatsappNumbers.filter(n => n !== phone);
      
      const { error } = await supabase
        .from("organizations")
        .update({ whatsapp_allowed_numbers: updatedNumbers })
        .eq("id", activeOrg.id);

      if (!error) {
        setWhatsappNumbers(updatedNumbers);
      } else {
        alert("Failed to remove phone number");
      }
    } catch (err) {
      console.error("Remove phone error:", err);
      alert("Failed to remove phone number");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateOrg() {
    if (!newOrgName.trim()) return;
    
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert("Please sign in to create an organization");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/organizations/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newOrgName,
          token: session.access_token,
        }),
      });

      const data = await res.json();
      
      if (data.organization) {
        await loadOrganizations();
        setShowCreateOrg(false);
        setNewOrgName("");
      } else {
        alert(data.error || "Failed to create organization");
      }
    } catch (err) {
      console.error("Create org error:", err);
      alert("Failed to create organization");
    } finally {
      setLoading(false);
    }
  }

  async function handleSwitchOrg(orgId: string) {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch("/api/organizations/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organization_id: orgId,
          token: session.access_token,
        }),
      });

      if (res.ok) {
        await loadOrganizations();
        window.location.reload();
      } else {
        alert("Failed to switch organization");
      }
    } catch (err) {
      console.error("Switch org error:", err);
      alert("Failed to switch organization");
    } finally {
      setLoading(false);
    }
  }

  async function handleSendInvite() {
    if (!inviteEmail.trim() || !activeOrg) return;
    
    setLoading(true);
    setInviteSuccess(null);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch("/api/organizations/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          organizationId: activeOrg.id,
          token: session.access_token,
        }),
      });

      const data = await res.json();
      
      if (res.ok) {
        setInviteSuccess(`✅ Invite sent to ${inviteEmail}`);
        setInviteEmail("");
        setInviteRole("member");
        setTimeout(() => setInviteSuccess(null), 5000);
      } else {
        alert(data.error || "Failed to send invite");
      }
    } catch (err) {
      console.error("Invite error:", err);
      alert("Failed to send invite");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveMember(memberId: string) {
    if (!confirm("Are you sure you want to remove this member?")) return;
    
    const { error } = await supabase
      .from("organization_members")
      .delete()
      .eq("id", memberId);

    if (!error) {
      loadMembers();
    } else {
      alert("Failed to remove member");
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setIsOpen(false);
    window.location.href = "/";
  };

  const handleBack = () => {
    if (showInviteForm) {
      setShowInviteForm(false);
      setInviteEmail("");
      setInviteSuccess(null);
    } else if (showCreateOrg) {
      setShowCreateOrg(false);
      setNewOrgName("");
    }
  };

  if (!isOpen) {
    return (
      <button id="profile-trigger" style={{ display: "none" }}>
        Open Profile
      </button>
    );
  }

  const isAdmin = activeOrg?.role === "admin" || activeOrg?.role === "owner";
  const isFreeUser = subscriptionTier === 'free'; // ⭐ NEW: Task 87

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => {
          setIsOpen(false);
          setShowCreateOrg(false);
          setShowInviteForm(false);
          setShowMembers(false);
        }}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.3)",
          zIndex: 45,
          animation: "fadeIn 0.2s ease-out",
        }}
      />

      {/* Drawer */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: "64px",
          height: "100vh",
          width: "70vw",
          background: "#FCFCFA",
          boxShadow: "-4px 0 24px rgba(0, 0, 0, 0.1)",
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
          animation: "slideInRight 0.3s ease-out",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "1rem 1.5rem",
            borderBottom: "1px solid #E5E7EB",
            background: "white",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {(showCreateOrg || showInviteForm) && (
              <button
                onClick={handleBack}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "0.5rem",
                  borderRadius: "0.5rem",
                  display: "flex",
                  alignItems: "center",
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#F3F4F6")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <ArrowLeft size={20} color="#6B7280" />
              </button>
            )}
            <div>
              <h2
                style={{
                  fontFamily: "var(--font-cormorant)",
                  fontSize: "1.5rem",
                  fontWeight: 600,
                  color: "#2A2A2A",
                  margin: 0,
                }}
              >
                {showCreateOrg ? "Create Organization" : 
                 showInviteForm ? "Invite Team Member" :
                 "Profile & Settings"}
              </h2>
              <p style={{ fontSize: "0.875rem", color: "#6B7280", margin: "0.25rem 0 0 0" }}>
                {showCreateOrg ? "Set up a new organization" :
                 showInviteForm ? activeOrg?.name :
                 "Manage your account and integrations"}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setIsOpen(false);
              setShowCreateOrg(false);
              setShowInviteForm(false);
              setShowMembers(false);
            }}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "0.5rem",
              borderRadius: "0.5rem",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#F3F4F6")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <X size={24} color="#6B7280" />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem" }}>
          {showInviteForm ? (
            /* INVITE FORM */
            <div style={{ maxWidth: "600px", margin: "0 auto" }}>
              <div
                style={{
                  background: "white",
                  borderRadius: "16px",
                  padding: "32px",
                  border: "1px solid #E5E7EB",
                }}
              >
                {inviteSuccess && (
                  <div style={{
                    padding: "12px 16px",
                    background: "#F0FDF4",
                    border: "1px solid #86EFAC",
                    borderRadius: "8px",
                    marginBottom: "24px",
                    color: "#166534",
                    fontSize: "14px",
                  }}>
                    {inviteSuccess}
                  </div>
                )}

                <div style={{ marginBottom: "24px" }}>
                  <Mail size={48} style={{ color: "#2563EB", marginBottom: "16px" }} />
                  <p style={{ fontSize: "15px", color: "#6B7280", lineHeight: "1.6", margin: 0 }}>
                    Send an invitation to join {activeOrg?.name}. They&apos;ll receive an email with a link to accept.
                  </p>
                </div>

                <div style={{ marginBottom: "20px" }}>
                  <label style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "#374151",
                    marginBottom: "8px",
                  }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@company.com"
                    autoFocus
                    style={{
                      width: "100%",
                      padding: "14px 16px",
                      border: "2px solid #E5E7EB",
                      borderRadius: "8px",
                      fontSize: "15px",
                      fontFamily: "var(--font-ibm-plex)",
                      outline: "none",
                      transition: "border-color 0.2s",
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "#2563EB")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "#E5E7EB")}
                  />
                </div>

                <div style={{ marginBottom: "24px" }}>
                  <label style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "#374151",
                    marginBottom: "8px",
                  }}>
                    Role
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "14px 16px",
                      border: "2px solid #E5E7EB",
                      borderRadius: "8px",
                      fontSize: "15px",
                      fontFamily: "var(--font-ibm-plex)",
                      outline: "none",
                      cursor: "pointer",
                      background: "white",
                    }}
                  >
                    <option value="member">Member - Can view and contribute</option>
                    <option value="admin">Admin - Can manage team and settings</option>
                  </select>
                </div>

                <button
                  onClick={handleSendInvite}
                  disabled={!inviteEmail.trim() || loading}
                  style={{
                    width: "100%",
                    padding: "14px",
                    background: "#2563EB",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: 600,
                    cursor: !inviteEmail.trim() || loading ? "not-allowed" : "pointer",
                    opacity: !inviteEmail.trim() || loading ? 0.5 : 1,
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    if (inviteEmail.trim() && !loading) {
                      e.currentTarget.style.background = "#1D4ED8";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (inviteEmail.trim() && !loading) {
                      e.currentTarget.style.background = "#2563EB";
                    }
                  }}
                >
                  {loading ? "Sending..." : "Send Invitation"}
                </button>
              </div>
            </div>
          ) : showCreateOrg ? (
            /* CREATE ORGANIZATION VIEW */
            <div style={{ maxWidth: "600px", margin: "0 auto" }}>
              <div
                style={{
                  background: "white",
                  borderRadius: "16px",
                  padding: "32px",
                  border: "1px solid #E5E7EB",
                }}
              >
                <div style={{ marginBottom: "24px" }}>
                  <Building2 size={48} style={{ color: "#2563EB", marginBottom: "16px" }} />
                  <p style={{ fontSize: "15px", color: "#6B7280", lineHeight: "1.6", margin: 0 }}>
                    Organizations help you manage projects and collaborate with your team. 
                    You&apos;ll be the admin of this organization.
                  </p>
                </div>

                <div style={{ marginBottom: "24px" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#374151",
                      marginBottom: "8px",
                    }}
                  >
                    Organization Name
                  </label>
                  <input
                    type="text"
                    value={newOrgName}
                    onChange={(e) => setNewOrgName(e.target.value)}
                    placeholder="Agent Connolly Ltd"
                    autoFocus
                    style={{
                      width: "100%",
                      padding: "14px 16px",
                      border: "2px solid #E5E7EB",
                      borderRadius: "8px",
                      fontSize: "15px",
                      fontFamily: "var(--font-ibm-plex)",
                      outline: "none",
                      transition: "border-color 0.2s",
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = "#2563EB")}
                    onBlur={(e) => (e.currentTarget.style.borderColor = "#E5E7EB")}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateOrg()}
                  />
                </div>

                <div style={{ display: "flex", gap: "12px" }}>
                  <button
                    onClick={() => {
                      setShowCreateOrg(false);
                      setNewOrgName("");
                    }}
                    disabled={loading}
                    style={{
                      flex: 1,
                      padding: "14px",
                      background: "transparent",
                      border: "2px solid #E5E7EB",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontWeight: 600,
                      cursor: loading ? "not-allowed" : "pointer",
                      color: "#6B7280",
                      opacity: loading ? 0.5 : 1,
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      if (!loading) {
                        e.currentTarget.style.background = "#F9FAFB";
                        e.currentTarget.style.borderColor = "#D1D5DB";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!loading) {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.borderColor = "#E5E7EB";
                      }
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateOrg}
                    disabled={!newOrgName.trim() || loading}
                    style={{
                      flex: 1,
                      padding: "14px",
                      background: "#2563EB",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontWeight: 600,
                      cursor: !newOrgName.trim() || loading ? "not-allowed" : "pointer",
                      opacity: !newOrgName.trim() || loading ? 0.5 : 1,
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      if (newOrgName.trim() && !loading) {
                        e.currentTarget.style.background = "#1D4ED8";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (newOrgName.trim() && !loading) {
                        e.currentTarget.style.background = "#2563EB";
                      }
                    }}
                  >
                    {loading ? "Creating..." : "Create Organization"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* MAIN VIEW - REDESIGNED WITH SECTIONS */
            <>
              {/* USER PROFILE SECTION */}
              <div style={{ marginBottom: "32px" }}>
                <div
                  style={{
                    background: "white",
                    border: "2px solid #2563EB",
                    borderRadius: "12px",
                    padding: "24px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px" }}>
                    <div
                      style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        fontSize: "20px",
                        fontWeight: 600,
                      }}
                    >
                      {user?.email?.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "18px", fontWeight: 600, color: "#1F2937", fontFamily: "var(--font-cormorant)" }}>
                        {user?.user_metadata?.full_name || user?.email?.split('@')[0] || "User"}
                      </div>
                      <div style={{ fontSize: "14px", color: "#6B7280", marginTop: "2px" }}>
                        {user?.email}
                      </div>
                    </div>
                  </div>
                  
                  {/* ⭐ NEW: Task 19 - Project/File Count Display */}
                  <div style={{ 
                    padding: "12px 16px", 
                    background: "#F9FAFB", 
                    borderRadius: "8px", 
                    marginBottom: "16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "14px",
                    color: "#6B7280",
                    fontWeight: 500,
                  }}>
                    <Building2 size={16} />
                    <span>{projectCount} projects • {fileCount} files</span>
                  </div>

                  {/* ⭐ NEW: Task 87 - Upgrade Prompt for Free Users */}
                  {isFreeUser && (
                    <div style={{
                      padding: "16px",
                      background: "linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)",
                      border: "2px solid #F59E0B",
                      borderRadius: "8px",
                      marginBottom: "16px",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                        <Sparkles size={20} style={{ color: "#F59E0B" }} />
                        <span style={{ fontSize: "14px", fontWeight: 600, color: "#92400E" }}>
                          Upgrade to Pro+
                        </span>
                      </div>
                      <p style={{ fontSize: "13px", color: "#78350F", margin: "0 0 12px 0", lineHeight: "1.5" }}>
                        Unlock unlimited chats, all 8 apps, WhatsApp integration, and priority support for £150/month
                      </p>
                      <button
                        onClick={() => {
                          // ⭐ Task 91: Link to support form (placeholder for now)
                          window.open('https://dpow.co.uk/upgrade', '_blank');
                        }}
                        style={{
                          width: "100%",
                          padding: "10px",
                          background: "#F59E0B",
                          color: "white",
                          border: "none",
                          borderRadius: "6px",
                          fontSize: "13px",
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                          transition: "background 0.2s",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#D97706")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "#F59E0B")}
                      >
                        <Zap size={16} />
                        Upgrade Now
                      </button>
                    </div>
                  )}
                  
                  <div style={{ display: "flex", gap: "8px", paddingTop: "16px", borderTop: "1px solid #E5E7EB" }}>
                    <button
                      style={{
                        flex: 1,
                        padding: "10px 16px",
                        background: "white",
                        color: "#2563EB",
                        border: "1px solid #2563EB",
                        borderRadius: "8px",
                        fontSize: "13px",
                        fontWeight: 500,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#EFF6FF";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "white";
                      }}
                    >
                      <Settings size={16} />
                      Edit Profile
                    </button>
                    {/* ⭐ NEW: Task 91 - Support Form Button */}
                    <button
                      onClick={() => {
                        window.open('https://dpow.co.uk/support', '_blank');
                      }}
                      style={{
                        flex: 1,
                        padding: "10px 16px",
                        background: "white",
                        color: "#2563EB",
                        border: "1px solid #2563EB",
                        borderRadius: "8px",
                        fontSize: "13px",
                        fontWeight: 500,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#EFF6FF";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "white";
                      }}
                    >
                      <Mail size={16} />
                      Support
                    </button>
                  </div>
                </div>
              </div>

              {/* INTEGRATIONS SECTION - COLLAPSIBLE */}
              <div style={{ marginBottom: "24px" }}>
                <button
                  onClick={() => setShowIntegrations(!showIntegrations)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: "8px 0",
                    marginBottom: "12px",
                  }}
                >
                  <h3 style={{
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "#6B7280",
                    margin: 0,
                    letterSpacing: "0.5px",
                  }}>
                    🔗 INTEGRATIONS
                  </h3>
                  {showIntegrations ? <ChevronDown size={20} color="#6B7280" /> : <ChevronRight size={20} color="#6B7280" />}
                </button>
                
                {showIntegrations && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {/* ⭐ UPDATED: Task 20 - Microsoft 365 with logo (branded button) */}
                    <div
                      style={{
                        background: "white",
                        border: "1px solid #E5E7EB",
                        borderRadius: "12px",
                        padding: "20px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                        {/* ⭐ Task 20: Microsoft logo SVG */}
                        <svg width="20" height="20" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M0 0H10.8571V10.8571H0V0Z" fill="#F25022"/>
                          <path d="M12.1429 0H23V10.8571H12.1429V0Z" fill="#7FBA00"/>
                          <path d="M0 12.1429H10.8571V23H0V12.1429Z" fill="#00A4EF"/>
                          <path d="M12.1429 12.1429H23V23H12.1429V12.1429Z" fill="#FFB900"/>
                        </svg>
                        <span style={{ fontSize: "15px", fontWeight: 600, color: "#1F2937" }}>
                          Microsoft 365
                        </span>
                        {microsoftConnected && (
                          <div
                            style={{
                              marginLeft: "auto",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              fontSize: "13px",
                              color: "#10B981",
                              fontWeight: 500,
                            }}
                          >
                            <CheckCircle size={16} />
                            Connected
                          </div>
                        )}
                      </div>
                      <p style={{ fontSize: "13px", color: "#6B7280", margin: "0 0 16px 0", lineHeight: "1.5" }}>
                        Import files from OneDrive and SharePoint to analyze in hf.bluebook
                      </p>
                      {microsoftConnected ? (
                        <button
                          onClick={handleDisconnectMicrosoft}
                          style={{
                            width: "100%",
                            padding: "10px",
                            background: "white",
                            color: "#DC2626",
                            border: "1px solid #DC2626",
                            borderRadius: "8px",
                            fontSize: "13px",
                            fontWeight: 500,
                            cursor: "pointer",
                            transition: "all 0.2s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "#FEF2F2";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "white";
                          }}
                        >
                          Disconnect
                        </button>
                      ) : (
                        <button
                          onClick={handleConnectMicrosoft}
                          disabled={isConnecting}
                          style={{
                            width: "100%",
                            padding: "10px",
                            background: "#2563EB",
                            color: "white",
                            border: "none",
                            borderRadius: "8px",
                            fontSize: "13px",
                            fontWeight: 500,
                            cursor: isConnecting ? "not-allowed" : "pointer",
                            opacity: isConnecting ? 0.6 : 1,
                            transition: "all 0.2s",
                          }}
                          onMouseEnter={(e) => {
                            if (!isConnecting) e.currentTarget.style.background = "#1D4ED8";
                          }}
                          onMouseLeave={(e) => {
                            if (!isConnecting) e.currentTarget.style.background = "#2563EB";
                          }}
                        >
                          {isConnecting ? "Connecting..." : "Connect Microsoft 365"}
                        </button>
                      )}
                    </div>

                    {/* WhatsApp Integration Status */}
                    <div
                      style={{
                        background: "white",
                        border: "1px solid #E5E7EB",
                        borderRadius: "12px",
                        padding: "20px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                        <Smartphone size={20} style={{ color: "#25D366" }} />
                        <span style={{ fontSize: "15px", fontWeight: 600, color: "#1F2937" }}>
                          WhatsApp Business
                        </span>
                        {whatsappConnected ? (
                          <div
                            style={{
                              marginLeft: "auto",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              fontSize: "13px",
                              color: "#10B981",
                              fontWeight: 500,
                            }}
                          >
                            <CheckCircle size={16} />
                            Connected
                          </div>
                        ) : (
                          <div
                            style={{
                              marginLeft: "auto",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              fontSize: "13px",
                              color: "#F59E0B",
                              fontWeight: 500,
                            }}
                          >
                            <AlertCircle size={16} />
                            Setup Required
                          </div>
                        )}
                      </div>

                      {whatsappConnected ? (
                        <>
                          <div style={{ marginBottom: "16px" }}>
                            <div style={{ fontSize: "12px", color: "#6B7280", marginBottom: "8px" }}>
                              Connected Number
                            </div>
                            <div style={{ 
                              fontSize: "14px", 
                              fontWeight: 500, 
                              color: "#1F2937",
                              fontFamily: "monospace",
                              padding: "8px 12px",
                              background: "#F0FDF4",
                              border: "1px solid #86EFAC",
                              borderRadius: "6px",
                              display: "inline-block",
                            }}>
                              {whatsappPhoneNumber || "No number"}
                            </div>
                          </div>

                          <div style={{ marginBottom: "16px" }}>
                            <div style={{ fontSize: "12px", color: "#6B7280", marginBottom: "8px" }}>
                              Active Project
                            </div>
                            <div style={{ 
                              fontSize: "14px", 
                              fontWeight: 500, 
                              color: "#1F2937",
                              padding: "8px 12px",
                              background: "#EFF6FF",
                              border: "1px solid #BFDBFE",
                              borderRadius: "6px",
                              display: "inline-block",
                            }}>
                              {activeProjectName || "No project loaded"}
                            </div>
                          </div>

                          <button
                            onClick={handleSendTestWhatsApp}
                            disabled={sendingTest || !activeProjectName}
                            style={{
                              width: "100%",
                              padding: "10px",
                              background: sendingTest || !activeProjectName ? "#F3F4F6" : "#25D366",
                              color: sendingTest || !activeProjectName ? "#9CA3AF" : "white",
                              border: "none",
                              borderRadius: "8px",
                              fontSize: "13px",
                              fontWeight: 500,
                              cursor: sendingTest || !activeProjectName ? "not-allowed" : "pointer",
                              transition: "all 0.2s",
                            }}
                            onMouseEnter={(e) => {
                              if (!sendingTest && activeProjectName) {
                                e.currentTarget.style.background = "#1DA851";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!sendingTest && activeProjectName) {
                                e.currentTarget.style.background = "#25D366";
                              }
                            }}
                          >
                            {sendingTest ? "Sending..." : "Send Test Message"}
                          </button>
                        </>
                      ) : (
                        <p style={{ fontSize: "13px", color: "#6B7280", margin: 0, lineHeight: "1.5" }}>
                          Chat with your projects via WhatsApp. Admins can manage approved phone numbers below.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* ORGANIZATIONS SECTION - COLLAPSIBLE */}
              <div style={{ marginBottom: "24px" }}>
                <button
                  onClick={() => setShowOrganizations(!showOrganizations)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: "8px 0",
                    marginBottom: "12px",
                  }}
                >
                  <h3 style={{
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "#6B7280",
                    margin: 0,
                    letterSpacing: "0.5px",
                  }}>
                    🏢 ORGANIZATIONS
                  </h3>
                  {showOrganizations ? <ChevronDown size={20} color="#6B7280" /> : <ChevronRight size={20} color="#6B7280" />}
                </button>

                {showOrganizations && (
                  <>
                    {/* All Organizations */}
                    <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "16px" }}>
                      {organizations.map((org) => (
                        <button
                          key={org.id}
                          onClick={() => org.id !== activeOrg?.id && handleSwitchOrg(org.id)}
                          style={{
                            padding: "12px 20px",
                            background: org.id === activeOrg?.id ? "#2563EB" : "white",
                            color: org.id === activeOrg?.id ? "white" : "#1F2937",
                            border: org.id === activeOrg?.id ? "none" : "1px solid #E5E7EB",
                            borderRadius: "8px",
                            fontSize: "14px",
                            fontWeight: 500,
                            cursor: org.id === activeOrg?.id ? "default" : "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            transition: "all 0.2s",
                          }}
                          onMouseEnter={(e) => {
                            if (org.id !== activeOrg?.id) {
                              e.currentTarget.style.background = "#F9FAFB";
                              e.currentTarget.style.borderColor = "#D1D5DB";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (org.id !== activeOrg?.id) {
                              e.currentTarget.style.background = "white";
                              e.currentTarget.style.borderColor = "#E5E7EB";
                            }
                          }}
                        >
                          <Building2 size={16} />
                          {org.name}
                          {org.role === "admin" && <Crown size={14} style={{ color: org.id === activeOrg?.id ? "white" : "#F59E0B" }} />}
                        </button>
                      ))}
                      <button
                        onClick={() => setShowCreateOrg(true)}
                        style={{
                          padding: "12px 20px",
                          background: "white",
                          color: "#2563EB",
                          border: "2px dashed #2563EB",
                          borderRadius: "8px",
                          fontSize: "14px",
                          fontWeight: 500,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#EFF6FF";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "white";
                        }}
                      >
                        <Plus size={16} />
                        New Organization
                      </button>
                    </div>

                    {/* Active Organization Details */}
                    {activeOrg && (
                      <div
                        style={{
                          background: "white",
                          border: "2px solid #2563EB",
                          borderRadius: "12px",
                          padding: "20px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                          <Building2 size={20} style={{ color: "#2563EB" }} />
                          <span style={{ fontSize: "12px", color: "#6B7280", fontWeight: 600, letterSpacing: "0.5px" }}>
                            ACTIVE ORGANIZATION
                          </span>
                        </div>
                        <div style={{ fontSize: "20px", fontWeight: 600, color: "#1F2937", fontFamily: "var(--font-cormorant)" }}>
                          {activeOrg.name}
                        </div>
                        <div style={{ fontSize: "14px", color: "#6B7280", marginTop: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                          {activeOrg.role === "admin" && <Crown size={14} style={{ color: "#F59E0B" }} />}
                          {activeOrg.role.charAt(0).toUpperCase() + activeOrg.role.slice(1)}
                        </div>
                        
                        {/* Team Management Buttons */}
                        {isAdmin && (
                          <div style={{ display: "flex", gap: "8px", marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #E5E7EB" }}>
                            <button
                              onClick={() => setShowInviteForm(true)}
                              style={{
                                flex: 1,
                                padding: "10px 16px",
                                background: "#2563EB",
                                color: "white",
                                border: "none",
                                borderRadius: "8px",
                                fontSize: "13px",
                                fontWeight: 500,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "6px",
                                transition: "background 0.2s",
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = "#1D4ED8")}
                              onMouseLeave={(e) => (e.currentTarget.style.background = "#2563EB")}
                            >
                              <UserPlus size={16} />
                              Invite Member
                            </button>
                            <button
                              onClick={() => setShowMembers(!showMembers)}
                              style={{
                                flex: 1,
                                padding: "10px 16px",
                                background: "white",
                                color: "#2563EB",
                                border: "1px solid #2563EB",
                                borderRadius: "8px",
                                fontSize: "13px",
                                fontWeight: 500,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "6px",
                                transition: "all 0.2s",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = "#EFF6FF";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = "white";
                              }}
                            >
                              <Users size={16} />
                              View Team
                            </button>
                          </div>
                        )}

                        {/* EXPANDABLE MEMBERS LIST */}
                        {showMembers && (
                          <div style={{ marginTop: "20px", paddingTop: "20px", borderTop: "1px solid #E5E7EB" }}>
                            <div style={{ fontSize: "12px", color: "#6B7280", fontWeight: 600, letterSpacing: "0.5px", marginBottom: "12px" }}>
                              TEAM MEMBERS ({members.length})
                            </div>
                            {members.length === 0 ? (
                              <div style={{
                                textAlign: "center",
                                padding: "24px",
                                color: "#6B7280",
                                fontSize: "14px",
                              }}>
                                No members yet
                              </div>
                            ) : (
                              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                {members.map((member: any) => (
                                  <div
                                    key={member.id}
                                    style={{
                                      padding: "12px",
                                      background: "#F9FAFB",
                                      borderRadius: "8px",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "space-between",
                                    }}
                                  >
                                    <div>
                                      <div style={{ fontSize: "14px", fontWeight: 500, color: "#1F2937" }}>
                                        {member.users?.email}
                                        {member.user_id === user?.id && (
                                          <span style={{ fontSize: "12px", color: "#6B7280", fontWeight: 400 }}> (You)</span>
                                        )}
                                      </div>
                                      <div style={{ fontSize: "12px", color: "#6B7280", marginTop: "2px", display: "flex", alignItems: "center", gap: "4px" }}>
                                        {member.role === "admin" && <Crown size={12} style={{ color: "#F59E0B" }} />}
                                        {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                                      </div>
                                    </div>
                                    {isAdmin && member.user_id !== user?.id && (
                                      <button
                                        onClick={() => handleRemoveMember(member.id)}
                                        style={{
                                          padding: "6px 12px",
                                          background: "transparent",
                                          border: "1px solid #DC2626",
                                          borderRadius: "6px",
                                          color: "#DC2626",
                                          fontSize: "12px",
                                          cursor: "pointer",
                                          transition: "all 0.2s",
                                        }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.background = "#DC2626";
                                          e.currentTarget.style.color = "white";
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.background = "transparent";
                                          e.currentTarget.style.color = "#DC2626";
                                        }}
                                      >
                                        Remove
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* WHATSAPP NUMBERS SECTION - COLLAPSIBLE - ADMIN ONLY */}
              {isAdmin && activeOrg && (
                <div style={{ marginBottom: "24px" }}>
                  <button
                    onClick={() => setShowWhatsAppNumbers(!showWhatsAppNumbers)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      padding: "8px 0",
                      marginBottom: "12px",
                    }}
                  >
                    <h3 style={{
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#6B7280",
                      margin: 0,
                      letterSpacing: "0.5px",
                    }}>
                      📱 WHATSAPP NUMBERS (Admin Only)
                    </h3>
                    {showWhatsAppNumbers ? <ChevronDown size={20} color="#6B7280" /> : <ChevronRight size={20} color="#6B7280" />}
                  </button>

                  {showWhatsAppNumbers && (
                    <div
                      style={{
                        background: "white",
                        border: "1px solid #E5E7EB",
                        borderRadius: "12px",
                        padding: "20px",
                      }}
                    >
                      <div style={{ marginBottom: "20px" }}>
                        <p style={{ fontSize: "14px", color: "#6B7280", margin: "0 0 16px 0", lineHeight: "1.6" }}>
                          Only approved phone numbers can chat with this organization&apos;s projects via WhatsApp. 
                          Add team members&apos; phone numbers to the whitelist.
                        </p>
                        
                        {/* Add Phone Number Form */}
                        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                          <div style={{ flex: 1 }}>
                            <input
                              type="tel"
                              value={newPhoneNumber}
                              onChange={(e) => {
                                setNewPhoneNumber(e.target.value);
                                setPhoneError(null);
                              }}
                              placeholder="+44 7700 900123"
                              style={{
                                width: "100%",
                                padding: "12px 16px",
                                border: `2px solid ${phoneError ? "#DC2626" : "#E5E7EB"}`,
                                borderRadius: "8px",
                                fontSize: "14px",
                                fontFamily: "var(--font-ibm-plex)",
                                outline: "none",
                                transition: "border-color 0.2s",
                              }}
                              onFocus={(e) => {
                                if (!phoneError) e.currentTarget.style.borderColor = "#2563EB";
                              }}
                              onBlur={(e) => {
                                if (!phoneError) e.currentTarget.style.borderColor = "#E5E7EB";
                              }}
                            />
                            {phoneError && (
                              <div style={{
                                fontSize: "12px",
                                color: "#DC2626",
                                marginTop: "6px",
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                              }}>
                                <AlertCircle size={14} />
                                {phoneError}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={handleAddWhatsAppNumber}
                            disabled={!newPhoneNumber.trim() || loading}
                            style={{
                              padding: "12px 20px",
                              background: "#25D366",
                              color: "white",
                              border: "none",
                              borderRadius: "8px",
                              fontSize: "14px",
                              fontWeight: 500,
                              cursor: !newPhoneNumber.trim() || loading ? "not-allowed" : "pointer",
                              opacity: !newPhoneNumber.trim() || loading ? 0.5 : 1,
                              transition: "all 0.2s",
                              whiteSpace: "nowrap",
                            }}
                            onMouseEnter={(e) => {
                              if (newPhoneNumber.trim() && !loading) {
                                e.currentTarget.style.background = "#1DA851";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (newPhoneNumber.trim() && !loading) {
                                e.currentTarget.style.background = "#25D366";
                              }
                            }}
                          >
                            {loading ? "Adding..." : "+ Add"}
                          </button>
                        </div>
                      </div>

                      {/* Approved Numbers List */}
                      <div>
                        <div style={{ fontSize: "12px", color: "#6B7280", fontWeight: 600, letterSpacing: "0.5px", marginBottom: "12px" }}>
                          APPROVED NUMBERS ({whatsappNumbers.length})
                        </div>
                        {whatsappNumbers.length === 0 ? (
                          <div style={{
                            textAlign: "center",
                            padding: "32px 24px",
                            background: "#F9FAFB",
                            borderRadius: "8px",
                            border: "2px dashed #E5E7EB",
                          }}>
                            <Phone size={32} style={{ color: "#D1D5DB", margin: "0 auto 12px" }} />
                            <div style={{ fontSize: "14px", color: "#6B7280", marginBottom: "8px" }}>
                              No approved numbers yet
                            </div>
                            <div style={{ fontSize: "13px", color: "#9CA3AF" }}>
                              Add phone numbers to enable WhatsApp access
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {whatsappNumbers.map((phone) => (
                              <div
                                key={phone}
                                style={{
                                  padding: "12px 16px",
                                  background: "#F0FDF4",
                                  border: "1px solid #86EFAC",
                                  borderRadius: "8px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                  <CheckCircle size={18} style={{ color: "#10B981" }} />
                                  <span style={{ fontSize: "14px", fontWeight: 500, color: "#1F2937", fontFamily: "monospace" }}>
                                    {phone}
                                  </span>
                                </div>
                                <button
                                  onClick={() => handleRemoveWhatsAppNumber(phone)}
                                  disabled={loading}
                                  style={{
                                    padding: "6px 12px",
                                    background: "transparent",
                                    border: "1px solid #DC2626",
                                    borderRadius: "6px",
                                    color: "#DC2626",
                                    fontSize: "12px",
                                    fontWeight: 500,
                                    cursor: loading ? "not-allowed" : "pointer",
                                    opacity: loading ? 0.5 : 1,
                                    transition: "all 0.2s",
                                  }}
                                  onMouseEnter={(e) => {
                                    if (!loading) {
                                      e.currentTarget.style.background = "#DC2626";
                                      e.currentTarget.style.color = "white";
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    if (!loading) {
                                      e.currentTarget.style.background = "transparent";
                                      e.currentTarget.style.color = "#DC2626";
                                    }
                                  }}
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Help Text */}
                      <div style={{
                        marginTop: "20px",
                        padding: "12px",
                        background: "#EFF6FF",
                        border: "1px solid #BFDBFE",
                        borderRadius: "8px",
                      }}>
                        <div style={{ fontSize: "12px", color: "#1E40AF", lineHeight: "1.6" }}>
                          <strong>How it works:</strong> Team members can WhatsApp hf.bluebook using their approved number. 
                          Only numbers in this list can access your organization&apos;s project data.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* MEMORY SETTINGS SECTION - COLLAPSIBLE */}
              <div style={{ marginBottom: "24px" }}>
                <button
                  onClick={() => setShowMemorySettings(!showMemorySettings)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: "8px 0",
                    marginBottom: "12px",
                  }}
                >
                  <h3 style={{
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "#6B7280",
                    margin: 0,
                    letterSpacing: "0.5px",
                  }}>
                    🧠 CHAT MEMORY
                  </h3>
                  {showMemorySettings ? <ChevronDown size={20} color="#6B7280" /> : <ChevronRight size={20} color="#6B7280" />}
                </button>

                {showMemorySettings && (
                  <div
                    style={{
                      background: "white",
                      border: "1px solid #E5E7EB",
                      borderRadius: "12px",
                      padding: "20px",
                    }}
                  >
                    {memorySuccess && (
                      <div style={{
                        padding: "12px 16px",
                        background: "#F0FDF4",
                        border: "1px solid #86EFAC",
                        borderRadius: "8px",
                        marginBottom: "16px",
                        color: "#166534",
                        fontSize: "14px",
                      }}>
                        {memorySuccess}
                      </div>
                    )}

                    <div style={{ marginBottom: "20px" }}>
                      <p style={{ fontSize: "14px", color: "#6B7280", margin: "0 0 16px 0", lineHeight: "1.6" }}>
                        hf.bluebook remembers your preferences and commonly used terms to provide better responses. 
                        You can clear all saved memory below.
                      </p>
                      
                      {/* Memory Count Display */}
                      <div style={{
                        padding: "16px",
                        background: "#F9FAFB",
                        borderRadius: "8px",
                        marginBottom: "16px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}>
                        <div>
                          <div style={{ fontSize: "12px", color: "#6B7280", fontWeight: 600, letterSpacing: "0.5px", marginBottom: "4px" }}>
                            STORED MEMORIES
                          </div>
                          <div style={{ fontSize: "24px", fontWeight: 600, color: "#2563EB", fontFamily: "var(--font-cormorant)" }}>
                            {memoryCount}
                          </div>
                        </div>
                        <User size={32} style={{ color: "#D1D5DB" }} />
                      </div>

                      {/* Clear Memory Button */}
                      <button
                        onClick={handleClearMemory}
                        disabled={clearingMemory || memoryCount === 0}
                        style={{
                          width: "100%",
                          padding: "12px",
                          background: clearingMemory || memoryCount === 0 ? "#F3F4F6" : "white",
                          color: clearingMemory || memoryCount === 0 ? "#9CA3AF" : "#DC2626",
                          border: `2px solid ${clearingMemory || memoryCount === 0 ? "#E5E7EB" : "#DC2626"}`,
                          borderRadius: "8px",
                          fontSize: "14px",
                          fontWeight: 500,
                          cursor: clearingMemory || memoryCount === 0 ? "not-allowed" : "pointer",
                          transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          if (!clearingMemory && memoryCount > 0) {
                            e.currentTarget.style.background = "#DC2626";
                            e.currentTarget.style.color = "white";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!clearingMemory && memoryCount > 0) {
                            e.currentTarget.style.background = "white";
                            e.currentTarget.style.color = "#DC2626";
                          }
                        }}
                      >
                        {clearingMemory ? "Clearing..." : memoryCount === 0 ? "No Memories to Clear" : "Clear All Memories"}
                      </button>
                    </div>

                    {/* Help Text */}
                    <div style={{
                      padding: "12px",
                      background: "#EFF6FF",
                      border: "1px solid #BFDBFE",
                      borderRadius: "8px",
                    }}>
                      <div style={{ fontSize: "12px", color: "#1E40AF", lineHeight: "1.6" }}>
                        <strong>Examples of what&apos;s remembered:</strong> Unit preferences (metric/imperial), 
                        commonly used industry terms, project context, and your communication style preferences.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!showCreateOrg && !showInviteForm && (
          <div style={{ borderTop: "1px solid #E5E7EB", padding: "1rem 1.5rem", background: "white" }}>
            <button
              onClick={handleSignOut}
              style={{
                width: "100%",
                padding: "14px",
                background: "transparent",
                color: "#DC2626",
                border: "2px solid #DC2626",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#DC2626";
                e.currentTarget.style.color = "white";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "#DC2626";
              }}
            >
              <LogOut size={18} />
              Sign Out
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
