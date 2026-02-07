"use client";

import { useState, useEffect } from "react";
import { X, FileSpreadsheet, Calendar, HardDrive, AlertCircle, Cloud, Folder, ChevronRight, Info, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

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

interface M365FileImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string | null; // Optional - if provided, imports to this project
  onSuccess?: () => void; // Callback after successful import
}

export default function M365FileImportModal({ 
  isOpen, 
  onClose, 
  projectId = null,
  onSuccess 
}: M365FileImportModalProps) {
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

  // Check account type on mount
  useEffect(() => {
    checkAccountType();
  }, []);

  // Load files when modal opens
  useEffect(() => {
    if (isOpen && activeTab === 'onedrive') {
      loadM365Files();
    }
  }, [isOpen]);

  async function checkAccountType() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data } = await supabase
        .from("users")
        .select("email")
        .eq("id", session.user.id)
        .single();
      
      if (data?.email) {
        const email = data.email.toLowerCase();
        const isPersonal = email.includes('@outlook.com') || 
                          email.includes('@hotmail.com') || 
                          email.includes('@live.com');
        setIsPersonalAccount(isPersonal);
      }
    }
  }

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
        body: JSON.stringify({ 
          fileId, 
          fileName,
          projectId // Pass projectId if provided
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Import failed. Please try again.');
      }

      const result = await response.json();
      
      // Close modal
      onClose();
      
      // Trigger success callback
      if (onSuccess) {
        onSuccess();
      }
      
      // If no projectId, store in localStorage and reload (freemium mode)
      if (!projectId) {
        localStorage.setItem('uploadedData', JSON.stringify(result.data));
        localStorage.setItem('uploadedFileName', fileName);
        setTimeout(() => window.location.reload(), 500);
      }
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

  if (!isOpen) return null;

  return (
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
            onClick={onClose}
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
                    💡 <strong>Tip:</strong> Importing a file will {projectId ? 'add it to your current project' : 'reload the page with your new data'}. 
                    Your file should contain columns for Category, Revision, Status, and Comments.
                  </p>
                </div>
              )}
            </>
          )}

          {/* SharePoint Tab */}
          {activeTab === 'sharepoint' && (
            <div className="text-center py-16">
              <Cloud className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-900 font-medium mb-2" style={{ fontFamily: 'var(--font-ibm-plex)' }}>
                SharePoint Integration
              </p>
              <p className="text-sm text-gray-500" style={{ fontFamily: 'var(--font-ibm-plex)' }}>
                {isPersonalAccount 
                  ? 'Personal accounts do not have access to SharePoint. Use OneDrive instead.'
                  : 'SharePoint file browsing available for work accounts'
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
