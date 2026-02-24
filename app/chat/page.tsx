"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import ChatInput from "@/components/ChatInput";
import {
  Loader2, X, FileSpreadsheet, Calendar, HardDrive, AlertCircle, Cloud,
  Folder, ChevronRight, Info, Download, FileText, ChevronDown, History,
  FileDown, FileType, Sparkles, Clock, MessageSquare, ShoppingCart, ExternalLink
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import jsPDF from "jspdf";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";

// ⭐ Task 7: Updated message type with mode
type ChatProduct = {
  id: string;
  product_name: string;
  product_code?: string;
  pillar: string;
  description?: string;
  sell_price?: number;
  list_price?: number;
  manufacturer_id?: string;
};

type Msg = {
  role: "user" | "assistant";
  content: string;
  mode?: "GENERAL" | "PROJECT" | "BOTH" | "PRODUCT" | "KNOWLEDGE" | "FULL" | null;
  products?: ChatProduct[];
};

interface OneDriveFile {
  id: string;
  name: string;
  size: number;
  webUrl: string;
  lastModifiedDateTime: string;
  type: 'file';
}

interface OneDriveFolder {
  id: string;
  name: string;
  type: 'folder';
  childCount: number;
}

interface BreadcrumbItem {
  id: string | null;
  name: string;
}

interface SharePointSite {
  id: string;
  name: string;
  displayName: string;
  webUrl: string;
}

interface SharePointLibrary {
  id: string;
  name: string;
  webUrl: string;
  driveType: string;
}

// ⭐ Task 4: Recent conversation type
interface RecentConversation {
  id: string;
  name: string;
  updated_at: string;
  chat_history: Msg[];
  organization_id: string;
}

export default function ChatPage() {
  const router = useRouter();
  const [microsoftConnected, setMicrosoftConnected] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [showProjectList, setShowProjectList] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loadedProjectName, setLoadedProjectName] = useState<string | null>(null);
  const [loadedProjectId, setLoadedProjectId] = useState<string | null>(null);
  const [loadedOrgName, setLoadedOrgName] = useState<string | null>(null);
  const [loadedFileName, setLoadedFileName] = useState<string | null>(null);

  // ⭐ Task 6: Mode Override State
  const [modeOverride, setModeOverride] = useState<"AUTO" | "GENERAL" | "PROJECT" | "BOTH" | "PRODUCT" | "KNOWLEDGE" | "FULL">("AUTO");
  const [showModeDropdown, setShowModeDropdown] = useState(false);

  // ⭐ Task 4: Recent Conversations State
  const [showRecentDrawer, setShowRecentDrawer] = useState(false);
  const [recentConversations, setRecentConversations] = useState<RecentConversation[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);

  // ⭐ Task 8: Summary Report State
  const [generatingSummary, setGeneratingSummary] = useState(false);

  // Quote integration state
  const [activeQuoteId, setActiveQuoteId] = useState<string | null>(null);
  const [activeQuoteNumber, setActiveQuoteNumber] = useState<string | null>(null);
  const [quoteToast, setQuoteToast] = useState<string | null>(null);

  // Chat persistence state
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [localConversations, setLocalConversations] = useState<{ id: string; title: string; messages: Msg[]; updatedAt: string }[]>([]);

  // Refs to break dependency cycles
  const messagesRef = useRef<Msg[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keep ref in sync with state + persist to localStorage
  useEffect(() => {
    messagesRef.current = messages;
    // Auto-scroll to bottom on new messages
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    // Persist conversation to localStorage
    if (messages.length > 0) {
      let convId = conversationId;
      if (!convId) {
        convId = `conv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        setConversationId(convId);
      }
      const title = messages[0]?.content?.slice(0, 60) || "Untitled";
      try {
        const stored = localStorage.getItem("melvin-conversations");
        const convs: { id: string; title: string; messages: Msg[]; updatedAt: string }[] = stored ? JSON.parse(stored) : [];
        const idx = convs.findIndex((c) => c.id === convId);
        const entry = { id: convId, title, messages, updatedAt: new Date().toISOString() };
        if (idx >= 0) {
          convs[idx] = entry;
        } else {
          convs.unshift(entry);
        }
        // Keep max 20 conversations
        localStorage.setItem("melvin-conversations", JSON.stringify(convs.slice(0, 20)));
      } catch { /* localStorage full or unavailable */ }
    }
  }, [messages, conversationId]);

  // ⭐ Task 9/10/11: Export dropdown state
  const [showExportDropdown, setShowExportDropdown] = useState(false);

  // M365 Modal State
  const [showM365Modal, setShowM365Modal] = useState(false);
  const [activeTab, setActiveTab] = useState<'onedrive' | 'sharepoint'>('onedrive');
  
  // OneDrive State
  const [m365Files, setM365Files] = useState<OneDriveFile[]>([]);
  const [m365Folders, setM365Folders] = useState<OneDriveFolder[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderBreadcrumb, setFolderBreadcrumb] = useState<BreadcrumbItem[]>([{ id: null, name: 'OneDrive' }]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  
  // SharePoint State
  const [sharePointSites, setSharePointSites] = useState<SharePointSite[]>([]);
  const [selectedSite, setSelectedSite] = useState<string | null>(null);
  const [sharePointLibraries, setSharePointLibraries] = useState<SharePointLibrary[]>([]);
  const [selectedLibrary, setSelectedLibrary] = useState<string | null>(null);
  const [sharePointFiles, setSharePointFiles] = useState<OneDriveFile[]>([]);
  const [isLoadingSites, setIsLoadingSites] = useState(false);
  const [isLoadingLibraries, setIsLoadingLibraries] = useState(false);
  const [isLoadingSharePointFiles, setIsLoadingSharePointFiles] = useState(false);
  
  // Common M365 State
  const [isImporting, setIsImporting] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [m365Error, setM365Error] = useState<string>("");
  const [isPersonalAccount, setIsPersonalAccount] = useState(false);

  // Check if user is authenticated
  useEffect(() => {
    checkAuth();
    // Load local conversations from localStorage
    try {
      const stored = localStorage.getItem("melvin-conversations");
      if (stored) setLocalConversations(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  // Listen for M365 status changes from ProfileDrawer
  useEffect(() => {
    const handleM365Change = (e: Event) => {
      const customEvent = e as CustomEvent;
      setMicrosoftConnected(customEvent.detail.connected);
    };
    
    window.addEventListener('m365StatusChanged', handleM365Change);
    return () => window.removeEventListener('m365StatusChanged', handleM365Change);
  }, []);

  // Emit project/file name to ChatDrawerWrapper when it changes
  useEffect(() => {
    if (loadedProjectName || loadedFileName) {
      const event = new CustomEvent('projectLoaded', {
        detail: { 
          projectName: loadedProjectName,
          fileName: loadedFileName 
        }
      });
      window.dispatchEvent(event);
    }
  }, [loadedProjectName, loadedFileName]);

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user || null);
    
    // Check Microsoft connection status
    if (session?.user) {
      const { data } = await supabase
        .from("users")
        .select("microsoft_access_token, email")
        .eq("id", session.user.id)
        .single();
      
      setMicrosoftConnected(!!data?.microsoft_access_token);
      
      // Detect personal account
      if (data?.email) {
        const email = data.email.toLowerCase();
        const isPersonal = email.includes('@outlook.com') || 
                          email.includes('@hotmail.com') || 
                          email.includes('@live.com');
        setIsPersonalAccount(isPersonal);
      }
    }
  }

  // ⭐ Task 4: Load recent conversations
  async function loadRecentConversations() {
    if (!user) return;
    
    setLoadingRecent(true);
    try {
      const { data: userData } = await supabase
        .from("users")
        .select("active_organization_id")
        .eq("id", user.id)
        .single();

      const orgId = userData?.active_organization_id;

      let query = supabase
        .from("projects")
        .select("id, name, updated_at, chat_history, organization_id")
        .eq("is_archived", false)
        .not("chat_history", "is", null)
        .order("updated_at", { ascending: false })
        .limit(10);

      if (orgId) {
        query = query.eq("organization_id", orgId);
      } else {
        query = query.eq("user_id", user.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Filter to only show projects with actual chat history
      const withChats = (data || []).filter(p => 
        p.chat_history && Array.isArray(p.chat_history) && p.chat_history.length > 0
      );
      
      setRecentConversations(withChats);
    } catch (err) {
      console.error("Failed to load recent conversations:", err);
    } finally {
      setLoadingRecent(false);
    }
  }

  // M365 File Loading Functions
  async function loadM365Files(folderId: string | null = null) {
    setIsLoadingFiles(true);
    setM365Error('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Please sign in to access OneDrive');

      const url = folderId 
        ? `/api/microsoft/files?userId=${user.id}&folderId=${folderId}`
        : `/api/microsoft/files?userId=${user.id}`;

      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 401) {
          throw new Error('Microsoft 365 connection expired. Please reconnect your account.');
        } else if (response.status === 404) {
          throw new Error('OneDrive folder not found. It may have been moved or deleted.');
        } else if (response.status === 403) {
          throw new Error('Access denied. Please check your OneDrive permissions.');
        } else {
          throw new Error(errorData.error || 'Unable to load OneDrive files. Please try again.');
        }
      }

      const data = await response.json();
      setM365Folders(data.folders || []);
      setM365Files(data.files || []);
      setCurrentFolderId(folderId);
    } catch (err: any) {
      console.error('Error loading files:', err);
      setM365Error(err.message || 'Failed to load OneDrive files');
    } finally {
      setIsLoadingFiles(false);
    }
  }

  function navigateToFolder(folderId: string, folderName: string) {
    setFolderBreadcrumb(prev => [...prev, { id: folderId, name: folderName }]);
    loadM365Files(folderId);
  }

  function navigateToBreadcrumb(index: number) {
    const newBreadcrumb = folderBreadcrumb.slice(0, index + 1);
    setFolderBreadcrumb(newBreadcrumb);
    const targetFolder = newBreadcrumb[newBreadcrumb.length - 1];
    loadM365Files(targetFolder.id);
  }

  async function loadSharePointSites() {
    setIsLoadingSites(true);
    setM365Error('');

    try {
      const response = await fetch('/api/microsoft/sites');
      
      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 403 && isPersonalAccount) {
          throw new Error('SharePoint is only available with work or school Microsoft 365 accounts.');
        }
        throw new Error(errorData.error || 'Unable to load SharePoint sites.');
      }

      const data = await response.json();
      setSharePointSites(data.sites || []);
    } catch (err: any) {
      setM365Error(err.message);
    } finally {
      setIsLoadingSites(false);
    }
  }

  async function handleM365Import(fileId: string, fileName: string) {
    setIsImporting(true);
    setSelectedFileId(fileId);
    setM365Error('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Session expired. Please sign in again.');

      const response = await fetch('/api/microsoft/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ fileId, fileName }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Import failed. Please try again.');
      }

      const result = await response.json();
      
      localStorage.setItem('uploadedData', JSON.stringify(result.data));
      localStorage.setItem('uploadedFileName', fileName);
      
      setShowM365Modal(false);
      setSaveSuccess(`✅ ${fileName} imported successfully with ${result.data.totalRows} rows.`);
      
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      console.error('Error importing file:', err);
      setM365Error(err.message || 'Failed to import file');
    } finally {
      setIsImporting(false);
      setSelectedFileId(null);
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    
    return date.toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  }

  // ⭐ Task 7: Map API source to friendly mode name
  function mapSourceToMode(source: string, mode?: string): "GENERAL" | "PROJECT" | "BOTH" | "PRODUCT" | "KNOWLEDGE" | "FULL" | null {
    // If the API returns a mode field, use that directly
    if (mode) {
      const validModes = ["GENERAL", "PROJECT", "BOTH", "PRODUCT", "KNOWLEDGE", "FULL"];
      if (validModes.includes(mode)) return mode as any;
    }
    switch (source) {
      case "general_knowledge":
      case "general_fallback":
        return "GENERAL";
      case "project_data":
      case "no_data":
        return "PROJECT";
      case "product_catalog":
        return "PRODUCT";
      case "knowledge_base":
        return "KNOWLEDGE";
      case "full_combined":
        return "FULL";
      case "hybrid":
        return "BOTH";
      default:
        return null;
    }
  }

  // ⭐ Task 10: Export chat as Markdown
  function exportAsMarkdown() {
    const projectTitle = loadedProjectName || loadedFileName || "hf.bluebook Conversation";
    const timestamp = new Date().toISOString().split('T')[0];
    
    let markdown = `# ${projectTitle}\n`;
    markdown += `**Exported**: ${new Date().toLocaleString('en-GB')}\n`;
    if (loadedOrgName) markdown += `**Organization**: ${loadedOrgName}\n`;
    markdown += `\n---\n\n`;

    messages.forEach((msg) => {
      const role = msg.role === "user" ? "**You**" : "**hf.bluebook**";
      const modeTag = msg.mode ? ` \`${msg.mode}\`` : "";
      markdown += `${role}${modeTag}:\n${msg.content}\n\n`;
    });

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectTitle.replace(/[^a-z0-9]/gi, '_')}_${timestamp}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setSaveSuccess("✅ Exported as Markdown");
    setShowExportDropdown(false);
  }

  // ⭐ Task 9: Export chat as PDF
  function exportAsPDF() {
    const projectTitle = loadedProjectName || loadedFileName || "hf.bluebook Conversation";
    const timestamp = new Date().toISOString().split('T')[0];
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const maxWidth = pageWidth - (margin * 2);
    let yPosition = 20;

    // Title
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(projectTitle, margin, yPosition);
    yPosition += 10;

    // Metadata
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(`Exported: ${new Date().toLocaleString('en-GB')}`, margin, yPosition);
    yPosition += 5;
    if (loadedOrgName) {
      doc.text(`Organization: ${loadedOrgName}`, margin, yPosition);
      yPosition += 5;
    }
    yPosition += 10;

    // Messages
    doc.setTextColor(0);
    messages.forEach((msg) => {
      // Check if we need a new page
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }

      // Role header
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      const roleText = msg.role === "user" ? "You" : "hf.bluebook";
      const modeText = msg.mode ? ` [${msg.mode}]` : "";
      doc.setTextColor(msg.role === "user" ? 37 : 16, msg.role === "user" ? 99 : 185, msg.role === "user" ? 235 : 129);
      doc.text(`${roleText}${modeText}:`, margin, yPosition);
      yPosition += 6;

      // Message content
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0);
      const lines = doc.splitTextToSize(msg.content, maxWidth);
      lines.forEach((line: string) => {
        if (yPosition > 280) {
          doc.addPage();
          yPosition = 20;
        }
        doc.text(line, margin, yPosition);
        yPosition += 5;
      });
      yPosition += 8;
    });

    doc.save(`${projectTitle.replace(/[^a-z0-9]/gi, '_')}_${timestamp}.pdf`);
    setSaveSuccess("✅ Exported as PDF");
    setShowExportDropdown(false);
  }

  // ⭐ Task 11: Export chat as Word
  async function exportAsWord() {
    const projectTitle = loadedProjectName || loadedFileName || "hf.bluebook Conversation";
    const timestamp = new Date().toISOString().split('T')[0];

    const children: any[] = [];

    // Title
    children.push(
      new Paragraph({
        text: projectTitle,
        heading: HeadingLevel.HEADING_1,
      })
    );

    // Metadata
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `Exported: ${new Date().toLocaleString('en-GB')}`, italics: true, color: "666666" }),
        ],
      })
    );

    if (loadedOrgName) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `Organization: ${loadedOrgName}`, italics: true, color: "666666" }),
          ],
        })
      );
    }

    children.push(new Paragraph({ text: "" })); // Spacer

    // Messages
    messages.forEach((msg) => {
      const roleText = msg.role === "user" ? "You" : "hf.bluebook";
      const modeText = msg.mode ? ` [${msg.mode}]` : "";
      
      children.push(
        new Paragraph({
          children: [
            new TextRun({ 
              text: `${roleText}${modeText}:`, 
              bold: true,
              color: msg.role === "user" ? "2563EB" : "10B981"
            }),
          ],
        })
      );

      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: msg.content }),
          ],
        })
      );

      children.push(new Paragraph({ text: "" })); // Spacer
    });

    const doc = new Document({
      sections: [{
        properties: {},
        children: children,
      }],
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectTitle.replace(/[^a-z0-9]/gi, '_')}_${timestamp}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setSaveSuccess("✅ Exported as Word");
    setShowExportDropdown(false);
  }

  // ⭐ Task 8: Generate Summary Report
  async function generateSummaryReport() {
    if (messages.length < 2) {
      setSaveSuccess("❌ Need at least one conversation to summarize");
      return;
    }

    setGeneratingSummary(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch("/api/summary-report", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token || ""}`,
        },
        body: JSON.stringify({
          messages,
          projectName: loadedProjectName || loadedFileName || "Untitled",
          orgName: loadedOrgName,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate summary");

      // Add summary as a new assistant message
      const summaryMsg: Msg = {
        role: "assistant",
        content: `📊 **Summary Report**\n\n${data.summary}`,
        mode: "GENERAL",
      };
      setMessages((m) => [...m, summaryMsg]);
      setSaveSuccess("✅ Summary report generated");
    } catch (err: any) {
      console.error("Summary error:", err);
      setSaveSuccess(`❌ ${err.message}`);
    } finally {
      setGeneratingSummary(false);
    }
  }

  // ⭐ Task 4: Load a recent conversation
  function loadConversation(conv: RecentConversation) {
    // Update state directly instead of reloading
    setLoadedProjectId(conv.id);
    setLoadedProjectName(conv.name);
    setMessages(conv.chat_history || []);
    localStorage.setItem("loadedProjectId", conv.id);
    localStorage.setItem("loadedProjectName", conv.name);
    setShowRecentDrawer(false);
    setSaveSuccess(`Loaded: ${conv.name}`);
  }

  const handleSend = useCallback(async (text: string) => {
    if (!text.trim()) return;
    const userMsg: Msg = { role: "user", content: text };
    setMessages((m) => [...m, userMsg]);
    setLoading(true);

    try {
      let parsedDataset: any = null;
      const uploaded = localStorage.getItem("uploadedData");
      if (uploaded) {
        try {
          const data = JSON.parse(uploaded);
          if (Array.isArray(data)) {
            parsedDataset = { rows: data };
          } else if (Array.isArray(data.rows)) {
            parsedDataset = { rows: data.rows };
          } else if (Array.isArray(data.data)) {
            parsedDataset = { rows: data.data };
          }
        } catch {
          parsedDataset = null;
        }
      }

      const session = (await supabase.auth.getSession()).data.session;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch("/api/hybrid-chat", {
        method: "POST",
        headers,
        body: JSON.stringify({
          question: text,
          history: messagesRef.current,
          dataset: parsedDataset,
          userId: user?.id || null,
          projectId: loadedProjectId,
          token: session?.access_token || null,
          modeOverride: modeOverride !== "AUTO" ? modeOverride : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Chat failed");

      const mode = mapSourceToMode(data.source, data.mode);
      const reply: Msg = {
        role: "assistant",
        content: data.answer,
        mode: mode,
        products: data.products || undefined,
      };
      setMessages((m) => [...m, reply]);
    } catch (err: any) {
      const errMsg = err.message || "Chat failed.";
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `Error: ${errMsg}`, mode: null } as Msg,
      ]);
    } finally {
      setLoading(false);
    }
  }, [user, loadedProjectId, modeOverride]);

  // Add product to quote from chat
  const handleAddToQuote = useCallback(async (product: ChatProduct) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    };

    let quoteId = activeQuoteId;
    let quoteNum = activeQuoteNumber;

    // Create a new quote if we don't have one
    if (!quoteId) {
      const qRes = await fetch("/api/quotes", {
        method: "POST",
        headers,
        body: JSON.stringify({
          client_name: "Draft",
          quote_name: "From Melvin Chat",
        }),
      });
      if (!qRes.ok) {
        setQuoteToast("Failed to create quote");
        setTimeout(() => setQuoteToast(null), 3000);
        return;
      }
      const qData = await qRes.json();
      quoteId = qData.quote.id;
      quoteNum = qData.quote.quote_number;
      setActiveQuoteId(quoteId);
      setActiveQuoteNumber(quoteNum);
    }

    // Add line item
    const liRes = await fetch(`/api/quotes/${quoteId}/line-items`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        product_id: product.id,
        description: product.product_name,
        quantity: 1,
        unit_price: product.sell_price || product.list_price || 0,
        unit: "each",
        product_code: product.product_code || null,
      }),
    });

    if (liRes.ok) {
      setQuoteToast(`Added to ${quoteNum}`);
    } else {
      setQuoteToast("Failed to add to quote");
    }
    setTimeout(() => setQuoteToast(null), 4000);
  }, [activeQuoteId, activeQuoteNumber]);

  // Load restored project data on mount
  const handleSendRef = useRef(handleSend);
  useEffect(() => { handleSendRef.current = handleSend; }, [handleSend]);

  useEffect(() => {
    const stored = localStorage.getItem("userMessage");
    if (stored) {
      localStorage.removeItem("userMessage");
      // Use ref to avoid stale closure
      setTimeout(() => handleSendRef.current(stored), 100);
    }

    const projectName = localStorage.getItem("loadedProjectName");
    const projectId = localStorage.getItem("loadedProjectId");
    const orgName = localStorage.getItem("loadedOrgName");
    const fileName = localStorage.getItem("loadedFileName");

    if (projectName) setLoadedProjectName(projectName);
    if (projectId) setLoadedProjectId(projectId);
    if (orgName) setLoadedOrgName(orgName);
    if (fileName) setLoadedFileName(fileName);

    const loadedHistory = localStorage.getItem("loadedChatHistory");
    if (loadedHistory) {
      try {
        const parsedHistory = JSON.parse(loadedHistory);
        setMessages(parsedHistory);
        localStorage.removeItem("loadedChatHistory");
        setSaveSuccess(`Loaded: ${projectName || "Unknown"}`);
      } catch (err) {
        console.error("Failed to load chat history:", err);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Smart Save shows after 8s of inactivity
  useEffect(() => {
    if (showPrompt || messages.length < 2 || saveSuccess) return;
    const timer = setTimeout(() => {
      if (!loading) setShowPrompt(true);
    }, 8000);
    return () => clearTimeout(timer);
  }, [messages, loading, showPrompt, saveSuccess]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const uploadedData = localStorage.getItem("uploadedData");
      const fileName = localStorage.getItem("uploadedFileName") || "dataset.xlsx";

      if (!uploadedData) {
        setSaveSuccess("❌ No dataset found to save");
        setSaving(false);
        setShowPrompt(false);
        return;
      }

      const fileData = JSON.parse(uploadedData);
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || null;

      const res = await fetch("/api/smart-save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          fileData,
          fileName,
          messages,
          userId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save project");

      setSaveSuccess(data.message);
      setShowPrompt(false);
    } catch (err: any) {
      console.error("Save error:", err);
      setSaveSuccess(`❌ Failed to save: ${err.message}`);
      setShowPrompt(false);
    } finally {
      setSaving(false);
    }
  };

  const handleAttach = async () => {
    if (!user) {
      setShowPrompt(false);
      setShowProjectList(true);
      setLoadingProjects(false);
      return;
    }

    setShowPrompt(false);
    setShowProjectList(true);
    setLoadingProjects(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/list-projects", {
        headers: { "Authorization": `Bearer ${session?.access_token}` },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load projects");
      setProjects(data.projects || []);
    } catch (err: any) {
      console.error("Load projects error:", err);
      setSaveSuccess(`❌ ${err.message}`);
      setShowProjectList(false);
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleConnectMS = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const returnContext = {
        userId: user.id,
        returnTo: 'chat',
        projectId: loadedProjectId,
        projectName: loadedProjectName,
      };
      const state = Buffer.from(JSON.stringify(returnContext)).toString('base64');
      window.location.href = `/api/microsoft/auth?userId=${user.id}&state=${state}`;
    } else {
      setSaveSuccess("❌ Please sign in first");
      setShowPrompt(false);
    }
  };

  const handleDisconnectMS = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch("/api/microsoft/disconnect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
      });

      if (!res.ok) throw new Error("Failed to disconnect");

      setMicrosoftConnected(false);
      setSaveSuccess("✅ Microsoft 365 disconnected");
      setShowPrompt(false);
    } catch (err: any) {
      console.error("Disconnect error:", err);
      setSaveSuccess(`❌ Failed to disconnect: ${err.message}`);
    }
  };

  const handleDiscard = () => setShowPrompt(false);

  // ⭐ Task 6: Mode Override Dropdown Component
  const ModeOverrideDropdown = () => (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setShowModeDropdown(!showModeDropdown)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "8px 12px",
          fontSize: "12px",
          fontWeight: 500,
          fontFamily: "var(--font-ibm-plex)",
          background: modeOverride === "AUTO" ? "#F3F4F6" :
                     modeOverride === "GENERAL" ? "#DBEAFE" :
                     modeOverride === "PROJECT" ? "#D1FAE5" :
                     modeOverride === "PRODUCT" ? "#EDE9FE" :
                     modeOverride === "KNOWLEDGE" ? "#FEE2E2" :
                     modeOverride === "FULL" ? "#F0FDFA" : "#FEF3C7",
          color: modeOverride === "AUTO" ? "#6B7280" :
                 modeOverride === "GENERAL" ? "#1D4ED8" :
                 modeOverride === "PROJECT" ? "#059669" :
                 modeOverride === "PRODUCT" ? "#7C3AED" :
                 modeOverride === "KNOWLEDGE" ? "#DC2626" :
                 modeOverride === "FULL" ? "#0D9488" : "#D97706",
          border: "1px solid",
          borderColor: modeOverride === "AUTO" ? "#E5E7EB" :
                       modeOverride === "GENERAL" ? "#93C5FD" :
                       modeOverride === "PROJECT" ? "#6EE7B7" :
                       modeOverride === "PRODUCT" ? "#C4B5FD" :
                       modeOverride === "KNOWLEDGE" ? "#FCA5A5" :
                       modeOverride === "FULL" ? "#5EEAD4" : "#FCD34D",
          borderRadius: "8px",
          cursor: "pointer",
          transition: "all 0.2s",
          whiteSpace: "nowrap",
        }}
      >
        Mode: {modeOverride}
        <ChevronDown size={14} />
      </button>

      {showModeDropdown && (
        <>
          <div
            onClick={() => setShowModeDropdown(false)}
            style={{ position: "fixed", inset: 0, zIndex: 40 }}
          />
          
          <div
            style={{
              position: "absolute",
              bottom: "100%",
              left: 0,
              marginBottom: "4px",
              background: "white",
              border: "1px solid #E5E7EB",
              borderRadius: "8px",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
              zIndex: 50,
              minWidth: "180px",
              overflow: "hidden",
            }}
          >
            {[
              { value: "AUTO", label: "Auto (Smart)", desc: "AI decides best mode", color: "#6B7280", disabled: false },
              { value: "GENERAL", label: "General", desc: "Industry knowledge only", color: "#1D4ED8", disabled: false },
              { value: "PROJECT", label: "Project", desc: "Your Excel data", color: "#059669", disabled: false },
              { value: "PRODUCT", label: "Product", desc: "Product catalog search", color: "#7C3AED", disabled: false },
              { value: "KNOWLEDGE", label: "Knowledge", desc: "Bluebook PDFs + compliance", color: "#DC2626", disabled: false },
              { value: "FULL", label: "Full", desc: "Everything combined", color: "#0D9488", disabled: false },
              { value: "BOTH", label: "Both (Legacy)", desc: "Knowledge + your data", color: "#D97706", disabled: false },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  if (!option.disabled) {
                    setModeOverride(option.value as any);
                    setShowModeDropdown(false);
                  }
                }}
                disabled={option.disabled}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  fontSize: "13px",
                  fontFamily: "var(--font-ibm-plex)",
                  background: modeOverride === option.value ? "#F9FAFB" : "white",
                  border: "none",
                  borderBottom: "1px solid #F3F4F6",
                  cursor: option.disabled ? "not-allowed" : "pointer",
                  opacity: option.disabled ? 0.5 : 1,
                  textAlign: "left",
                  display: "flex",
                  flexDirection: "column",
                  gap: "2px",
                }}
                onMouseEnter={(e) => { if (!option.disabled) e.currentTarget.style.background = "#F9FAFB"; }}
                onMouseLeave={(e) => { if (!option.disabled) e.currentTarget.style.background = modeOverride === option.value ? "#F9FAFB" : "white"; }}
              >
                <span style={{ fontWeight: 500, color: option.color }}>{option.label}</span>
                <span style={{ fontSize: "11px", color: "#9CA3AF" }}>{option.desc}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );

  // ⭐ Task 7: Mode Badge Component
  const ModeBadge = ({ mode }: { mode: "GENERAL" | "PROJECT" | "BOTH" | "PRODUCT" | "KNOWLEDGE" | "FULL" | null }) => {
    if (!mode) return null;

    const config: Record<string, { bg: string; color: string; border: string }> = {
      GENERAL: { bg: "#DBEAFE", color: "#1D4ED8", border: "#93C5FD" },
      PROJECT: { bg: "#D1FAE5", color: "#059669", border: "#6EE7B7" },
      PRODUCT: { bg: "#EDE9FE", color: "#7C3AED", border: "#C4B5FD" },
      KNOWLEDGE: { bg: "#FEE2E2", color: "#DC2626", border: "#FCA5A5" },
      FULL: { bg: "#F0FDFA", color: "#0D9488", border: "#5EEAD4" },
      BOTH: { bg: "#FEF3C7", color: "#D97706", border: "#FCD34D" },
    };
    
    const style = config[mode];
    
    return (
      <span
        style={{
          display: "inline-block",
          padding: "2px 6px",
          fontSize: "10px",
          fontWeight: 600,
          fontFamily: "var(--font-ibm-plex)",
          background: style.bg,
          color: style.color,
          border: `1px solid ${style.border}`,
          borderRadius: "4px",
          marginLeft: "8px",
          verticalAlign: "middle",
        }}
      >
        {mode}
      </span>
    );
  };

  // ⭐ Task 9/10/11: Export Dropdown Component
  const ExportDropdown = () => (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setShowExportDropdown(!showExportDropdown)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "6px 12px",
          fontSize: "12px",
          fontWeight: 500,
          background: "white",
          color: "#6B7280",
          border: "1px solid #E5E7EB",
          borderRadius: "6px",
          cursor: "pointer",
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#F9FAFB";
          e.currentTarget.style.color = "#374151";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "white";
          e.currentTarget.style.color = "#6B7280";
        }}
      >
        <Download size={14} />
        Export
        <ChevronDown size={12} />
      </button>

      {showExportDropdown && (
        <>
          <div
            onClick={() => setShowExportDropdown(false)}
            style={{ position: "fixed", inset: 0, zIndex: 40 }}
          />
          
          <div
            style={{
              position: "absolute",
              top: "100%",
              right: 0,
              marginTop: "4px",
              background: "white",
              border: "1px solid #E5E7EB",
              borderRadius: "8px",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
              zIndex: 50,
              minWidth: "160px",
              overflow: "hidden",
            }}
          >
            <button
              onClick={exportAsMarkdown}
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: "13px",
                fontFamily: "var(--font-ibm-plex)",
                background: "white",
                border: "none",
                borderBottom: "1px solid #F3F4F6",
                cursor: "pointer",
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#F9FAFB"}
              onMouseLeave={(e) => e.currentTarget.style.background = "white"}
            >
              <FileText size={16} color="#6B7280" />
              Markdown (.md)
            </button>
            
            <button
              onClick={exportAsPDF}
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: "13px",
                fontFamily: "var(--font-ibm-plex)",
                background: "white",
                border: "none",
                borderBottom: "1px solid #F3F4F6",
                cursor: "pointer",
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#F9FAFB"}
              onMouseLeave={(e) => e.currentTarget.style.background = "white"}
            >
              <FileDown size={16} color="#DC2626" />
              PDF (.pdf)
            </button>
            
            <button
              onClick={exportAsWord}
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: "13px",
                fontFamily: "var(--font-ibm-plex)",
                background: "white",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#F9FAFB"}
              onMouseLeave={(e) => e.currentTarget.style.background = "white"}
            >
              <FileType size={16} color="#2563EB" />
              Word (.docx)
            </button>
          </div>
        </>
      )}
    </div>
  );

  const SmartSaveBubble = () => (
    <div className="flex justify-start">
      <div
        className="bg-white border border-gray-200 rounded-2xl rounded-bl-none shadow-sm px-4 py-3 text-gray-800 max-w-[80%]"
        style={{ fontFamily: "var(--font-ibm-plex)" }}
      >
        <p className="font-medium mb-2 text-sm">💡 Save this session?</p>
        <p className="text-sm text-gray-600 mb-3">
          Save this chat, generate a summary, export it, or connect Microsoft 365.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#2563EB] text-white text-xs px-3 py-1.5 rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-1"
          >
            {saving && <Loader2 className="w-3 h-3 animate-spin" />}
            {saving ? "Saving..." : "Save Project"}
          </button>
          <button
            onClick={handleAttach}
            className="bg-gray-100 text-gray-800 text-xs px-3 py-1.5 rounded-lg hover:bg-gray-200 border border-gray-300"
          >
            Attach to Existing
          </button>
          {/* ⭐ Task 8: Summary button */}
          <button
            onClick={generateSummaryReport}
            disabled={generatingSummary}
            className="bg-purple-600 text-white text-xs px-3 py-1.5 rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-1"
          >
            {generatingSummary ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            {generatingSummary ? "Generating..." : "Summary"}
          </button>
          {microsoftConnected && (
            <button
              onClick={() => {
                setShowM365Modal(true);
                loadM365Files();
              }}
              className="bg-[#107C10] text-white text-xs px-3 py-1.5 rounded-lg hover:opacity-90 flex items-center gap-1"
            >
              <Cloud className="w-3 h-3" />
              Import Files
            </button>
          )}
          <button
            onClick={microsoftConnected ? handleDisconnectMS : handleConnectMS}
            className={`${
              microsoftConnected 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-[#107C10] hover:opacity-90'
            } text-white text-xs px-3 py-1.5 rounded-lg`}
          >
            {microsoftConnected ? 'Disconnect M365' : 'Connect M365'}
          </button>
          {/* Export buttons */}
          <button
            onClick={exportAsMarkdown}
            className="bg-gray-100 text-gray-800 text-xs px-3 py-1.5 rounded-lg hover:bg-gray-200 border border-gray-300 flex items-center gap-1"
          >
            <FileText className="w-3 h-3" />
            .md
          </button>
          <button
            onClick={exportAsPDF}
            className="bg-gray-100 text-gray-800 text-xs px-3 py-1.5 rounded-lg hover:bg-gray-200 border border-gray-300 flex items-center gap-1"
          >
            <FileDown className="w-3 h-3" />
            .pdf
          </button>
          <button
            onClick={exportAsWord}
            className="bg-gray-100 text-gray-800 text-xs px-3 py-1.5 rounded-lg hover:bg-gray-200 border border-gray-300 flex items-center gap-1"
          >
            <FileType className="w-3 h-3" />
            .docx
          </button>
          <button
            onClick={handleDiscard}
            className="text-gray-500 text-xs px-3 py-1.5 rounded-lg hover:text-gray-700"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );

  const SuccessMessage = ({ message }: { message: string }) => (
    <div className="flex justify-start">
      <div
        className={`${message.includes("❌") ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"} border rounded-2xl rounded-bl-none shadow-sm px-4 py-3 text-gray-800 max-w-[80%]`}
        style={{ fontFamily: "var(--font-ibm-plex)" }}
      >
        <p className={`text-sm font-medium ${message.includes("❌") ? "text-red-800" : "text-green-800"}`}>{message}</p>
        <button
          onClick={() => setSaveSuccess(null)}
          className={`mt-2 text-xs ${message.includes("❌") ? "text-red-600 hover:text-red-700" : "text-green-600 hover:text-green-700"} underline`}
        >
          Dismiss
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div className="flex flex-col h-full bg-[#FCFCFA]">
        {/* Header Bar with Project Info + Actions */}
        <div style={{
          padding: "12px 20px",
          borderBottom: "1px solid #E5E7EB",
          background: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
        }}>
          {/* Left: Project info + New Chat */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: 0 }}>
            {(loadedProjectName || loadedFileName) ? (
              <div style={{
                fontFamily: "var(--font-ibm-plex)",
                fontSize: "13px",
                color: "#2563EB",
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: "8px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
                📂 {loadedFileName || loadedProjectName}
                {loadedOrgName && <span style={{ color: "#6B7280", fontWeight: 400 }}> • {loadedOrgName}</span>}
              </div>
            ) : (
              <div style={{
                fontFamily: "var(--font-ibm-plex)",
                fontSize: "13px",
                color: "#9CA3AF",
              }}>
                New conversation
              </div>
            )}
            {messages.length > 0 && (
              <button
                onClick={() => {
                  setMessages([]);
                  setConversationId(null);
                  setActiveQuoteId(null);
                  setActiveQuoteNumber(null);
                  setLoadedProjectId(null);
                  setLoadedProjectName(null);
                  setLoadedFileName(null);
                  setSaveSuccess(null);
                  setShowPrompt(false);
                }}
                style={{
                  padding: "4px 10px",
                  fontSize: 11,
                  fontWeight: 500,
                  fontFamily: "var(--font-ibm-plex)",
                  background: "#F3F4F6",
                  color: "#6B7280",
                  border: "1px solid #E5E7EB",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                + New Chat
              </button>
            )}
          </div>

          {/* Right: Action buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {/* ⭐ Task 4: Recent Conversations Button */}
            {user && (
              <button
                onClick={() => {
                  setShowRecentDrawer(true);
                  loadRecentConversations();
                  // Refresh local conversations
                  try {
                    const stored = localStorage.getItem("melvin-conversations");
                    if (stored) setLocalConversations(JSON.parse(stored));
                  } catch { /* ignore */ }
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 12px",
                  fontSize: "12px",
                  fontWeight: 500,
                  background: "white",
                  color: "#6B7280",
                  border: "1px solid #E5E7EB",
                  borderRadius: "6px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#F9FAFB";
                  e.currentTarget.style.color = "#374151";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "white";
                  e.currentTarget.style.color = "#6B7280";
                }}
              >
                <History size={14} />
                Recent
              </button>
            )}

            {/* ⭐ Task 8: Summary Button */}
            {messages.length >= 2 && (
              <button
                onClick={generateSummaryReport}
                disabled={generatingSummary}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 12px",
                  fontSize: "12px",
                  fontWeight: 500,
                  background: "#7C3AED",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: generatingSummary ? "not-allowed" : "pointer",
                  opacity: generatingSummary ? 0.7 : 1,
                  transition: "all 0.2s",
                }}
              >
                {generatingSummary ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                Summary
              </button>
            )}

            {/* ⭐ Task 9/10/11: Export Dropdown */}
            {messages.length > 0 && <ExportDropdown />}
          </div>
        </div>

        {/* Import Files button - shows when connected */}
        {microsoftConnected && !showPrompt && !saveSuccess && (
          <div style={{
            padding: "12px 20px",
            borderBottom: "1px solid #E5E7EB",
            background: "#FCFCFA",
            display: "flex",
            justifyContent: "flex-end",
          }}>
            <button
              onClick={() => {
                setShowM365Modal(true);
                loadM365Files();
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-[#107C10] border border-[#107C10] rounded-lg hover:bg-[#0D6A0D] transition-colors flex items-center gap-2"
              style={{ fontFamily: "var(--font-ibm-plex)" }}
            >
              <Cloud className="w-4 h-4" />
              Import Files
            </button>
          </div>
        )}

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && (
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "#9CA3AF",
              fontFamily: "var(--font-ibm-plex)",
              textAlign: "center",
              padding: "40px",
            }}>
              <MessageSquare size={48} style={{ marginBottom: "16px", opacity: 0.5 }} />
              <p style={{ fontSize: "16px", marginBottom: "8px" }}>Start a conversation</p>
              <p style={{ fontSize: "13px" }}>Ask about your project data or construction knowledge</p>
            </div>
          )}

          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                  m.role === "user"
                    ? "bg-[#2563EB] text-white rounded-br-none"
                    : "bg-white border border-gray-200 rounded-bl-none text-gray-800"
                }`}
                style={{
                  fontFamily: "var(--font-ibm-plex)",
                  whiteSpace: "pre-wrap"
                }}
              >
                {m.content}
                {m.role === "assistant" && m.mode && <ModeBadge mode={m.mode} />}

                {/* Product cards from PRODUCT/FULL mode */}
                {m.products && m.products.length > 0 && (
                  <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                    {m.products.map((p) => (
                      <div
                        key={p.id}
                        style={{
                          border: "1px solid #E5E7EB",
                          borderRadius: 8,
                          padding: "10px 12px",
                          background: "#FAFAFA",
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <span style={{ fontWeight: 600, fontSize: 13, color: "#1F2937" }}>
                              {p.product_name}
                            </span>
                            {p.product_code && (
                              <span style={{
                                fontFamily: "monospace",
                                fontSize: 11,
                                color: "#6B7280",
                                background: "#F3F4F6",
                                padding: "1px 6px",
                                borderRadius: 4,
                              }}>
                                {p.product_code}
                              </span>
                            )}
                            <span style={{
                              fontSize: 10,
                              fontWeight: 600,
                              padding: "2px 6px",
                              borderRadius: 4,
                              background: "#EDE9FE",
                              color: "#7C3AED",
                              border: "1px solid #C4B5FD",
                            }}>
                              {p.pillar}
                            </span>
                          </div>
                          {(p.sell_price || p.list_price) && (
                            <div style={{ fontSize: 12, color: "#374151", marginTop: 4, fontWeight: 500 }}>
                              £{(p.sell_price || p.list_price || 0).toFixed(2)}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddToQuote(p);
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "6px 10px",
                            fontSize: 11,
                            fontWeight: 600,
                            fontFamily: "var(--font-ibm-plex)",
                            background: "#059669",
                            color: "white",
                            border: "none",
                            borderRadius: 6,
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                            transition: "opacity 0.2s",
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.opacity = "0.85"}
                          onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
                        >
                          <ShoppingCart size={12} />
                          Add to Quote
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start text-gray-500 text-sm items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> analysing…
            </div>
          )}

          {showPrompt && <SmartSaveBubble />}
          {saveSuccess && <SuccessMessage message={saveSuccess} />}

          {/* Quote toast notification */}
          {quoteToast && (
            <div style={{
              position: "fixed",
              bottom: 90,
              right: 24,
              background: quoteToast.includes("Failed") ? "#FEE2E2" : "#D1FAE5",
              border: `1px solid ${quoteToast.includes("Failed") ? "#FCA5A5" : "#6EE7B7"}`,
              borderRadius: 8,
              padding: "10px 16px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              zIndex: 100,
              fontFamily: "var(--font-ibm-plex)",
              fontSize: 13,
              color: quoteToast.includes("Failed") ? "#991B1B" : "#065F46",
              fontWeight: 500,
            }}>
              <ShoppingCart size={14} />
              {quoteToast}
              {activeQuoteId && !quoteToast.includes("Failed") && (
                <button
                  onClick={() => router.push(`/quotes/${activeQuoteId}`)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    marginLeft: 4,
                    padding: "2px 8px",
                    fontSize: 12,
                    fontWeight: 600,
                    background: "#059669",
                    color: "white",
                    border: "none",
                    borderRadius: 4,
                    cursor: "pointer",
                  }}
                >
                  View <ExternalLink size={10} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* ⭐ Task 6: Mode Override + Chat Input */}
        <div style={{
          padding: "12px 20px",
          borderTop: "1px solid #E5E7EB",
          background: "white",
          display: "flex",
          alignItems: "flex-end",
          gap: "12px",
        }}>
          <ModeOverrideDropdown />
          <div style={{ flex: 1 }}>
            <ChatInput
              onSend={handleSend}
              disabled={loading}
              showPrompt={showPrompt}
              messages={messages}
            />
          </div>
        </div>
      </div>

      {/* ⭐ Task 4: Recent Conversations Drawer */}
      {showRecentDrawer && (
        <>
          <div
            onClick={() => setShowRecentDrawer(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0, 0, 0, 0.3)",
              zIndex: 55,
            }}
          />
          <div
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              height: "100vh",
              width: "360px",
              background: "white",
              boxShadow: "-4px 0 24px rgba(0, 0, 0, 0.1)",
              zIndex: 60,
              display: "flex",
              flexDirection: "column",
              animation: "slideInRight 0.2s ease-out",
            }}
          >
            {/* Header */}
            <div style={{
              padding: "16px 20px",
              borderBottom: "1px solid #E5E7EB",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}>
              <h3 style={{
                fontFamily: "var(--font-cormorant)",
                fontSize: "1.25rem",
                fontWeight: 600,
                color: "#2A2A2A",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}>
                <History size={20} />
                Recent Conversations
              </h3>
              <button
                onClick={() => setShowRecentDrawer(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px",
                  borderRadius: "4px",
                }}
              >
                <X size={20} color="#6B7280" />
              </button>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
              {loadingRecent ? (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "40px",
                  color: "#6B7280",
                }}>
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              ) : recentConversations.length === 0 && localConversations.length === 0 ? (
                <div style={{
                  textAlign: "center",
                  padding: "40px 20px",
                  color: "#9CA3AF",
                  fontFamily: "var(--font-ibm-plex)",
                }}>
                  <MessageSquare size={32} style={{ margin: "0 auto 12px", opacity: 0.5 }} />
                  <p>No recent conversations</p>
                  <p style={{ fontSize: "12px", marginTop: "4px" }}>Start chatting to see history here</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {/* Local (unsaved) conversations */}
                  {localConversations.length > 0 && (
                    <>
                      <div style={{
                        fontFamily: "var(--font-ibm-plex)",
                        fontSize: 11,
                        fontWeight: 600,
                        color: "#9CA3AF",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        padding: "8px 4px 4px",
                      }}>
                        Recent Chats
                      </div>
                      {localConversations.map((conv) => (
                        <button
                          key={conv.id}
                          onClick={() => {
                            setMessages(conv.messages);
                            setConversationId(conv.id);
                            setLoadedProjectId(null);
                            setLoadedProjectName(null);
                            setShowRecentDrawer(false);
                            setSaveSuccess(`Loaded: ${conv.title.slice(0, 40)}`);
                          }}
                          style={{
                            width: "100%",
                            padding: "12px 16px",
                            background: "white",
                            border: "1px solid #E5E7EB",
                            borderRadius: "8px",
                            cursor: "pointer",
                            textAlign: "left",
                            transition: "all 0.2s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "#F9FAFB";
                            e.currentTarget.style.borderColor = "#2563EB";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "white";
                            e.currentTarget.style.borderColor = "#E5E7EB";
                          }}
                        >
                          <div style={{
                            fontFamily: "var(--font-ibm-plex)",
                            fontSize: "14px",
                            fontWeight: 500,
                            color: "#2A2A2A",
                            marginBottom: "4px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}>
                            {conv.title}
                          </div>
                          <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            fontFamily: "var(--font-ibm-plex)",
                            fontSize: "12px",
                            color: "#6B7280",
                          }}>
                            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              <Clock size={12} />
                              {formatDate(conv.updatedAt)}
                            </span>
                            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              <MessageSquare size={12} />
                              {conv.messages.length} messages
                            </span>
                          </div>
                        </button>
                      ))}
                    </>
                  )}

                  {/* Project-linked conversations */}
                  {recentConversations.length > 0 && (
                    <>
                      <div style={{
                        fontFamily: "var(--font-ibm-plex)",
                        fontSize: 11,
                        fontWeight: 600,
                        color: "#9CA3AF",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        padding: "8px 4px 4px",
                      }}>
                        Project Conversations
                      </div>
                      {recentConversations.map((conv) => (
                        <button
                          key={conv.id}
                          onClick={() => loadConversation(conv)}
                          style={{
                            width: "100%",
                            padding: "12px 16px",
                            background: "white",
                            border: "1px solid #E5E7EB",
                            borderRadius: "8px",
                            cursor: "pointer",
                            textAlign: "left",
                            transition: "all 0.2s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "#F9FAFB";
                            e.currentTarget.style.borderColor = "#2563EB";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "white";
                            e.currentTarget.style.borderColor = "#E5E7EB";
                          }}
                        >
                          <div style={{
                            fontFamily: "var(--font-ibm-plex)",
                            fontSize: "14px",
                            fontWeight: 500,
                            color: "#2A2A2A",
                            marginBottom: "4px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}>
                            {conv.name}
                          </div>
                          <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            fontFamily: "var(--font-ibm-plex)",
                            fontSize: "12px",
                            color: "#6B7280",
                          }}>
                            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              <Clock size={12} />
                              {formatDate(conv.updated_at)}
                            </span>
                            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              <MessageSquare size={12} />
                              {conv.chat_history.length} messages
                            </span>
                          </div>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* M365 Import Modal - keeping existing code */}
      {showM365Modal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden"
            style={{
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
            }}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Cloud className="w-6 h-6 text-[#107C10]" />
                <h2 
                  className="text-2xl"
                  style={{ 
                    fontFamily: "var(--font-cormorant)", 
                    color: "#2A2A2A",
                    fontWeight: 500 
                  }}
                >
                  Import from Microsoft 365
                </h2>
              </div>
              <button
                onClick={() => setShowM365Modal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Tab Switcher */}
            <div className="px-6 pt-4 border-b border-gray-200">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setActiveTab('onedrive');
                    setM365Error('');
                  }}
                  className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                    activeTab === 'onedrive'
                      ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                  style={{ fontFamily: 'var(--font-ibm-plex)' }}
                >
                  OneDrive
                </button>
                <button
                  onClick={() => {
                    setActiveTab('sharepoint');
                    setM365Error('');
                    if (sharePointSites.length === 0 && !isLoadingSites) {
                      loadSharePointSites();
                    }
                  }}
                  className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                    activeTab === 'sharepoint'
                      ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                  style={{ fontFamily: 'var(--font-ibm-plex)' }}
                >
                  SharePoint
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
              {m365Error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-900 mb-2" style={{ fontFamily: 'var(--font-ibm-plex)' }}>
                      {m365Error}
                    </p>
                    <button
                      onClick={() => {
                        setM365Error('');
                        if (activeTab === 'onedrive') {
                          loadM365Files();
                        } else {
                          loadSharePointSites();
                        }
                      }}
                      className="text-sm text-red-600 hover:text-red-800 underline font-medium"
                      style={{ fontFamily: 'var(--font-ibm-plex)' }}
                    >
                      Try again
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'sharepoint' && isPersonalAccount && !m365Error && (
                <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                  <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-900 mb-1" style={{ fontFamily: 'var(--font-ibm-plex)' }}>
                      Personal Account Detected
                    </p>
                    <p className="text-sm text-amber-800" style={{ fontFamily: 'var(--font-ibm-plex)' }}>
                      SharePoint is only available with work or school Microsoft 365 accounts. 
                      You can still use OneDrive to import files.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'onedrive' && (
                <>
                  {!isLoadingFiles && (
                    <div className="mb-4 flex items-center gap-2 text-sm" style={{ fontFamily: 'var(--font-ibm-plex)' }}>
                      {folderBreadcrumb.map((crumb, index) => (
                        <div key={crumb.id || 'root'} className="flex items-center gap-2">
                          {index > 0 && <ChevronRight className="w-4 h-4 text-gray-400" />}
                          <button
                            onClick={() => navigateToBreadcrumb(index)}
                            className={`${
                              index === folderBreadcrumb.length - 1
                                ? 'text-blue-700 font-medium'
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                          >
                            {crumb.name}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {isLoadingFiles && (
                    <div className="flex flex-col items-center justify-center py-16">
                      <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
                      <p className="text-gray-600 font-medium" style={{ fontFamily: 'var(--font-ibm-plex)' }}>
                        Loading your files...
                      </p>
                    </div>
                  )}

                  {!isLoadingFiles && m365Folders.length === 0 && m365Files.length === 0 && !m365Error && (
                    <div className="text-center py-16">
                      <FileSpreadsheet className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-900 font-medium mb-2" style={{ fontFamily: 'var(--font-ibm-plex)' }}>
                        No Excel files found here
                      </p>
                      <p className="text-sm text-gray-500 mb-4" style={{ fontFamily: 'var(--font-ibm-plex)' }}>
                        Try navigating to a different folder
                      </p>
                    </div>
                  )}

                  {!isLoadingFiles && (m365Folders.length > 0 || m365Files.length > 0) && (
                    <div className="space-y-2">
                      {m365Folders.map((folder) => (
                        <button
                          key={folder.id}
                          onClick={() => navigateToFolder(folder.id, folder.name)}
                          className="w-full p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all text-left"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                              <Folder className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-medium text-gray-900 truncate" style={{ fontFamily: 'var(--font-ibm-plex)' }}>
                                {folder.name}
                              </h3>
                              <p className="text-xs text-gray-500" style={{ fontFamily: 'var(--font-ibm-plex)' }}>
                                {folder.childCount} items
                              </p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                          </div>
                        </button>
                      ))}

                      {m365Files.map((file) => (
                        <div
                          key={file.id}
                          className={`p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all ${
                            isImporting && selectedFileId === file.id ? 'bg-blue-50 border-blue-300' : ''
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                              <FileSpreadsheet className="w-5 h-5 text-green-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-medium text-gray-900 truncate" style={{ fontFamily: 'var(--font-ibm-plex)' }}>
                                {file.name}
                              </h3>
                              <div className="flex items-center gap-4 mt-1">
                                <span className="flex items-center gap-1 text-xs text-gray-500">
                                  <HardDrive className="w-3 h-3" />
                                  {formatFileSize(file.size)}
                                </span>
                                <span className="flex items-center gap-1 text-xs text-gray-500">
                                  <Calendar className="w-3 h-3" />
                                  {formatDate(file.lastModifiedDateTime)}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => handleM365Import(file.id, file.name)}
                              disabled={isImporting}
                              className="px-4 py-2 rounded-lg font-medium text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                              style={{ fontFamily: 'var(--font-ibm-plex)' }}
                            >
                              {isImporting && selectedFileId === file.id ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Importing...
                                </>
                              ) : (
                                'Import'
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {activeTab === 'sharepoint' && (
                <div className="text-center py-16">
                  <Cloud className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-900 font-medium mb-2" style={{ fontFamily: 'var(--font-ibm-plex)' }}>
                    SharePoint Integration
                  </p>
                  <p className="text-sm text-gray-500" style={{ fontFamily: 'var(--font-ibm-plex)' }}>
                    {isPersonalAccount 
                      ? 'Personal accounts do not have access to SharePoint.'
                      : 'SharePoint file browsing available for work accounts'
                    }
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
