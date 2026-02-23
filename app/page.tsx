"use client";

import { useCallback, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import * as XLSX from "xlsx";
import { Loader2, X, FileSpreadsheet, Calendar, HardDrive, AlertCircle, Cloud, Folder, ChevronRight, CheckCircle, Info, LayoutDashboard, BookOpen, FileText, ShieldCheck, Link2, ClipboardCheck, FolderOpen, Cpu } from "lucide-react";
import VoiceInput from "@/components/VoiceInput";
import ChatDrawerWrapper from "@/components/ChatDrawerWrapper";
import { supabase } from "@/lib/supabase";

const APP_ICONS = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Library", icon: BookOpen, href: "/library" },
  { label: "Quotes", icon: FileText, href: "/quotes" },
  { label: "Compliance", icon: ShieldCheck, href: "/compliance" },
  { label: "Golden Thread", icon: Link2, href: "/golden-thread" },
  { label: "AutoPlan", icon: Cpu, href: "/autoplan" },
  { label: "Surveying", icon: ClipboardCheck, href: "/surveying" },
  { label: "CDE", icon: FolderOpen, href: "/cde", target: "_blank" },
];

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

// Suggestion prompt pools — one random prompt per mode on each page load
const SUGGESTION_POOLS: { mode: string; prompts: string[] }[] = [
  {
    mode: "PRODUCT",
    prompts: [
      "Find a product with a 120-minute fire rating for a corridor doorset",
      "What fire stopping products are suitable for a 100mm pipe penetration?",
      "Compare intumescent strips for FD60 fire doors",
      "Which fire dampers are approved for residential high-rise buildings?",
      "Show me cavity barrier options for a ventilated rainscreen facade",
    ],
  },
  {
    mode: "KNOWLEDGE",
    prompts: [
      "What are the inspection intervals for fire dampers under BS 9999?",
      "Explain the compartmentation requirements in Approved Document B",
      "What does BS 8214 say about fire door maintenance intervals?",
      "Summarise the passive fire protection requirements for means of escape",
      "What testing standards apply to linear gap seals in fire stopping?",
    ],
  },
  {
    mode: "PROJECT",
    prompts: [
      "Summarise overdue deliverables from my TIDP upload",
      "Which categories in my schedule have the most revision changes?",
      "Generate a progress report from my uploaded project data",
      "What percentage of my deliverables are marked as approved?",
      "List all items with status changes in the last 30 days",
    ],
  },
  {
    mode: "GENERAL",
    prompts: [
      "What changed in the Building Safety Act Section 88 guidance?",
      "Explain the role of a Principal Designer under the Building Safety Act",
      "What is a golden thread in the context of building safety?",
      "What are the fire safety requirements for buildings over 18 metres?",
      "How do the new competence requirements affect fire risk assessors?",
    ],
  },
];

function getRandomSuggestions() {
  const all = SUGGESTION_POOLS.map((pool) => ({
    mode: pool.mode,
    text: pool.prompts[Math.floor(Math.random() * pool.prompts.length)],
  }));
  // Shuffle and pick 3 for the pill row
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all.slice(0, 3);
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function getFormattedDate() {
  return new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [microsoftConnected, setMicrosoftConnected] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const [message, setMessage] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [user, setUser] = useState<any>(null);
  
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
  
  // Common State
  const [isImporting, setIsImporting] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [m365Error, setM365Error] = useState<string>("");
  const [isPersonalAccount, setIsPersonalAccount] = useState(false);

  // Suggestion pills — randomized on mount
  const [suggestions] = useState(() => getRandomSuggestions());

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      setMousePos({ x, y });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Check auth status
  useEffect(() => {
    checkAuth();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
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

  // Check for M365 connection success
  useEffect(() => {
    if (!user) return;
    
    const m365Connected = searchParams.get('m365_connected');
    if (m365Connected === 'true') {
      setShowM365Modal(true);
      loadM365Files();
      router.replace('/');
    }
  }, [searchParams, user, router]);

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
      
      // Detect personal account (Outlook.com, Hotmail.com, Live.com)
      if (data?.email) {
        const email = data.email.toLowerCase();
        const isPersonal = email.includes('@outlook.com') || 
                          email.includes('@hotmail.com') || 
                          email.includes('@live.com');
        setIsPersonalAccount(isPersonal);
      }
    }
  }

  async function loadM365Files(folderId: string | null = null, folderName: string = 'OneDrive') {
    setIsLoadingFiles(true);
    setM365Error('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setShowM365Modal(false);
        throw new Error('Please sign in to access OneDrive');
      }

      const url = folderId 
        ? `/api/microsoft/files?userId=${user.id}&folderId=${folderId}`
        : `/api/microsoft/files?userId=${user.id}`;

      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json();
        
        // Enhanced error messages
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
    // Add to breadcrumb
    setFolderBreadcrumb(prev => [...prev, { id: folderId, name: folderName }]);
    loadM365Files(folderId, folderName);
  }

  function navigateToBreadcrumb(index: number) {
    const newBreadcrumb = folderBreadcrumb.slice(0, index + 1);
    setFolderBreadcrumb(newBreadcrumb);
    const targetFolder = newBreadcrumb[newBreadcrumb.length - 1];
    loadM365Files(targetFolder.id, targetFolder.name);
  }

  async function loadSharePointSites() {
    setIsLoadingSites(true);
    setM365Error('');

    try {
      const response = await fetch('/api/microsoft/sites');
      
      if (!response.ok) {
        const errorData = await response.json();
        
        // Enhanced error messages for SharePoint
        if (response.status === 401) {
          throw new Error('Microsoft 365 connection expired. Please reconnect your account.');
        } else if (response.status === 403) {
          if (isPersonalAccount) {
            throw new Error('SharePoint is only available with work or school Microsoft 365 accounts. Personal accounts (Outlook.com, Hotmail.com) do not have SharePoint access.');
          }
          throw new Error('Access denied. Please ensure you have SharePoint permissions.');
        } else if (response.status === 404) {
          throw new Error('SharePoint not found. Your organization may not have SharePoint enabled.');
        } else {
          throw new Error(errorData.error || 'Unable to load SharePoint sites. Please try again.');
        }
      }

      const data = await response.json();
      setSharePointSites(data.sites || []);
    } catch (err: any) {
      console.error('Error loading SharePoint sites:', err);
      setM365Error(err.message || 'Failed to load SharePoint sites');
    } finally {
      setIsLoadingSites(false);
    }
  }

  async function loadSharePointLibraries(siteId: string) {
    setIsLoadingLibraries(true);
    setM365Error('');
    setSelectedLibrary(null);
    setSharePointFiles([]);

    try {
      const response = await fetch(`/api/microsoft/libraries?siteId=${siteId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        
        // Enhanced error messages
        if (response.status === 401) {
          throw new Error('Session expired. Please reconnect Microsoft 365.');
        } else if (response.status === 404) {
          throw new Error('SharePoint site not found. It may have been deleted or you may have lost access.');
        } else if (response.status === 403) {
          throw new Error('Access denied. You may not have permission to view this site\'s libraries.');
        } else {
          throw new Error(errorData.error || 'Unable to load document libraries. Please try again.');
        }
      }

      const data = await response.json();
      setSharePointLibraries(data.libraries || []);
    } catch (err: any) {
      console.error('Error loading libraries:', err);
      setM365Error(err.message || 'Failed to load document libraries');
    } finally {
      setIsLoadingLibraries(false);
    }
  }

  async function loadSharePointFiles(driveId: string) {
    setIsLoadingSharePointFiles(true);
    setM365Error('');

    try {
      const response = await fetch(`/api/microsoft/sharepoint-files?driveId=${driveId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        
        // Enhanced error messages
        if (response.status === 401) {
          throw new Error('Session expired. Please reconnect Microsoft 365.');
        } else if (response.status === 404) {
          throw new Error('Document library not found. It may have been deleted.');
        } else if (response.status === 403) {
          throw new Error('Access denied. You may not have permission to view files in this library.');
        } else {
          throw new Error(errorData.error || 'Unable to load files. Please try again.');
        }
      }

      const data = await response.json();
      setSharePointFiles(data.files || []);
    } catch (err: any) {
      console.error('Error loading SharePoint files:', err);
      setM365Error(err.message || 'Failed to load SharePoint files');
    } finally {
      setIsLoadingSharePointFiles(false);
    }
  }

  async function handleM365Import(fileId: string, fileName: string) {
    setIsImporting(true);
    setSelectedFileId(fileId);
    setM365Error('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Session expired. Please sign in again.');
      }

      const response = await fetch('/api/microsoft/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          fileId,
          fileName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Enhanced error messages for import
        if (response.status === 401) {
          throw new Error('Session expired. Please reconnect Microsoft 365.');
        } else if (response.status === 400) {
          throw new Error('Unable to process file. Please ensure it\'s a valid Excel file (.xlsx or .xls).');
        } else if (response.status === 413) {
          throw new Error('File is too large. Maximum file size is 5MB.');
        } else {
          throw new Error(errorData.error || 'Import failed. Please try again.');
        }
      }

      const result = await response.json();
      
      localStorage.setItem('uploadedData', JSON.stringify(result.data));
      localStorage.setItem('uploadedFileName', fileName);
      
      setShowM365Modal(false);
      setSuccess(`✅ ${fileName} imported successfully with ${result.data.totalRows} rows.`);
      
      // Auto-open chat after successful import
      setTimeout(() => {
        const trigger = document.getElementById("chat-trigger");
        if (trigger) trigger.click();
      }, 1000);
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

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setSuccess("");
    setIsUploading(true);

    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "xls", "csv"].includes(extension || "")) {
      setError("Only .xlsx, .xls, or .csv files are supported");
      setIsUploading(false);
      return;
    }

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];
      if (!rows || rows.length === 0) throw new Error("Empty file");

      const structured = {
        totalRows: rows.length,
        totalColumns: rows[0]?.length || 0,
        rows,
        fileName: file.name,
      };

      // Store in localStorage for immediate chat access (FREEMIUM WORKS!)
      localStorage.setItem("uploadedData", JSON.stringify(structured));
      localStorage.setItem("uploadedFileName", file.name);

      // If user is signed in, also save to database
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // User is signed in - save to database
        const saveResponse = await fetch('/api/smart-save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            fileData: structured,
            fileName: file.name,
            userId: session.user.id,
          }),
        });

        if (saveResponse.ok) {
          const saveResult = await saveResponse.json();
          console.log("✅ Project saved:", saveResult);

          // Load the project data (same as clicking a project in ProjectsPanel)
          if (saveResult.projectId) {
            const loadResponse = await fetch('/api/load-project', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                projectId: saveResult.projectId,
              }),
            });

            if (loadResponse.ok) {
              const loadResult = await loadResponse.json();
              
              // Store loaded project data in localStorage
              localStorage.setItem("uploadedData", JSON.stringify(loadResult.dataset));
              localStorage.setItem("uploadedFileName", file.name);
              localStorage.setItem("loadedProjectId", saveResult.projectId);
              localStorage.setItem("loadedProjectName", file.name.replace(/\.(xlsx|xls|csv)$/i, ''));
              
              // Dispatch project loaded event for chat drawer header
              window.dispatchEvent(new CustomEvent('projectLoaded', {
                detail: { projectName: file.name.replace(/\.(xlsx|xls|csv)$/i, '') }
              }));

              // Trigger ProjectsPanel refresh
              window.dispatchEvent(new Event('projectsChanged'));
            }
          }
        }
      }

      setSuccess(`✅ ${file.name} uploaded successfully with ${structured.totalRows} rows.`);
      
      // Auto-open chat drawer after successful upload
      setTimeout(() => {
        const trigger = document.getElementById("chat-trigger");
        if (trigger) trigger.click();
      }, 500);
    } catch (err: any) {
      console.error("❌ Upload failed:", err);
      setError(`Failed to upload: ${err.message || "Unknown error"}`);
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleSend = useCallback(() => {
    if (!message.trim()) return;

    localStorage.setItem("userMessage", message);
    setMessage("");

    const trigger = document.getElementById("chat-trigger");
    if (trigger) trigger.click();
  }, [message]);

  async function handleDisconnectMicrosoft() {
    if (!confirm('Disconnect Microsoft 365?')) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/microsoft/disconnect', { 
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ userId: user.id })
      });
      
      if (response.ok) {
        setMicrosoftConnected(false);
        window.dispatchEvent(new CustomEvent('m365StatusChanged', { 
          detail: { connected: false } 
        }));
        setSuccess('✅ Microsoft 365 disconnected successfully');
      }
    } catch (error) {
      console.error('Disconnect error:', error);
      setError('Failed to disconnect Microsoft 365');
    }
  }

  async function handleConnectMicrosoft() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/chat");
    } else {
      window.location.href = `/api/microsoft/auth?userId=${user.id}`;
    }
  }

  return (
    <>
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden"
        style={{ background: "#FCFCFA" }}
      >
        {/* Mouse-tracking blue gradient */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%, rgba(37,99,235,0.15), transparent 75%)`,
          }}
        />

        <div className="w-full max-w-[1100px] relative z-10">
          {/* Date + Greeting */}
          <div className="mb-6">
            <p
              className="text-sm"
              style={{ fontFamily: "var(--font-ibm-plex)", color: "#9CA3AF" }}
            >
              {getFormattedDate()}
            </p>
            <h1
              className="text-4xl md:text-5xl mt-1"
              style={{
                fontFamily: "var(--font-cormorant)",
                fontWeight: 500,
                color: "#2A2A2A",
                letterSpacing: "0.01em",
              }}
            >
              {getGreeting()}{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name.split(" ")[0]}` : ""}
            </h1>
          </div>

          {/* 3 Suggestion Pills — glass row */}
          <div className="grid grid-cols-3 gap-3 mb-8" style={{ fontFamily: "var(--font-ibm-plex)" }}>
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => {
                  setMessage(s.text);
                  localStorage.setItem("userMessage", s.text);
                  setTimeout(() => {
                    const trigger = document.getElementById("chat-trigger");
                    if (trigger) trigger.click();
                  }, 100);
                }}
                className="px-3 py-2.5 text-left rounded-xl transition-all hover:shadow-md"
                style={{
                  fontSize: "12px",
                  lineHeight: "1.4",
                  color: "#6B7280",
                  background: "rgba(255,255,255,0.6)",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  border: "1px solid rgba(229,231,235,0.7)",
                }}
              >
                {s.text}
              </button>
            ))}
          </div>

          {/* Two-column: USP Card (1/3) + Chat Input (2/3) */}
          <div className="flex gap-6 mb-6 items-stretch">
            {/* Left: USP Card */}
            <div
              className="w-1/3 rounded-2xl p-6 flex flex-col justify-between"
              style={{
                background: "rgba(255,255,255,0.55)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                border: "1px solid rgba(229,231,235,0.6)",
                boxShadow: "0 4px 24px rgba(37,99,235,0.06)",
              }}
            >
              <div>
                <h2
                  className="text-3xl mb-1"
                  style={{
                    fontFamily: "var(--font-cormorant)",
                    fontWeight: 600,
                    color: "#2A2A2A",
                  }}
                >
                  Melvin.Chat
                </h2>
                <p
                  className="text-xs mb-4"
                  style={{
                    fontFamily: "var(--font-ibm-plex)",
                    color: "#6B7280",
                    fontWeight: 500,
                    letterSpacing: "0.04em",
                  }}
                >
                  Hybrid Product Intelligence
                </p>
                <p
                  className="text-[13px] leading-relaxed"
                  style={{
                    fontFamily: "var(--font-ibm-plex)",
                    color: "#4B5563",
                  }}
                >
                  Find the right product, verify it meets spec, and prove compliance — one conversation that connects your catalogue, regulations, and live project data.
                </p>
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                {["Products", "Regulations", "Projects", "Compliance"].map((tag) => (
                  <span
                    key={tag}
                    className="text-[11px] px-2.5 py-1 rounded-full"
                    style={{
                      fontFamily: "var(--font-ibm-plex)",
                      color: "#6B7280",
                      background: "rgba(0,0,0,0.03)",
                      border: "1px solid rgba(0,0,0,0.06)",
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Right: Chat Input Card */}
            <div className="w-2/3">
              <div
                className="rounded-2xl overflow-hidden transition-all hover:shadow-md h-full flex flex-col"
                style={{
                  background: "rgba(255,255,255,0.85)",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  border: "1px solid rgba(229,231,235,0.7)",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
                }}
              >
                <div className="p-5 flex-1">
                  <div className="flex gap-2 h-full">
                    <textarea
                      placeholder="How can Melvin help you today?"
                      className="w-full resize-none outline-none text-base"
                      style={{
                        fontFamily: "var(--font-ibm-plex)",
                        color: "#2A2A2A",
                        minHeight: "100px",
                        background: "transparent",
                      }}
                      rows={4}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                    />
                    <div className="flex items-end pb-1">
                      <VoiceInput onTranscript={(text) => setMessage((prev) => prev + (prev ? " " : "") + text)} />
                    </div>
                  </div>
                </div>

                {/* File upload bar */}
                <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: "1px solid rgba(229,231,235,0.6)", background: "rgba(252,252,250,0.6)" }}>
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      id="file-upload"
                      className="hidden"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileSelect}
                    />
                    <label
                      htmlFor="file-upload"
                      className="p-2 hover:bg-white rounded-lg transition-colors cursor-pointer"
                      title="Attach file"
                    >
                      {isUploading ? (
                        <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-gray-500">
                          <path d="M10 4V14M10 4L13 7M10 4L7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M4 14V16C4 17.1046 4.89543 18 6 18H14C15.1046 18 16 17.1046 16 16V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      )}
                    </label>
                    <span className="text-xs" style={{ fontFamily: "var(--font-ibm-plex)", color: "#9CA3AF" }}>
                      .xlsx, .xls, or .csv
                    </span>
                    {microsoftConnected ? (
                      <div className="ml-3 flex items-center gap-2">
                        <button
                          onClick={() => { setShowM365Modal(true); loadM365Files(); }}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-[#107C10] rounded-lg hover:bg-[#0D6A0D] transition-colors flex items-center gap-1.5"
                          style={{ fontFamily: "var(--font-ibm-plex)" }}
                        >
                          <Cloud className="w-3.5 h-3.5" />
                          Import
                        </button>
                        <button
                          onClick={handleDisconnectMicrosoft}
                          className="px-2 py-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                          style={{ fontFamily: "var(--font-ibm-plex)" }}
                          title="Disconnect Microsoft 365"
                        >
                          Disconnect
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={handleConnectMicrosoft}
                        className="ml-3 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        style={{ fontFamily: "var(--font-ibm-plex)" }}
                      >
                        Connect M365
                      </button>
                    )}
                  </div>
                  <button
                    onClick={handleSend}
                    className="px-5 py-2 bg-[#2563EB] text-white font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    style={{ fontFamily: "var(--font-ibm-plex)" }}
                    disabled={!message.trim()}
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Error / Success */}
          {error && (
            <div className="mb-4 p-4 rounded-lg flex items-start gap-3" style={{ background: "#FEF2F2", border: "1px solid #FCA5A5" }}>
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm" style={{ fontFamily: "var(--font-ibm-plex)", color: "#991B1B" }}>{error}</p>
            </div>
          )}
          {success && (
            <div className="mb-4 p-4 rounded-lg flex items-start gap-3" style={{ background: "#F0FDF4", border: "1px solid #86EFAC" }}>
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm" style={{ fontFamily: "var(--font-ibm-plex)", color: "#166534" }}>{success}</p>
            </div>
          )}

          {/* Bottom: App Icon Grid — single row, equally distributed */}
          <div className="grid grid-cols-8 mt-4">
            {APP_ICONS.map((app) => (
              <a
                key={app.label}
                href={app.href}
                target={(app as any).target || "_self"}
                className="flex flex-col items-center gap-1.5 group"
                style={{ textDecoration: "none" }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center transition-all group-hover:shadow-md group-hover:scale-105"
                  style={{
                    background: "rgba(255,255,255,0.7)",
                    backdropFilter: "blur(8px)",
                    border: "1px solid rgba(229,231,235,0.6)",
                  }}
                >
                  <app.icon className="w-5 h-5 text-gray-500 group-hover:text-[#2563EB] transition-colors" />
                </div>
                <span
                  className="text-[10px] text-gray-400 group-hover:text-gray-600 transition-colors"
                  style={{ fontFamily: "var(--font-ibm-plex)" }}
                >
                  {app.label}
                </span>
              </a>
            ))}
          </div>
        </div>

        <ChatDrawerWrapper />
      </div>

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

              {/* Personal Account Warning for SharePoint */}
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

              {/* OneDrive Tab */}
              {activeTab === 'onedrive' && (
                <>
                  {/* Breadcrumb Navigation */}
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
                      <p className="text-sm text-gray-500 mt-1" style={{ fontFamily: 'var(--font-ibm-plex)' }}>
                        This may take a few seconds
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
                        Try navigating to a different folder or upload .xlsx files to OneDrive
                      </p>
                      <a
                        href="https://onedrive.live.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 underline"
                        style={{ fontFamily: 'var(--font-ibm-plex)' }}
                      >
                        Open OneDrive in new tab
                      </a>
                    </div>
                  )}

                  {!isLoadingFiles && (m365Folders.length > 0 || m365Files.length > 0) && (
                    <div className="space-y-2">
                      {/* Folders First */}
                      {m365Folders.map((folder) => (
                        <button
                          key={folder.id}
                          onClick={() => navigateToFolder(folder.id, folder.name)}
                          className="w-full p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all text-left"
                        >
                          <div className="flex items-center gap-4">
                            <div className="flex-shrink-0">
                              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Folder className="w-5 h-5 text-blue-600" />
                              </div>
                            </div>

                            <div className="flex-1 min-w-0">
                              <h3 
                                className="text-sm font-medium text-gray-900 truncate"
                                style={{ fontFamily: 'var(--font-ibm-plex)' }}
                              >
                                {folder.name}
                              </h3>
                              <p className="text-xs text-gray-500" style={{ fontFamily: 'var(--font-ibm-plex)' }}>
                                {folder.childCount} {folder.childCount === 1 ? 'item' : 'items'}
                              </p>
                            </div>

                            <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                          </div>
                        </button>
                      ))}

                      {/* Files */}
                      {m365Files.map((file) => (
                        <div
                          key={file.id}
                          className={`p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all ${
                            isImporting && selectedFileId === file.id ? 'bg-blue-50 border-blue-300' : ''
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className="flex-shrink-0">
                              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                <FileSpreadsheet className="w-5 h-5 text-green-600" />
                              </div>
                            </div>

                            <div className="flex-1 min-w-0">
                              <h3 
                                className="text-sm font-medium text-gray-900 truncate"
                                style={{ fontFamily: 'var(--font-ibm-plex)' }}
                              >
                                {file.name}
                              </h3>
                              <div className="flex items-center gap-4 mt-1">
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                  <HardDrive className="w-3 h-3" />
                                  <span style={{ fontFamily: 'var(--font-ibm-plex)' }}>
                                    {formatFileSize(file.size)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                  <Calendar className="w-3 h-3" />
                                  <span style={{ fontFamily: 'var(--font-ibm-plex)' }}>
                                    {formatDate(file.lastModifiedDateTime)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <button
                              onClick={() => handleM365Import(file.id, file.name)}
                              disabled={isImporting}
                              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
                                isImporting && selectedFileId === file.id
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-blue-600 text-white hover:bg-blue-700'
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
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

                  {!isLoadingFiles && m365Files.length > 0 && (
                    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-900" style={{ fontFamily: 'var(--font-ibm-plex)' }}>
                        💡 <strong>Tip:</strong> Importing a file will create a new project and load it into the chat interface. 
                        Your file should contain columns for Category, Revision, Status, and Comments.
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* SharePoint Tab */}
              {activeTab === 'sharepoint' && (
                <>
                  {/* Step 1: Select Site */}
                  {!selectedSite && (
                    <>
                      {isLoadingSites && (
                        <div className="flex flex-col items-center justify-center py-16">
                          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
                          <p className="text-gray-600 font-medium" style={{ fontFamily: 'var(--font-ibm-plex)' }}>
                            Loading SharePoint sites...
                          </p>
                          <p className="text-sm text-gray-500 mt-1" style={{ fontFamily: 'var(--font-ibm-plex)' }}>
                            Searching for sites you have access to
                          </p>
                        </div>
                      )}

                      {!isLoadingSites && sharePointSites.length === 0 && !m365Error && (
                        <div className="text-center py-16">
                          <Cloud className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                          <p className="text-gray-900 font-medium mb-2" style={{ fontFamily: 'var(--font-ibm-plex)' }}>
                            No SharePoint sites found
                          </p>
                          <p className="text-sm text-gray-500 mb-4" style={{ fontFamily: 'var(--font-ibm-plex)' }}>
                            {isPersonalAccount 
                              ? 'Personal accounts do not have access to SharePoint. Use OneDrive instead.'
                              : 'Your organization may not have SharePoint enabled or you may not have access to any sites.'
                            }
                          </p>
                          {!isPersonalAccount && (
                            <button
                              onClick={loadSharePointSites}
                              className="text-sm text-blue-600 hover:text-blue-800 underline"
                              style={{ fontFamily: 'var(--font-ibm-plex)' }}
                            >
                              Refresh sites list
                            </button>
                          )}
                        </div>
                      )}

                      {!isLoadingSites && sharePointSites.length > 0 && (
                        <>
                          <div className="mb-4">
                            <h3 className="text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'var(--font-ibm-plex)' }}>
                              Select a SharePoint site
                            </h3>
                          </div>
                          <div className="space-y-2">
                            {sharePointSites.map((site) => (
                              <button
                                key={site.id}
                                onClick={() => {
                                  setSelectedSite(site.id);
                                  loadSharePointLibraries(site.id);
                                }}
                                className="w-full p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all text-left"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <Cloud className="w-5 h-5 text-blue-600" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-medium text-gray-900 truncate" style={{ fontFamily: 'var(--font-ibm-plex)' }}>
                                      {site.displayName || site.name}
                                    </h4>
                                    <p className="text-xs text-gray-500 truncate" style={{ fontFamily: 'var(--font-ibm-plex)' }}>
                                      {site.webUrl}
                                    </p>
                                  </div>
                                  <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                </div>
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </>
                  )}

                  {/* Step 2: Select Library */}
                  {selectedSite && !selectedLibrary && (
                    <>
                      <div className="mb-4 flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedSite(null);
                            setSharePointLibraries([]);
                            setM365Error('');
                          }}
                          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                          style={{ fontFamily: 'var(--font-ibm-plex)' }}
                        >
                          ← Back to sites
                        </button>
                      </div>

                      {isLoadingLibraries && (
                        <div className="flex flex-col items-center justify-center py-16">
                          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
                          <p className="text-gray-600 font-medium" style={{ fontFamily: 'var(--font-ibm-plex)' }}>
                            Loading document libraries...
                          </p>
                          <p className="text-sm text-gray-500 mt-1" style={{ fontFamily: 'var(--font-ibm-plex)' }}>
                            Finding libraries in this site
                          </p>
                        </div>
                      )}

                      {!isLoadingLibraries && sharePointLibraries.length === 0 && !m365Error && (
                        <div className="text-center py-16">
                          <FileSpreadsheet className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                          <p className="text-gray-900 font-medium mb-2" style={{ fontFamily: 'var(--font-ibm-plex)' }}>
                            No document libraries found
                          </p>
                          <p className="text-sm text-gray-500 mb-4" style={{ fontFamily: 'var(--font-ibm-plex)' }}>
                            This site doesn&apos;t have any document libraries or you don&apos;t have access to them
                          </p>
                          <button
                            onClick={() => loadSharePointLibraries(selectedSite)}
                            className="text-sm text-blue-600 hover:text-blue-800 underline"
                            style={{ fontFamily: 'var(--font-ibm-plex)' }}
                          >
                            Refresh libraries
                          </button>
                        </div>
                      )}

                      {!isLoadingLibraries && sharePointLibraries.length > 0 && (
                        <>
                          <div className="mb-4">
                            <h3 className="text-sm font-medium text-gray-700 mb-2" style={{ fontFamily: 'var(--font-ibm-plex)' }}>
                              Select a document library
                            </h3>
                          </div>
                          <div className="space-y-2">
                            {sharePointLibraries.map((library) => (
                              <button
                                key={library.id}
                                onClick={() => {
                                  setSelectedLibrary(library.id);
                                  loadSharePointFiles(library.id);
                                }}
                                className="w-full p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all text-left"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <HardDrive className="w-5 h-5 text-purple-600" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-medium text-gray-900 truncate" style={{ fontFamily: 'var(--font-ibm-plex)' }}>
                                      {library.name}
                                    </h4>
                                  </div>
                                  <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                </div>
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </>
                  )}

                  {/* Step 3: Select File */}
                  {selectedSite && selectedLibrary && (
                    <>
                      <div className="mb-4 flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedLibrary(null);
                            setSharePointFiles([]);
                            setM365Error('');
                          }}
                          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                          style={{ fontFamily: 'var(--font-ibm-plex)' }}
                        >
                          ← Back to libraries
                        </button>
                      </div>

                      {isLoadingSharePointFiles && (
                        <div className="flex flex-col items-center justify-center py-16">
                          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
                          <p className="text-gray-600 font-medium" style={{ fontFamily: 'var(--font-ibm-plex)' }}>
                            Loading files...
                          </p>
                          <p className="text-sm text-gray-500 mt-1" style={{ fontFamily: 'var(--font-ibm-plex)' }}>
                            Searching for Excel files in this library
                          </p>
                        </div>
                      )}

                      {!isLoadingSharePointFiles && sharePointFiles.length === 0 && !m365Error && (
                        <div className="text-center py-16">
                          <FileSpreadsheet className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                          <p className="text-gray-900 font-medium mb-2" style={{ fontFamily: 'var(--font-ibm-plex)' }}>
                            No Excel files found
                          </p>
                          <p className="text-sm text-gray-500 mb-4" style={{ fontFamily: 'var(--font-ibm-plex)' }}>
                            Upload .xlsx or .xls files to this library to import them
                          </p>
                          <button
                            onClick={() => loadSharePointFiles(selectedLibrary)}
                            className="text-sm text-blue-600 hover:text-blue-800 underline"
                            style={{ fontFamily: 'var(--font-ibm-plex)' }}
                          >
                            Refresh files
                          </button>
                        </div>
                      )}

                      {!isLoadingSharePointFiles && sharePointFiles.length > 0 && (
                        <>
                          <div className="space-y-2">
                            {sharePointFiles.map((file) => (
                              <div
                                key={file.id}
                                className={`p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all ${
                                  isImporting && selectedFileId === file.id ? 'bg-blue-50 border-blue-300' : ''
                                }`}
                              >
                                <div className="flex items-center gap-4">
                                  <div className="flex-shrink-0">
                                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                      <FileSpreadsheet className="w-5 h-5 text-green-600" />
                                    </div>
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <h3 
                                      className="text-sm font-medium text-gray-900 truncate"
                                      style={{ fontFamily: 'var(--font-ibm-plex)' }}
                                    >
                                      {file.name}
                                    </h3>
                                    <div className="flex items-center gap-4 mt-1">
                                      <div className="flex items-center gap-1 text-xs text-gray-500">
                                        <HardDrive className="w-3 h-3" />
                                        <span style={{ fontFamily: 'var(--font-ibm-plex)' }}>
                                          {formatFileSize(file.size)}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1 text-xs text-gray-500">
                                        <Calendar className="w-3 h-3" />
                                        <span style={{ fontFamily: 'var(--font-ibm-plex)' }}>
                                          {formatDate(file.lastModifiedDateTime)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <button
                                    onClick={() => handleM365Import(file.id, file.name)}
                                    disabled={isImporting}
                                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
                                      isImporting && selectedFileId === file.id
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-blue-600 text-white hover:bg-blue-700'
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
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

                          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm text-blue-900" style={{ fontFamily: 'var(--font-ibm-plex)' }}>
                              💡 <strong>Tip:</strong> Importing a file will create a new project and load it into the chat interface. 
                              Your file should contain columns for Category, Revision, Status, and Comments.
                            </p>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
