"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { MessageCircle, ChevronRight, Trash2, Archive, ArchiveRestore, ArrowLeft, FileText, Upload, Cloud, Pencil, Plus, Zap } from "lucide-react";
import M365FileImportModal from "./M365FileImportModal";

export default function ProjectsPanel() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | "archive">("all");
  const [activeFileFilter, setActiveFileFilter] = useState<"all" | "archive">("all"); // ✅ NEW
  const [isOpen, setIsOpen] = useState(true);
  const [viewState, setViewState] = useState<"projects" | "files">("projects");
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [showM365Modal, setShowM365Modal] = useState(false);
  const [microsoftConnected, setMicrosoftConnected] = useState(false);
  
  // ✅ NEW: Subscription state
  const [subscriptionTier, setSubscriptionTier] = useState<string>("free");
  const [tokensUsed, setTokensUsed] = useState<number>(0);
  const TOKEN_LIMIT_FREE = 50000; // 50k tokens for free tier
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const peekTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 🎬 PEEK ANIMATION ON MOUNT
  useEffect(() => {
    // Force panel open on mount
    setIsOpen(true);
    
    // After 2 seconds, slide it closed
    peekTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
      // Save closed state to localStorage
      localStorage.setItem("projectsPanelOpen", "false");
    }, 8000);

    // Cleanup timeout on unmount
    return () => {
      if (peekTimeoutRef.current) {
        clearTimeout(peekTimeoutRef.current);
      }
    };
  }, []); // Only run once on mount

  useEffect(() => {
    checkAuth();
    
    // Note: We don't load from localStorage anymore on mount (peek animation overrides it)
    // But we still listen for manual toggle events
    
    const handleToggle = (e: Event) => {
      const customEvent = e as CustomEvent;
      const newState = customEvent.detail.open;
      
      // Cancel peek animation if user manually toggles
      if (peekTimeoutRef.current) {
        clearTimeout(peekTimeoutRef.current);
        peekTimeoutRef.current = null;
      }
      
      setIsOpen(newState);
      localStorage.setItem("projectsPanelOpen", String(newState));
    };
    
    const handleProjectsChanged = () => {
      console.log("📢 Projects changed event received, reloading...");
      loadProjects();
    };
    
    // Listen for M365 status changes
    const handleM365Change = (e: Event) => {
      const customEvent = e as CustomEvent;
      setMicrosoftConnected(customEvent.detail.connected);
    };

    // ✅ NEW: Listen for token usage updates
    const handleTokensUpdated = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.tokens_used !== undefined) {
        setTokensUsed(customEvent.detail.tokens_used);
      }
    };
    
    window.addEventListener("toggleProjectsPanel", handleToggle);
    window.addEventListener("projectsChanged", handleProjectsChanged);
    window.addEventListener("m365StatusChanged", handleM365Change);
    window.addEventListener("tokensUpdated", handleTokensUpdated);
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        loadProjects();
        loadSubscriptionData(session.user.id);
      } else {
        setProjects([]);
      }
    });

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("toggleProjectsPanel", handleToggle);
      window.removeEventListener("projectsChanged", handleProjectsChanged);
      window.removeEventListener("m365StatusChanged", handleM365Change);
      window.removeEventListener("tokensUpdated", handleTokensUpdated);
    };
  }, []);

  useEffect(() => {
    if (user) {
      loadProjects();
    }
  }, [activeFilter]);

  useEffect(() => {
    if (selectedProject) {
      loadFilesForProject(selectedProject.id);
    }
  }, [activeFileFilter]);

  useEffect(() => {
    const storedFileId = localStorage.getItem("activeFileId");
    if (storedFileId) {
      setActiveFileId(storedFileId);
    }
  }, [files]);

  // ✅ NEW: Load subscription data
  async function loadSubscriptionData(userId: string) {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("subscription_tier, tokens_used")
        .eq("id", userId)
        .single();

      if (data) {
        setSubscriptionTier(data.subscription_tier || "free");
        setTokensUsed(data.tokens_used || 0);
      }
    } catch (err) {
      console.error("Failed to load subscription data:", err);
    }
  }

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user || null);
    if (session?.user) {
      loadProjects();
      loadSubscriptionData(session.user.id);
      
      // Check M365 connection
      const { data } = await supabase
        .from("users")
        .select("microsoft_access_token")
        .eq("id", session.user.id)
        .single();
      
      setMicrosoftConnected(!!data?.microsoft_access_token);
    }
  }

  async function loadProjects() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    try {
      const filterParam = activeFilter === 'archive' ? 'archived' : 'active';
      const res = await fetch(`/api/list-projects?filter=${filterParam}`, {
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("Failed to load projects:", data.error);
        setProjects([]);
        return;
      }

      console.log("✅ Projects loaded:", data.projects?.length || 0);
      setProjects(data.projects || []);
    } catch (err) {
      console.error("Load projects error:", err);
      setProjects([]);
    }
  }

  async function loadFilesForProject(projectId: string) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    try {
      const filterParam = activeFileFilter === 'archive' ? 'archived' : 'active';
      const res = await fetch(`/api/list-files?projectId=${projectId}&filter=${filterParam}`, {
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("Failed to load files:", data.error);
        setFiles([]);
        return;
      }

      console.log("✅ Files loaded:", data.files?.length || 0);
      setFiles(data.files || []);
    } catch (err) {
      console.error("Load files error:", err);
      setFiles([]);
    }
  }

  const handleProjectClick = async (project: any) => {
    setSelectedProject(project);
    setActiveProjectId(project.id);
    await loadFilesForProject(project.id);
    setViewState("files");
    await loadProjectAllFiles(project);
  };

  const loadProjectAllFiles = async (project: any) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const filesRes = await fetch(`/api/list-files?projectId=${project.id}`, {
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
        },
      });

      const filesData = await filesRes.json();

      if (!filesRes.ok || !filesData.files || filesData.files.length === 0) {
        alert(`❌ No files found in project`);
        return;
      }

      const combinedDataset = {
        file_name: `${project.name} (All Files)`,
        data: filesData.files.flatMap((f: any) => f.dataset?.data || f.dataset?.rows || []),
      };

      localStorage.setItem("uploadedData", JSON.stringify(combinedDataset.data));
      localStorage.setItem("uploadedFileName", combinedDataset.file_name);
      localStorage.setItem("loadedChatHistory", JSON.stringify([]));
      localStorage.setItem("loadedProjectName", project.name);
      localStorage.setItem("loadedProjectId", project.id);
      localStorage.removeItem("activeFileId");
      
      const orgName = project.org_name || "Personal";
      localStorage.setItem("loadedOrgName", orgName);

      await fetch("/api/set-active-project", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          projectId: project.id,
          token: session.access_token 
        }),
      });

      // ✅ Notify LeftSidebar to refresh WhatsApp connection info
      window.dispatchEvent(new CustomEvent('activeProjectChanged'));

      window.dispatchEvent(new CustomEvent("openChatDrawer"));
    } catch (err: any) {
      console.error("Load project all files error:", err);
      alert(`❌ ${err.message}`);
    }
  };

  const handleFileClick = async (file: any) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch("/api/load-file", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          fileId: file.id,
          token: session.access_token 
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(`❌ ${data.error || "Failed to load file"}`);
        return;
      }

      if (data.dataset && data.dataset.data) {
        localStorage.setItem("uploadedData", JSON.stringify(data.dataset.data));
        localStorage.setItem("uploadedFileName", data.file.name);
      }
      
      localStorage.setItem("loadedChatHistory", JSON.stringify(data.messages || []));
      localStorage.setItem("loadedProjectName", selectedProject?.name || "Project");
      localStorage.setItem("loadedProjectId", selectedProject?.id || "");
      localStorage.setItem("loadedFileName", data.file.name);
      localStorage.setItem("activeFileId", file.id);
      
      const orgName = selectedProject?.org_name || "Personal";
      localStorage.setItem("loadedOrgName", orgName);

      setActiveFileId(file.id);

      await fetch("/api/set-active-file", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          fileId: file.id,
          token: session.access_token 
        }),
      });

      // ✅ Notify LeftSidebar to refresh WhatsApp connection info
      window.dispatchEvent(new CustomEvent('activeProjectChanged'));

      window.dispatchEvent(new CustomEvent("openChatDrawer"));
    } catch (err: any) {
      console.error("Load file error:", err);
      alert(`❌ ${err.message}`);
    }
  };

  const handleArchiveFile = async (fileId: string, fileName: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm(`Archive "${fileName}"?\n\nYou can restore it later from the Archive tab.`)) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch("/api/archive-file", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ 
          fileId,
          archived: true
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(`❌ ${data.error || "Failed to archive file"}`);
        return;
      }

      if (selectedProject) {
        await loadFilesForProject(selectedProject.id);
      }

      if (activeFileId === fileId) {
        setActiveFileId(null);
        localStorage.removeItem("activeFileId");
      }
    } catch (err: any) {
      console.error("Archive file error:", err);
      alert(`❌ ${err.message}`);
    }
  };

  const handleRestoreFile = async (fileId: string, fileName: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm(`Restore "${fileName}"?\n\nThis will move it back to your active files.`)) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch("/api/archive-file", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ 
          fileId,
          archived: false
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(`❌ ${data.error || "Failed to restore file"}`);
        return;
      }

      if (selectedProject) {
        await loadFilesForProject(selectedProject.id);
      }
    } catch (err: any) {
      console.error("Restore file error:", err);
      alert(`❌ ${err.message}`);
    }
  };

  const handleDeleteFile = async (fileId: string, fileName: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm(`⚠️ PERMANENTLY DELETE "${fileName}"?\n\nThis action cannot be undone. The file will be lost forever.`)) {
      return;
    }

    if (!confirm(`Are you absolutely sure?\n\nType the file name to confirm: "${fileName}"\n\nClick OK to proceed with permanent deletion.`)) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch("/api/delete-file", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ 
          fileId
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(`❌ ${data.error || "Failed to delete file"}`);
        return;
      }

      if (selectedProject) {
        await loadFilesForProject(selectedProject.id);
      }

      if (activeFileId === fileId) {
        setActiveFileId(null);
        localStorage.removeItem("activeFileId");
      }

      alert(`✅ ${data.message}`);
    } catch (err: any) {
      console.error("Delete file error:", err);
      alert(`❌ ${err.message}`);
    }
  };

  const handleBackToProjects = () => {
    setViewState("projects");
    setSelectedProject(null);
    setFiles([]);
    setActiveFileFilter("all"); // ✅ Reset file filter
  };

  const handleCreateProject = async () => {
    const projectName = prompt("Enter project name:");
    if (!projectName?.trim()) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch("/api/create-project", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ name: projectName.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(`❌ ${data.error || "Failed to create project"}`);
        return;
      }

      await loadProjects();
      alert(`✅ Project "${projectName}" created!`);
    } catch (err: any) {
      console.error("Create project error:", err);
      alert(`❌ ${err.message}`);
    }
  };

  const handleRenameProject = async () => {
    if (!selectedProject) return;

    const newName = prompt("Rename project:", selectedProject.name);
    if (!newName?.trim() || newName === selectedProject.name) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch("/api/rename-project", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ 
          projectId: selectedProject.id,
          newName: newName.trim() 
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(`❌ ${data.error || "Failed to rename project"}`);
        return;
      }

      setSelectedProject({ ...selectedProject, name: newName.trim() });
      await loadProjects();
      
      alert(`✅ Project renamed to "${newName}"`);
    } catch (err: any) {
      console.error("Rename project error:", err);
      alert(`❌ ${err.message}`);
    }
  };

  // NEW: Handle local file upload
  const handleUploadClick = () => {
    if (!selectedProject) {
      alert("❌ Please select a project first");
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!selectedProject) {
      alert("❌ No project selected");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert("❌ Please sign in");
        return;
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('projectId', selectedProject.id);

      const res = await fetch('/api/upload-file', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      alert(`✅ ${file.name} uploaded successfully!`);
      
      // Reload files list
      await loadFilesForProject(selectedProject.id);
      
    } catch (err: any) {
      console.error("Upload error:", err);
      alert(`❌ ${err.message}`);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // NEW: Handle OneDrive import
  const handleOneDriveClick = () => {
    if (!selectedProject) {
      alert("❌ Please select a project first");
      return;
    }
    
    if (!microsoftConnected) {
      alert("❌ Please connect Microsoft 365 first (use Profile menu)");
      return;
    }
    
    setShowM365Modal(true);
  };

  const handleM365ImportSuccess = async () => {
    // Reload files after successful import
    if (selectedProject) {
      await loadFilesForProject(selectedProject.id);
    }
  };

  const handleArchiveProject = async (projectId: string, projectName: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm(`Archive "${projectName}"?\n\nYou can restore it later from the Archive tab.`)) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch("/api/archive-project", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ 
          projectId,
          archived: true
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(`❌ ${data.error || "Failed to archive project"}`);
        return;
      }

      await loadProjects();

      if (activeProjectId === projectId) {
        setActiveProjectId(null);
        setActiveFileId(null);
        localStorage.removeItem("loadedProjectId");
        localStorage.removeItem("loadedProjectName");
        localStorage.removeItem("loadedOrgName");
        localStorage.removeItem("activeFileId");
      }
    } catch (err: any) {
      console.error("Archive project error:", err);
      alert(`❌ ${err.message}`);
    }
  };

  const handleRestoreProject = async (projectId: string, projectName: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm(`Restore "${projectName}"?\n\nThis will move it back to your active projects.`)) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch("/api/archive-project", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ 
          projectId,
          archived: false
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(`❌ ${data.error || "Failed to restore project"}`);
        return;
      }

      await loadProjects();
    } catch (err: any) {
      console.error("Restore project error:", err);
      alert(`❌ ${err.message}`);
    }
  };

  const handleDeleteProject = async (projectId: string, projectName: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm(`⚠️ PERMANENTLY DELETE "${projectName}"?\n\nThis action cannot be undone. All project data will be lost forever.`)) {
      return;
    }

    if (!confirm(`Are you absolutely sure?\n\nType the project name to confirm: "${projectName}"\n\nClick OK to proceed with permanent deletion.`)) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch("/api/delete-project", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ 
          projectId
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(`❌ ${data.error || "Failed to delete project"}`);
        return;
      }

      await loadProjects();

      if (activeProjectId === projectId) {
        setActiveProjectId(null);
        setActiveFileId(null);
        localStorage.removeItem("loadedProjectId");
        localStorage.removeItem("loadedProjectName");
        localStorage.removeItem("loadedOrgName");
        localStorage.removeItem("activeFileId");
      }

      alert(`✅ ${data.message}`);
    } catch (err: any) {
      console.error("Delete project error:", err);
      alert(`❌ ${err.message}`);
    }
  };

  const filteredProjects = projects;

  // ✅ NEW: Check if user is PRO
  const isPro = subscriptionTier?.toLowerCase() === "pro" || subscriptionTier?.toLowerCase() === "premium";

  if (!user) {
    return null;
  }

  return (
    <>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        style={{ display: "none" }}
        onChange={handleFileSelected}
      />

      {/* M365 Import Modal */}
      <M365FileImportModal
        isOpen={showM365Modal}
        onClose={() => setShowM365Modal(false)}
        projectId={selectedProject?.id}
        onSuccess={handleM365ImportSuccess}
      />

      <div
        style={{
          position: "fixed",
          left: "64px",
          top: 0,
          height: "100vh",
          width: isOpen ? "280px" : "0px",
          background: "rgba(255, 255, 255, 0.7)",
          backdropFilter: "blur(10px)",
          borderRight: isOpen ? "1px solid rgba(229, 231, 235, 0.3)" : "none",
          boxShadow: isOpen ? "2px 0 12px rgba(0, 0, 0, 0.03)" : "none",
          zIndex: 35,
          display: "flex",
          flexDirection: "column",
          fontFamily: "var(--font-ibm-plex)",
          overflow: "hidden",
          transition: "width 0.3s cubic-bezier(0.4, 0.0, 0.2, 1), opacity 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)",
          opacity: isOpen ? 1 : 0,
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px",
            borderBottom: "1px solid rgba(229, 231, 235, 0.3)",
          }}
        >
          {/* Back Button + Upload/Import Icons (when in files view) */}
          {viewState === "files" && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "12px",
              }}
            >
              <button
                onClick={handleBackToProjects}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 0",
                  fontSize: "12px",
                  fontWeight: 500,
                  color: "#2563EB",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <ArrowLeft size={14} />
                Back to Projects
              </button>

              {/* Upload/Import Icons */}
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={handleUploadClick}
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "6px",
                    background: "rgba(37, 99, 235, 0.08)",
                    border: "1px solid rgba(37, 99, 235, 0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  title="Upload file"
                >
                  <Upload size={16} style={{ color: "#2563EB" }} />
                </button>

                {microsoftConnected && (
                  <button
                    onClick={handleOneDriveClick}
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "6px",
                      background: "rgba(37, 99, 235, 0.08)",
                      border: "1px solid rgba(37, 99, 235, 0.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                    title="Import from OneDrive"
                  >
                    <Cloud size={16} style={{ color: "#2563EB" }} />
                  </button>
                )}
              </div>
            </div>
          )}

          <h2
            style={{
              fontSize: "16px",
              fontWeight: 600,
              color: "#2A2A2A",
              marginBottom: "12px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            {viewState === "projects" ? "Current Projects" : selectedProject?.name || "Files"}
            {viewState === "files" && (
              <button
                onClick={handleRenameProject}
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "4px",
                  background: "rgba(37, 99, 235, 0.08)",
                  border: "1px solid rgba(37, 99, 235, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                title="Rename project"
              >
                <Pencil size={12} style={{ color: "#2563EB" }} />
              </button>
            )}
          </h2>

          {/* Filter Tabs */}
          {viewState === "projects" ? (
            <div
              style={{
                display: "flex",
                gap: "8px",
              }}
            >
              <FilterTab
                label="All"
                active={activeFilter === "all"}
                onClick={() => setActiveFilter("all")}
              />
              <FilterTab
                label="Archive"
                active={activeFilter === "archive"}
                onClick={() => setActiveFilter("archive")}
              />
            </div>
          ) : (
            // ✅ NEW: File filter tabs
            <div
              style={{
                display: "flex",
                gap: "8px",
              }}
            >
              <FilterTab
                label="All"
                active={activeFileFilter === "all"}
                onClick={() => setActiveFileFilter("all")}
              />
              <FilterTab
                label="Archive"
                active={activeFileFilter === "archive"}
                onClick={() => setActiveFileFilter("archive")}
              />
            </div>
          )}
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "12px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Scrollable project/file list */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {viewState === "projects" ? (
              <>
                {/* NEW PROJECT CARD */}
                {activeFilter === "all" && (
                  <NewProjectCard onClick={handleCreateProject} />
                )}

                {filteredProjects.length === 0 ? (
                  <div
                    style={{
                      padding: "40px 20px",
                      textAlign: "center",
                      color: "#9CA3AF",
                      fontSize: "14px",
                    }}
                  >
                    {activeFilter === "archive" ? "No archived projects" : "No projects yet"}
                  </div>
                ) : (
                  filteredProjects.map((project) => {
                    const isActive = activeProjectId === project.id;
                    
                    return (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        isActive={isActive}
                        isArchived={activeFilter === "archive"}
                        onClick={() => handleProjectClick(project)}
                        onArchive={(e) => handleArchiveProject(project.id, project.name, e)}
                        onRestore={(e) => handleRestoreProject(project.id, project.name, e)}
                        onDelete={(e) => handleDeleteProject(project.id, project.name, e)}
                      />
                    );
                  })
                )}
              </>
            ) : (
              <>
                {files.length === 0 ? (
                  <div
                    style={{
                      padding: "40px 20px",
                      textAlign: "center",
                      color: "#9CA3AF",
                      fontSize: "14px",
                    }}
                  >
                    {activeFileFilter === "archive" ? "No archived files" : "No files in this project yet"}
                    {activeFileFilter === "all" && (
                      <div style={{ marginTop: "12px" }}>
                        <button
                          onClick={handleUploadClick}
                          style={{
                            padding: "8px 16px",
                            background: "#2563EB",
                            color: "white",
                            borderRadius: "6px",
                            border: "none",
                            cursor: "pointer",
                            fontSize: "12px",
                            fontWeight: 500,
                          }}
                        >
                          Upload First File
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  files.map((file) => {
                    const isActive = activeFileId === file.id;
                    
                    return (
                      <FileCard
                        key={file.id}
                        file={file}
                        isActive={isActive}
                        isArchived={activeFileFilter === "archive"}
                        onClick={() => handleFileClick(file)}
                        onArchive={(e) => handleArchiveFile(file.id, file.file_name, e)}
                        onRestore={(e) => handleRestoreFile(file.id, file.file_name, e)}
                        onDelete={(e) => handleDeleteFile(file.id, file.file_name, e)}
                      />
                    );
                  })
                )}
              </>
            )}
          </div>

          {/* ✅ NEW: Pro Upgrade Card - Fixed at bottom, only for FREE users */}
          {!isPro && (
            <ProUpgradeCard 
              tokensUsed={tokensUsed} 
              tokenLimit={TOKEN_LIMIT_FREE}
              onClick={() => router.push('/pricing')}
            />
          )}
        </div>
      </div>
    </>
  );
}

// Filter Tab Component
function FilterTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 12px",
        fontSize: "12px",
        fontWeight: 500,
        color: active ? "#2563EB" : "#6B7280",
        background: active ? "rgba(37, 99, 235, 0.08)" : "transparent",
        border: active ? "1px solid rgba(37, 99, 235, 0.2)" : "1px solid transparent",
        borderRadius: "6px",
        cursor: "pointer",
        transition: "all 0.2s",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = "rgba(243, 244, 246, 0.8)";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = "transparent";
        }
      }}
    >
      {label}
    </button>
  );
}

// NEW PROJECT CARD
function NewProjectCard({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "20px",
        marginBottom: "12px",
        borderRadius: "10px",
        border: "2px dashed #D1D5DB",
        background: hovered ? "rgba(255, 255, 255, 1)" : "rgba(255, 255, 255, 0.7)",
        cursor: "pointer",
        transition: "all 0.2s ease",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "8px",
      }}
    >
      <div
        style={{
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          background: hovered 
            ? "linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)"
            : "rgba(37, 99, 235, 0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.2s",
        }}
      >
        <Plus size={20} style={{ color: hovered ? "white" : "#2563EB" }} />
      </div>
      <div
        style={{
          fontSize: "12px",
          fontWeight: 600,
          color: hovered ? "#2563EB" : "#6B7280",
          transition: "color 0.2s",
        }}
      >
        Create New Project
      </div>
    </div>
  );
}

// ✅ NEW: PRO UPGRADE CARD
function ProUpgradeCard({ 
  tokensUsed, 
  tokenLimit,
  onClick 
}: { 
  tokensUsed: number;
  tokenLimit: number;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  
  const usagePercent = Math.min((tokensUsed / tokenLimit) * 100, 100);
  const isNearLimit = usagePercent >= 80;
  
  // Format token count nicely
  const formatTokens = (n: number) => {
    if (n >= 1000) {
      return `${(n / 1000).toFixed(1)}k`;
    }
    return n.toLocaleString();
  };

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "16px",
        marginTop: "12px",
        borderRadius: "10px",
        border: "1px solid rgba(139, 92, 246, 0.3)",
        background: hovered 
          ? "linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(124, 58, 237, 0.15) 100%)"
          : "linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(124, 58, 237, 0.08) 100%)",
        cursor: "pointer",
        transition: "all 0.2s ease",
        flexShrink: 0,
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "12px",
        }}
      >
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            background: hovered 
              ? "linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)"
              : "rgba(139, 92, 246, 0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s",
          }}
        >
          <Zap size={16} style={{ color: hovered ? "white" : "#8B5CF6" }} />
        </div>
        <div>
          <div
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "#7C3AED",
            }}
          >
            Go Pro
          </div>
          <div
            style={{
              fontSize: "10px",
              color: "#9CA3AF",
            }}
          >
            Unlimited tokens
          </div>
        </div>
      </div>

      {/* Token usage */}
      <div style={{ marginBottom: "8px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "4px",
          }}
        >
          <span
            style={{
              fontSize: "10px",
              color: isNearLimit ? "#EF4444" : "#6B7280",
              fontWeight: isNearLimit ? 600 : 400,
            }}
          >
            {formatTokens(tokensUsed)} / {formatTokens(tokenLimit)} tokens
          </span>
          <span
            style={{
              fontSize: "10px",
              color: isNearLimit ? "#EF4444" : "#9CA3AF",
            }}
          >
            {usagePercent.toFixed(0)}%
          </span>
        </div>
        
        {/* Progress bar */}
        <div
          style={{
            width: "100%",
            height: "4px",
            borderRadius: "2px",
            background: "rgba(139, 92, 246, 0.2)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${usagePercent}%`,
              height: "100%",
              borderRadius: "2px",
              background: isNearLimit 
                ? "linear-gradient(90deg, #F59E0B 0%, #EF4444 100%)"
                : "linear-gradient(90deg, #8B5CF6 0%, #7C3AED 100%)",
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>

      {/* CTA text */}
      <div
        style={{
          fontSize: "10px",
          color: hovered ? "#7C3AED" : "#9CA3AF",
          textAlign: "center",
          transition: "color 0.2s",
        }}
      >
        {isNearLimit ? "Running low! Upgrade now →" : "Upgrade for unlimited →"}
      </div>
    </div>
  );
}

// PROJECT CARD - 2 ROW LAYOUT
function ProjectCard({
  project,
  isActive,
  isArchived,
  onClick,
  onArchive,
  onRestore,
  onDelete,
}: {
  project: any;
  isActive: boolean;
  isArchived: boolean;
  onClick: () => void;
  onArchive: (e: React.MouseEvent) => void;
  onRestore: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const [hovered, setHovered] = useState(false);

  const subtitle = project.org_name || "Personal";

  const getInitials = (name: string) => {
    const cleaned = name.replace(/^\d+[\s_-]*/g, '');
    const words = cleaned.split(/[\s_-]+/).filter(w => w.length > 0);
    
    if (words.length >= 2) {
      return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
    }
    return cleaned.substring(0, 2).toUpperCase();
  };

  const getProjectColor = (projectId: string) => {
    const colors = [
      'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
      'linear-gradient(135deg, #10B981 0%, #059669 100%)',
      'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
      'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)',
      'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)',
      'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
      'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
      'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
    ];
    
    const hash = projectId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const initials = getInitials(project.name);
  const projectColor = getProjectColor(project.id);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "16px",
        marginBottom: "8px",
        borderRadius: "10px",
        border: isActive 
          ? "2px solid #2563EB" 
          : "1.5px solid transparent",
        background: "rgba(255, 255, 255, 1)",
        cursor: "pointer",
        transition: "all 0.15s ease",
        boxShadow: isActive 
          ? "0 4px 12px rgba(37, 99, 235, 0.15)" 
          : hovered 
            ? "0 2px 8px rgba(0, 0, 0, 0.08)" 
            : "none",
      }}
    >
      {/* ROW 1: Icon + Project Name */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "12px",
        }}
      >
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            background: isActive 
              ? "linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)"
              : projectColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "12px",
            fontWeight: 700,
            color: "white",
            flexShrink: 0,
            transition: "all 0.2s",
            letterSpacing: "0.5px",
          }}
        >
          {initials}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "#1F2937",
              marginBottom: "2px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {project.name}
          </div>
          <div
            style={{
              fontSize: "10px",
              color: "#6B7280",
            }}
          >
            {subtitle}
          </div>
        </div>
      </div>

      {/* ROW 2: Action Icons (right-aligned) */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: "6px",
          paddingRight: "4px",
        }}
      >
        {isArchived ? (
          <>
            <div
              onClick={onRestore}
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                background: hovered ? "rgba(16, 185, 129, 0.1)" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "background 0.2s",
                opacity: hovered ? 1 : 0,
              }}
            >
              <ArchiveRestore size={12} style={{ color: "#10B981" }} />
            </div>
            
            <div
              onClick={onDelete}
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                background: hovered ? "rgba(239, 68, 68, 0.1)" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "background 0.2s",
                opacity: hovered ? 1 : 0,
              }}
            >
              <Trash2 size={12} style={{ color: "#EF4444" }} />
            </div>
          </>
        ) : (
          <>
            <div
              onClick={onArchive}
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                background: hovered ? "rgba(107, 114, 128, 0.1)" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "background 0.2s",
                opacity: hovered ? 1 : 0,
              }}
            >
              <Archive size={12} style={{ color: "#6B7280" }} />
            </div>
          </>
        )}

        {isActive && (
          <div
            style={{
              width: "24px",
              height: "24px",
              borderRadius: "50%",
              background: "rgba(37, 211, 102, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MessageCircle size={12} style={{ color: "#25D366", strokeWidth: 2.5 }} />
          </div>
        )}
      </div>
    </div>
  );
}

// FILE CARD - 2 ROW LAYOUT
function FileCard({
  file,
  isActive,
  isArchived,
  onClick,
  onArchive,
  onRestore,
  onDelete,
}: {
  file: any;
  isActive: boolean;
  isArchived: boolean;
  onClick: () => void;
  onArchive: (e: React.MouseEvent) => void;
  onRestore: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  const [hovered, setHovered] = useState(false);

  const rowCount = file.dataset?.data?.length || file.dataset?.rows?.length || 0;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "16px",
        marginBottom: "8px",
        borderRadius: "10px",
        border: isActive 
          ? "2px solid #2563EB" 
          : "1.5px solid transparent",
        background: "rgba(255, 255, 255, 1)",
        cursor: "pointer",
        transition: "all 0.15s ease",
        boxShadow: isActive 
          ? "0 4px 12px rgba(37, 99, 235, 0.15)" 
          : hovered 
            ? "0 2px 8px rgba(0, 0, 0, 0.08)" 
            : "none",
      }}
    >
      {/* ROW 1: Icon + File Name */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "12px",
        }}
      >
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            background: isActive 
              ? "linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)"
              : "linear-gradient(135deg, #10B981 0%, #059669 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            transition: "all 0.2s",
          }}
        >
          <FileText size={18} style={{ color: "white" }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "#1F2937",
              marginBottom: "2px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {file.file_name}
          </div>
          <div
            style={{
              fontSize: "10px",
              color: "#6B7280",
            }}
          >
            {rowCount} rows
          </div>
        </div>
      </div>

      {/* ROW 2: Action Icons (right-aligned) */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: "6px",
          paddingRight: "4px",
        }}
      >
        {isArchived ? (
          <>
            <div
              onClick={onRestore}
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                background: hovered ? "rgba(16, 185, 129, 0.1)" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "background 0.2s",
                opacity: hovered ? 1 : 0,
              }}
            >
              <ArchiveRestore size={12} style={{ color: "#10B981" }} />
            </div>
            
            <div
              onClick={onDelete}
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                background: hovered ? "rgba(239, 68, 68, 0.1)" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "background 0.2s",
                opacity: hovered ? 1 : 0,
              }}
            >
              <Trash2 size={12} style={{ color: "#EF4444" }} />
            </div>
          </>
        ) : (
          <>
            <div
              onClick={onArchive}
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                background: hovered ? "rgba(107, 114, 128, 0.1)" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "background 0.2s",
                opacity: hovered ? 1 : 0,
              }}
            >
              <Archive size={12} style={{ color: "#6B7280" }} />
            </div>
          </>
        )}

        {isActive && (
          <div
            style={{
              width: "24px",
              height: "24px",
              borderRadius: "50%",
              background: "rgba(37, 211, 102, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MessageCircle size={12} style={{ color: "#25D366", strokeWidth: 2.5 }} />
          </div>
        )}
      </div>
    </div>
  );
}
