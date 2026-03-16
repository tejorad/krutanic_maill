import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import logo from './assets/image.png';
import { 
  Users, 
  Send, 
  CheckCircle, 
  XCircle, 
  BarChart3, 
  Server, 
  Upload, 
  Play, 
  RefreshCw,
  Search,
  Mail,
  MoreVertical,
  Loader2,
  FileText,
  Plus,
  Trash2,
  AlertCircle,
  Eye,
  Settings,
  ShieldCheck,
  TrendingUp,
  LogOut
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';

const API_BASE = '';

export default function Dashboard({ user, onLogout }) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    totalLeads: 0,
    sentToday: 0,
    delivered: 0,
    bounced: 0,
    openRate: 0,
    clickRate: 0
  });

  const [leads, setLeads] = useState([]);
  const [totalLeadsCount, setTotalLeadsCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const PAGE_SIZE = 20;

  const [logs, setLogs] = useState([]);
  const [smtpAccounts, setSmtpAccounts] = useState([]);
  const [showSmtpModal, setShowSmtpModal] = useState(false);
  const [newSmtp, setNewSmtp] = useState({ email: '', app_password: '', daily_limit: 500 });
  const [isLaunching, setIsLaunching] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [template, setTemplate] = useState({
    subjects: [],
    greetings: [],
    body_paragraphs: [],
    closings: [],
    signatures: []
  });
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [showTemplateImportModal, setShowTemplateImportModal] = useState(false);
  const [templateImportText, setTemplateImportText] = useState('');
  const [editSection, setEditSection] = useState(null); // { key, label, icon }
  const [previewHtml, setPreviewHtml] = useState(null); // For previewing HTML templates

  // Campaign State
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState('all');
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState('');
  const [showCampaignDropdown, setShowCampaignDropdown] = useState(false);

  // Live campaign run state
  const [campaignStatus, setCampaignStatus] = useState({ isRunning: false });
  const [isStopping, setIsStopping] = useState(false);
  const [localElapsedMs, setLocalElapsedMs] = useState(0);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  // Client-side visual ticker - updates UI ONLY, no API calls
  useEffect(() => {
    if (!campaignStatus?.isRunning || !campaignStatus?.startedAt) {
      setLocalElapsedMs(campaignStatus?.elapsedMs || 0);
      return;
    }
    const updateTime = () => setLocalElapsedMs(Date.now() - new Date(campaignStatus.startedAt).getTime());
    updateTime(); // initial
    const id = setInterval(updateTime, 1000);
    return () => clearInterval(id);
  }, [campaignStatus?.isRunning, campaignStatus?.startedAt]);

  const isLoopRunning = useRef(false);

  // The "Boss" loop that drives the campaign
  const runCampaignLoop = async () => {
    if (isLoopRunning.current) return;
    isLoopRunning.current = true;

    console.log("Starting Browser-Driven Campaign Loop...");
    
    try {
      while (true) {
        // 1. Check if stopped by user or manually
        const statusRes = await axios.get(`${API_BASE}/api/leads/campaign-status`);
        const status = statusRes.data?.data;
        if (!status || !status.isRunning) {
          console.log("Campaign stopped or finished.");
          break;
        }

        // 2. Fetch a batch of leads
        const batchRes = await axios.get(`${API_BASE}/api/leads/batch?campaign=${encodeURIComponent(status.campaign)}&limit=10`);
        const batchLeads = batchRes.data?.leads || [];

        if (batchLeads.length === 0) {
          console.log("No more leads found. Marking as complete.");
          await axios.post(`${API_BASE}/api/leads/stop`);
          break;
        }

        // 3. Send emails in the batch
        // We'll send them one-by-one to be super safe on Serverless
        for (const lead of batchLeads) {
          try {
            await axios.post(`${API_BASE}/api/leads/send-one`, { leadId: lead._id });
          } catch (err) {
            console.error(`Failed to send to ${lead.email}:`, err.message);
          }
        }

        // 4. Randomized delay between batches (0.5s to 1s)
        const delay = Math.floor(Math.random() * 500) + 500;
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // 5. Refresh UI stats
        handleManualRefresh();
      }
    } catch (err) {
      console.error("Campaign loop crashed:", err);
    } finally {
      isLoopRunning.current = false;
    }
  };

  // Auto-resume if page is refreshed
  useEffect(() => {
    if (campaignStatus?.isRunning && !isLoopRunning.current) {
      runCampaignLoop();
    }
  }, [campaignStatus?.isRunning]);

  // Format elapsed ms → 00:00:00
  const formatElapsed = (ms) => {
    if (!ms) return '00:00:00';
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return [h, m, sec].map(v => String(v).padStart(2, '0')).join(':');
  };

  const fileInputRef = useRef(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Fetch Stats, Leads, Logs, SMTP & Template
  const fetchData = async (includeTemplate = false) => {
    try {
      const campaignParam = selectedCampaign !== 'all' ? `?campaign=${encodeURIComponent(selectedCampaign)}` : '';
      
      const promises = [
        axios.get(`${API_BASE}/api/leads/stats${campaignParam}`),
        axios.get(`${API_BASE}/api/leads${campaignParam}${campaignParam ? '&' : '?'}limit=${PAGE_SIZE}&page=${currentPage}`),
        axios.get(`${API_BASE}/api/smtp/status`),
        axios.get(`${API_BASE}/api/leads/logs`),
        axios.get(`${API_BASE}/api/leads/campaigns`)
      ];

      if (includeTemplate) {
        promises.push(axios.get(`${API_BASE}/api/template`));
      }
      
      const results = await Promise.all(promises);
      const [statsRes, leadsRes, smtpRes, logsRes, campaignsRes] = results;
      
      if (statsRes.data?.success) setStats(statsRes.data.data);
      if (leadsRes.data?.success) {
        setLeads(leadsRes.data.data);
        setTotalLeadsCount(leadsRes.data.total);
        setTotalPages(Math.ceil(leadsRes.data.total / PAGE_SIZE));
      }
      if (smtpRes.data?.success) setSmtpAccounts(smtpRes.data.data);
      if (logsRes.data?.success) setLogs(logsRes.data.data);
      if (campaignsRes.data?.success) setCampaigns(campaignsRes.data.data);

      if (includeTemplate) {
        const templateRes = results[5];
        if (templateRes.data?.success) setTemplate(templateRes.data.data);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  useEffect(() => {
    fetchData(true);
  }, [selectedCampaign, currentPage]);

  // Auto-refresh every 5s ONLY if a campaign is running
  useEffect(() => {
    if (!campaignStatus?.isRunning) return;

    const interval = setInterval(handleManualRefresh, 60000);
    return () => clearInterval(interval);
  }, [campaignStatus?.isRunning]);

  // Perform an initial check of campaign status on load
  useEffect(() => {
    const pollStatus = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/leads/campaign-status`);
        if (res.data?.success) setCampaignStatus(res.data.data);
      } catch (_) {}
    };
    pollStatus();
  }, []);

  const handleManualRefresh = async () => {
    setIsManualRefreshing(true);
    try {
      await Promise.all([
        fetchData(true),
        (async () => {
          try {
            const res = await axios.get(`${API_BASE}/api/leads/campaign-status`);
            if (res.data?.success) setCampaignStatus(res.data.data);
          } catch (_) {}
        })()
      ]);
    } finally {
      // Small delay so animation is visible
      setTimeout(() => setIsManualRefreshing(false), 500);
    }
  };
  
  const handleSmtpToggle = async (id, enabled) => {
    try {
      await axios.patch(`${API_BASE}/api/smtp/${id}`, { enabled: !enabled });
      fetchData();
    } catch (err) {
      alert("Failed to update account: " + err.message);
    }
  };

  const handleSmtpDelete = async (id) => {
    if (!window.confirm("Remove this SMTP account?")) return;
    try {
      await axios.delete(`${API_BASE}/api/smtp/${id}`);
      fetchData();
    } catch (err) {
      alert("Failed to delete account: " + err.message);
    }
  };

  const handleAddSmtp = async () => {
    if (!newSmtp.email || !newSmtp.app_password) {
      alert("Please fill in email and password.");
      return;
    }
    try {
      await axios.post(`${API_BASE}/api/smtp`, newSmtp);
      setNewSmtp({ email: '', app_password: '', daily_limit: 500 });
      setShowSmtpModal(false);
      fetchData();
    } catch (err) {
      alert("Failed to add account: " + (err.response?.data?.error || err.message));
    }
  };

  const uploadFile = async (file) => {
    if (!file) return;
    if (selectedCampaign === 'all') {
      alert("Please select a specific campaign before importing leads.");
      return;
    }
    const formData = new FormData();
    formData.append('file', file);
    formData.append('campaign', selectedCampaign);

    setIsUploading(true);
    try {
      const res = await axios.post(`${API_BASE}/import-leads`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert(`Import Successful! Imported ${res.data.imported} new leads to ${selectedCampaign}.`);
      fetchData();
    } catch (err) {
      alert("Upload failed: " + (err.response?.data?.error || err.message));
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e) => {
    uploadFile(e.target.files?.[0]);
    e.target.value = ''; 
  };

  const handlePasteImport = async () => {
    const emails = [...new Set(pasteText.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi) || [])];
    
    if (emails.length === 0) {
      alert("No valid email addresses found in text.");
      return;
    }

    if (selectedCampaign === 'all') {
      alert("Please select a specific campaign before importing leads.");
      return;
    }

    setIsUploading(true);
    try {
      // Note: We need to update backend bulk endpoint too, or just use import-leads logic
      const res = await axios.post(`${API_BASE}/api/leads/bulk`, { 
        emails, 
        campaign: selectedCampaign 
      });
      alert(`Successfully imported ${res.data.inserted} leads to ${selectedCampaign} (${res.data.skipped} duplicates skipped).`);
      setPasteText('');
      setShowPasteModal(false);
      fetchData();
    } catch (err) {
      alert("Import failed: " + (err.response?.data?.error || err.message));
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.csv') || file.type === 'text/csv')) {
      uploadFile(file);
    } else {
      alert("Please drop a valid .csv file.");
    }
  };

  const handleLaunch = async () => {
    if (selectedCampaign === 'all') {
      alert('Please select a specific campaign to launch.');
      return;
    }
    if (campaignStatus?.isRunning) {
      alert('A campaign is already running. Stop it first.');
      return;
    }
    if (!window.confirm(`Start campaign for all active leads in "${selectedCampaign}"?`)) return;
    
    setIsLaunching(true);
    try {
      const res = await axios.post(`${API_BASE}/api/leads/send`, { campaign: selectedCampaign });
      // The backend initialized the state, now we start the browser engine
      setCampaignStatus(prev => ({ ...prev, isRunning: true, campaign: selectedCampaign }));
      runCampaignLoop();
      // Switch to overview tab so the user sees live stats immediately
      setActiveTab('overview');
      // Trigger an immediate refresh so stats don't wait 30s
      handleManualRefresh();
      alert(res.data.message || 'Campaign started!');
    } catch (err) {
      alert('Launch failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsLaunching(false);
    }
  };

  const handleStop = async () => {
    if (!window.confirm('Stop the running campaign?')) return;
    setIsStopping(true);
    try {
      await axios.post(`${API_BASE}/api/leads/stop`);
    } catch (err) {
      alert('Stop failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsStopping(false);
    }
  };

  const handleDeleteCampaign = async (campaignName, e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete campaign "${campaignName}" and ALL its leads? This cannot be undone.`)) return;
    try {
      const res = await axios.delete(`${API_BASE}/api/leads/campaigns/${encodeURIComponent(campaignName)}`);
      alert(`Deleted! ${res.data.leadsDeleted} leads removed.`);
      if (selectedCampaign === campaignName) setSelectedCampaign('all');
      fetchData();
    } catch (err) {
      alert('Delete failed: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleCreateCampaign = async () => {
    const name = newCampaignName.trim();
    if (!name) return;
    
    try {
      await axios.post(`${API_BASE}/api/leads/campaigns`, { name });
      setSelectedCampaign(name);
      setNewCampaignName('');
      setShowCampaignModal(false);
      fetchData(); // Refresh list
    } catch (err) {
      alert("Failed to create campaign: " + (err.response?.data?.error || err.message));
    }
  };

  const handleUpdateTemplate = async () => {
    setIsSavingTemplate(true);
    try {
      await axios.patch(`${API_BASE}/api/template`, template);
      alert("Template saved successfully!");
    } catch (err) {
      alert("Failed to save template: " + (err.response?.data?.error || err.message));
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const addTemplateItem = (key) => {
    setTemplate(prev => ({ 
      ...prev, 
      [key]: [...(prev[key] || []), { content: '', enabled: true }] 
    }));
  };

  const removeTemplateItem = (key, index) => {
    setTemplate(prev => {
      const newList = [...(prev[key] || [])];
      newList.splice(index, 1);
      return { ...prev, [key]: newList };
    });
  };

  const handleTemplateBulkImport = () => {
    try {
      const text = templateImportText;
      const extractArray = (varName) => {
        const regex = new RegExp(`(?:const|let|var|)\\s*${varName}\\s*=\\s*\\[([\\s\\S]*?)\\]`, 'i');
        const match = text.match(regex);
        if (match) {
          // Extract items, handling quotes, backticks and commas
          const content = match[1];
          return content
            .split(/`,|',|",|`,|',|",|\n/)
            .map(item => item.trim().replace(/^[`'"]|[`'"]$/g, '').trim())
            .filter(item => item.length > 0 && !item.startsWith('//'));
        }
        return null;
      };

      const toObjects = (arr) => arr.map(item => ({ content: item, enabled: true }));

      const imported = {
        subjects: extractArray('SUBJECTS') ? toObjects(extractArray('SUBJECTS')) : template.subjects,
        greetings: extractArray('GREETINGS') ? toObjects(extractArray('GREETINGS')) : template.greetings,
        body_paragraphs: extractArray('BODY_PARAGRAPHS') ? toObjects(extractArray('BODY_PARAGRAPHS')) : template.body_paragraphs,
        closings: extractArray('CLOSINGS') ? toObjects(extractArray('CLOSINGS')) : template.closings,
        signatures: extractArray('SIGNATURES') ? toObjects(extractArray('SIGNATURES')) : template.signatures
      };

      setTemplate(prev => ({ ...prev, ...imported }));
      setShowTemplateImportModal(false);
      setTemplateImportText('');
      alert("Template components parsed! Don't forget to click 'Save Template' to apply changes.");
    } catch (err) {
      alert("Failed to parse template: " + err.message);
    }
  };

  const handleDeleteLead = async (id) => {
    if (!window.confirm("Delete this lead?")) return;
    try {
      await axios.delete(`${API_BASE}/api/leads/${id}`);
      fetchData();
    } catch (err) {
      alert("Failed to delete lead: " + err.message);
    }
  };

  const handleClearLogs = async () => {
    if (!window.confirm("Are you sure you want to clear all delivery logs? This cannot be undone.")) return;
    try {
      await axios.delete(`${API_BASE}/api/leads/logs`);
      fetchData();
    } catch (err) {
      alert("Failed to clear logs: " + err.message);
    }
  };

  // Build hourly delivery chart data from real logs
  const chartData = (() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({
      name: `${String(i).padStart(2, '0')}:00`,
      volume: 0
    }));
    logs.forEach(log => {
      const h = new Date(log.createdAt).getHours();
      if (!isNaN(h)) hours[h].volume += 1;
    });
    return hours;
  })();

  return (
    <div 
      className="container" 
      style={{ paddingTop: '100px', minHeight: '100vh' }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag Over Overlay */}
      {isDragging && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(59, 130, 246, 0.1)', backdropFilter: 'blur(8px)',
          zIndex: 9999, display: 'grid', placeItems: 'center', pointerEvents: 'none',
          border: '4px dashed var(--primary)'
        }}>
          <div style={{ textAlign: 'center' }}>
            <Upload size={64} color="var(--primary)" />
            <h2 style={{ marginTop: '16px', color: 'white' }}>Drop CSV to Import</h2>
          </div>
        </div>
      )}

      {/* SMTP Add Modal */}
      {showSmtpModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)',
          zIndex: 2000, display: 'grid', placeItems: 'center'
        }}>
          <div className="glass-card" style={{ width: '450px', padding: '32px' }}>
            <h2 style={{ marginBottom: '24px' }}>Add SMTP Account</h2>
            <div style={{ display: 'grid', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>Gmail Address</label>
                <input 
                  type="email" 
                  value={newSmtp.email}
                  onChange={(e) => setNewSmtp({...newSmtp, email: e.target.value})}
                  placeholder="abdul@krutanic.org"
                  style={{ width: '100%', padding: '12px', background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: 'white' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>App Password (16 chars)</label>
                <input 
                  type="password" 
                  value={newSmtp.app_password}
                  onChange={(e) => setNewSmtp({...newSmtp, app_password: e.target.value})}
                  placeholder="xxxx xxxx xxxx xxxx"
                  style={{ width: '100%', padding: '12px', background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: 'white' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>Daily Limit</label>
                <input 
                  type="number" 
                  value={newSmtp.daily_limit}
                  onChange={(e) => setNewSmtp({...newSmtp, daily_limit: parseInt(e.target.value)})}
                  style={{ width: '100%', padding: '12px', background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: 'white' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
              <button className="btn-primary" onClick={handleAddSmtp} style={{ flex: 1 }}>Add Account</button>
              <button 
                onClick={() => setShowSmtpModal(false)}
                style={{ flex: 1, padding: '12px', background: 'var(--bg-glass-heavy)', border: '1px solid var(--border-glass)', borderRadius: '12px', color: 'white' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HTML Preview Modal */}
      {previewHtml !== null && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
          zIndex: 4000, display: 'grid', placeItems: 'center'
        }}>
          <div className="glass-card" style={{ width: '800px', height: '80vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid var(--border-glass)', background: 'var(--bg-glass-heavy)' }}>
              <h2 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}><Eye size={18} /> HTML Preview</h2>
              <button onClick={() => setPreviewHtml(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '20px' }}>✕</button>
            </div>
            <div style={{ flex: 1, backgroundColor: 'white', padding: '32px', overflowY: 'auto' }}>
              <div dangerouslySetInnerHTML={{ __html: previewHtml || '<p style="color:#888;">No content to preview.</p>' }} />
            </div>
          </div>
        </div>
      )}

      {/* Paste Modal */}
      {showPasteModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)',
          zIndex: 2000, display: 'grid', placeItems: 'center'
        }}>
          <div className="glass-card" style={{ width: '600px', padding: '32px' }}>
            <h2 style={{ marginBottom: '16px' }}>Paste Lead List</h2>
            <p style={{ color: 'var(--text-dim)', fontSize: '14px', marginBottom: '20px' }}>
              Paste any text containing emails. We will extract <strong>example@gmail.com</strong> from lists, messy notes, or Google Forms.
            </p>
            <textarea 
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Example: abdul@krutanic.org, tarun@gmail.com..."
              style={{
                width: '100%', height: '250px', background: 'var(--bg-glass)',
                border: '1px solid var(--border-glass)', borderRadius: '12px',
                color: 'white', padding: '16px', outline: 'none', resize: 'none',
                fontFamily: 'monospace'
              }}
            />
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button 
                className="btn-primary" 
                onClick={handlePasteImport}
                disabled={isUploading}
                style={{ flex: 1 }}
              >
                {isUploading ? <Loader2 size={18} className="spin" /> : 'Import Emails'}
              </button>
              <button 
                onClick={() => setShowPasteModal(false)}
                style={{ flex: 1, padding: '12px', background: 'var(--bg-glass-heavy)', border: '1px solid var(--border-glass)', borderRadius: '12px', color: 'white' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template Import Modal */}
      {showTemplateImportModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)',
          zIndex: 2000, display: 'grid', placeItems: 'center'
        }}>
          <div className="glass-card" style={{ width: '800px', padding: '32px' }}>
            <h2 style={{ marginBottom: '16px' }}>Bulk Import Template</h2>
            <p style={{ color: 'var(--text-dim)', fontSize: '14px', marginBottom: '20px' }}>
              Paste your template arrays below (format: <code>const SUBJECTS = [...];</code>).
            </p>
            <textarea 
              value={templateImportText}
              onChange={(e) => setTemplateImportText(e.target.value)}
              placeholder="const SUBJECTS = [ ... ];"
              style={{
                width: '100%', height: '400px', background: 'var(--bg-glass)',
                border: '1px solid var(--border-glass)', borderRadius: '12px',
                color: 'white', padding: '16px', outline: 'none', resize: 'none',
                fontFamily: 'monospace', fontSize: '12px'
              }}
            />
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button 
                className="btn-primary" 
                onClick={handleTemplateBulkImport}
                style={{ flex: 1 }}
              >
                Parse & Load
              </button>
              <button 
                onClick={() => setShowTemplateImportModal(false)}
                style={{ flex: 1, padding: '12px', background: 'var(--bg-glass-heavy)', border: '1px solid var(--border-glass)', borderRadius: '12px', color: 'white' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        style={{ display: 'none' }} 
        accept=".csv"
      />

      {/* Navigation */}
      <nav className="glass" style={{ borderBottom: '1px solid var(--border-glass)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', background: 'var(--primary)', borderRadius: '10px', display: 'grid', placeItems: 'center' }}>
            <Mail size={24} color="white" />
          </div>
          <img src={logo} alt="Krutanic Mail" style={{ height: '40px', objectFit: 'contain' }} />
        </div>
        
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          {['overview', 'leads', 'template', 'smtp', 'logs', 'spam-test'].map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{ 
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: activeTab === tab ? 'var(--primary)' : 'var(--text-muted)',
                fontSize: '14px',
                fontWeight: activeTab === tab ? '600' : '500',
                textTransform: 'capitalize',
                transition: 'all 0.2s',
                outline: 'none',
              }}
            >
              {tab.replace('-', ' ')}
            </button>
          ))}
          
          <div style={{ width: '1px', height: '24px', background: 'var(--border-glass)', margin: '0 8px' }} />
          
          {/* User Profile & Logout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
             <div style={{ textAlign: 'right', display: 'none', md: 'block' }}>
               <div style={{ fontSize: '14px', fontWeight: '600', color: 'white' }}>{user?.name || 'User'}</div>
               <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{user?.email}</div>
             </div>
             <button 
               onClick={onLogout}
               className="btn-secondary"
               style={{ padding: '8px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}
               title="Logout"
             >
               <LogOut size={18} />
             </button>
          </div>
          
          <div style={{ width: '1px', height: '24px', background: 'var(--border-glass)', margin: '0 8px' }} />
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', position: 'relative' }}>
            {/* Custom Campaign Selector with delete buttons */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowCampaignDropdown(v => !v)}
                style={{
                  background: 'var(--bg-glass-heavy)', border: '1px solid var(--border-glass)',
                  color: 'white', padding: '8px 32px 8px 12px', borderRadius: '8px',
                  minWidth: '160px', textAlign: 'left', cursor: 'pointer', position: 'relative', outline: 'none'
                }}
              >
                {selectedCampaign === 'all' ? 'All Campaigns' : selectedCampaign}
                <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>▾</span>
              </button>

              {showCampaignDropdown && (
                <div
                  style={{
                    position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 500,
                    background: '#1a1a2e', border: '1px solid var(--border-glass)',
                    borderRadius: '10px', overflow: 'hidden', minWidth: '220px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
                  }}
                >
                  {/* All Campaigns option */}
                  <div
                    onClick={() => { setSelectedCampaign('all'); setShowCampaignDropdown(false); }}
                    style={{
                      padding: '10px 14px', cursor: 'pointer', fontSize: '14px',
                      background: selectedCampaign === 'all' ? 'rgba(59,130,246,0.15)' : 'transparent',
                      color: selectedCampaign === 'all' ? 'var(--primary)' : 'var(--text-muted)',
                      borderBottom: '1px solid var(--border-glass)'
                    }}
                  >
                    All Campaigns
                  </div>
                  {campaigns.map(c => (
                    <div
                      key={c._id}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 14px', cursor: 'pointer',
                        background: selectedCampaign === c.name ? 'rgba(59,130,246,0.15)' : 'transparent',
                        borderBottom: '1px solid rgba(255,255,255,0.04)'
                      }}
                    >
                      <span
                        onClick={() => { setSelectedCampaign(c.name); setShowCampaignDropdown(false); }}
                        style={{ flex: 1, fontSize: '14px', color: selectedCampaign === c.name ? 'var(--primary)' : 'white' }}
                      >
                        {c.name}
                      </span>
                      <button
                        onClick={(e) => { handleDeleteCampaign(c.name, e); setShowCampaignDropdown(false); }}
                        title={`Delete "${c.name}"`}
                        style={{
                          background: 'transparent', border: 'none', color: '#ff4d4d',
                          cursor: 'pointer', padding: '2px 4px', opacity: 0.6,
                          display: 'flex', alignItems: 'center'
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Click outside to close */}
              {showCampaignDropdown && (
                <div
                  onClick={() => setShowCampaignDropdown(false)}
                  style={{ position: 'fixed', inset: 0, zIndex: 499 }}
                />
              )}
            </div>

            <button
              onClick={() => setShowCampaignModal(true)}
              style={{ padding: '8px', background: 'var(--bg-glass-heavy)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: 'white' }}
              title="New Campaign"
            >
              <Plus size={18} />
            </button>
          </div>

        </div>

        {/* Campaign Run / Launch button */}
        {campaignStatus?.isRunning ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Timer */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16,185,129,0.3)',
              padding: '8px 14px', borderRadius: '10px'
            }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)', animation: 'pulse 1.5s infinite' }} />
              <span style={{ fontFamily: 'monospace', fontSize: '15px', color: 'var(--success)', fontWeight: '700', letterSpacing: '1px' }}>
                {formatElapsed(localElapsedMs)}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                {campaignStatus.sentCount} / {campaignStatus.totalLeads}
              </span>
            </div>
            {/* Stop button */}
            <button
              onClick={handleStop}
              disabled={isStopping}
              style={{
                padding: '10px 20px', background: 'rgba(239,68,68,0.15)',
                border: '1px solid rgba(239,68,68,0.4)', borderRadius: '10px',
                color: '#ff4d4d', fontWeight: '700', cursor: isStopping ? 'wait' : 'pointer',
                display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px'
              }}
            >
              {isStopping ? <Loader2 size={16} className="spin" /> : <XCircle size={16} />}
              {isStopping ? 'Stopping...' : 'Stop Campaign'}
            </button>
          </div>
        ) : (
          <button 
            className="btn-primary" 
            onClick={handleLaunch}
            disabled={isLaunching}
            style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px', opacity: isLaunching ? 0.7 : 1 }}
          >
            {isLaunching ? <Loader2 size={16} className="spin" /> : <Play size={16} />}
            {isLaunching ? 'Launching...' : 'Launch Campaign'}
          </button>
        )}

      </nav>

      {/* Main Content */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gap: '32px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
            <StatCard 
              icon={<Users size={20} color={stats.totalLeads > 0 ? "white" : "var(--primary)"} />} 
              title="Total Leads" 
              value={stats.totalLeads.toLocaleString()} 
              sub="Verified database" 
            />
            <StatCard 
              icon={<Send size={20} color={campaignStatus.isRunning ? "white" : "var(--primary)"} />} 
              title="Sent Today" 
              value={stats.sentToday.toLocaleString()} 
              sub={campaignStatus.isRunning ? "Active Campaign" : "Daily Volume"} 
              active={campaignStatus.isRunning}
            />
            <StatCard 
              icon={<Eye size={20} color="var(--success)" />} 
              title="Open Rate" 
              value={`${stats.openRate}%`} 
              sub="Direct Engagement" 
            />
            <StatCard 
              icon={<TrendingUp size={20} color="var(--secondary)" />} 
              title="Click Rate" 
              value={`${stats.clickRate}%`} 
              sub="Interaction Rate" 
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 1fr', gap: '24px' }}>
            {/* Chart Area */}
            <div className="glass-card" style={{ height: '400px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Delivery Trends</h3>
                <RefreshCw 
                  size={16} 
                  className={`text-muted ${isManualRefreshing ? 'spin' : ''}`} 
                  style={{ cursor: 'pointer', transition: 'all 0.3s' }} 
                  onClick={handleManualRefresh} 
                />
              </div>
              <ResponsiveContainer width="100%" height="85%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorVol" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" tick={{ fill: 'var(--text-dim)', fontSize: 11 }} tickLine={false} interval={3} />
                  <YAxis tick={{ fill: 'var(--text-dim)', fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ background: 'rgba(10,10,12,0.95)', border: '1px solid var(--border-glass)', borderRadius: '12px', backdropFilter: 'blur(10px)' }}
                    itemStyle={{ color: 'white' }}
                  />
                  <Area type="monotone" dataKey="volume" stroke="var(--primary)" fillOpacity={1} fill="url(#colorVol)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Live Activity Feed */}
            <div className="glass-card" style={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <TrendingUp size={18} color="var(--success)" />
                  <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Live Activity</h3>
                </div>
                {campaignStatus.isRunning && <span className="pulse" style={{ width: '8px', height: '8px', background: 'var(--success)', borderRadius: '50%' }} />}
              </div>
              <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gap: '12px', paddingRight: '4px', alignContent: 'start' }}>
                {logs.filter(l => l.status !== 'sent').slice(0, 15).map(log => (
                  <RecentActivityItem key={log._id} log={log} />
                ))}
                {logs.filter(l => l.status !== 'sent').length === 0 && (
                  <div style={{ flex: 1, display: 'grid', placeItems: 'center', textAlign: 'center', color: 'var(--text-dim)', fontSize: '13px', paddingTop: '40px' }}>
                    <div style={{ opacity: 0.5 }}>
                      <RefreshCw size={32} style={{ marginBottom: '12px' }} />
                      <p>Waiting for events...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* SMTP Status */}
            <div className="glass-card" style={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Relay Status</h3>
                <RefreshCw size={16} className="text-muted" style={{ cursor: 'pointer' }} onClick={fetchData} />
              </div>
              <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gap: '16px', paddingRight: '8px', alignContent: 'start' }}>
                {smtpAccounts.length > 0 ? smtpAccounts.map(acc => (
                  <SmtpItemCompact key={acc._id} user={acc.email} sends={acc.sent_today} limit={acc.daily_limit} status={acc.status} />
                )) : (
                  <div style={{ color: 'var(--text-dim)', fontSize: '13px', textAlign: 'center', paddingTop: '40px' }}>No SMTP accounts.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}


      {activeTab === 'leads' && (
        <div className="glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px' }}>
               <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{ position: 'relative', width: '300px' }}>
                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-dim)' }} />
                    <input 
                      type="text" 
                      placeholder="Search email..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ width: '100%', padding: '12px 12px 12px 40px', background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', borderRadius: '12px', color: 'white', outline: 'none' }}
                    />
                  </div>
                  
                  <select 
                    value={selectedCampaign}
                    onChange={(e) => setSelectedCampaign(e.target.value)}
                    style={{ 
                      padding: '12px', background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', 
                      borderRadius: '12px', color: 'white', outline: 'none', minWidth: '180px',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="all" style={{ background: '#1e1e1e' }}>All Campaigns</option>
                    {campaigns.map(c => (
                      <option key={c._id} value={c.name} style={{ background: '#1e1e1e' }}>{c.name}</option>
                    ))}
                  </select>
               </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                 <button 
                  onClick={() => setShowPasteModal(true)}
                  style={{ padding: '12px 24px', background: 'var(--bg-glass-heavy)', border: '1px solid var(--border-glass)', color: 'white', display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer', borderRadius: '8px' }}
                 >
                    <Send size={18} /> Paste Leads
                 </button>
                 <button 
                  onClick={handleUploadClick}
                  disabled={isUploading}
                  style={{ padding: '12px 24px', background: 'var(--primary)', border: 'none', color: 'white', display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer', borderRadius: '8px' }}
                 >
                    {isUploading ? <Loader2 size={18} className="spin" /> : <Upload size={18} />}
                    {isUploading ? 'Uploading...' : 'Upload CSV'}
                 </button>
              </div>
           </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
               <thead>
                 <tr style={{ textAlign: 'left', color: 'var(--text-dim)', fontSize: '14px', borderBottom: '1px solid var(--border-glass)' }}>
                    <th style={{ padding: '16px' }}>Email</th>
                    <th style={{ padding: '16px' }}>Campaign</th>
                    <th style={{ padding: '16px' }}>Status</th>
                    <th style={{ padding: '16px' }}>Added</th>
                    <th style={{ padding: '16px', textAlign: 'right' }}>Actions</th>
                 </tr>
               </thead>
               <tbody>
                  {leads.length > 0 ? leads.filter(l => l.email.includes(searchQuery)).map(lead => (
                    <LeadRow 
                      key={lead._id} 
                      lead={lead} 
                      onDelete={() => handleDeleteLead(lead._id)} 
                    />
                  )) : (
                    <tr>
                      <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)' }}>No leads found. Drop a CSV or paste a list!</td>
                    </tr>
                  )}
               </tbody>
            </table>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '24px 0', borderTop: '1px solid var(--border-glass)', marginTop: '16px' }}>
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="glass-card"
                  style={{ padding: '8px 16px', color: 'white', borderRadius: '8px', opacity: currentPage === 1 ? 0.3 : 1, cursor: currentPage === 1 ? 'default' : 'pointer' }}
                >
                  Previous
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-muted)', fontSize: '14px' }}>
                  Page {currentPage} of {totalPages} ({totalLeadsCount} total)
                </div>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="glass-card"
                  style={{ padding: '8px 16px', color: 'white', borderRadius: '8px', opacity: currentPage === totalPages ? 0.3 : 1, cursor: currentPage === totalPages ? 'default' : 'pointer' }}
                >
                  Next
                </button>
              </div>
            )}
        </div>
      )}

      {activeTab === 'template' && (
        <div style={{ display: 'grid', gap: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '24px' }}>Template Management</h2>
              <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Manage pooled components used for dynamic email generation.</p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => setShowTemplateImportModal(true)}
                style={{ padding: '12px 24px', background: 'var(--bg-glass-heavy)', border: '1px solid var(--border-glass)', color: 'white', display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer', borderRadius: '8px', fontWeight: 'bold' }}
              >
                <Upload size={18} /> Bulk Import
              </button>
              <button 
                className="btn-primary" 
                onClick={handleUpdateTemplate}
                disabled={isSavingTemplate}
                style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                {isSavingTemplate ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
                Save Template
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
            {[
              { key: 'subjects', label: 'Email Subjects', icon: <FileText size={18} color="var(--primary)" /> },
              { key: 'greetings', label: 'Greetings', icon: <Users size={18} color="var(--primary)" /> },
              { key: 'body_paragraphs', label: 'Body Paragraphs', icon: <Mail size={18} color="var(--primary)" /> },
              { key: 'closings', label: 'Closings', icon: <CheckCircle size={18} color="var(--primary)" /> },
              { key: 'signatures', label: 'Signatures', icon: <Server size={18} color="var(--primary)" /> },
            ].map(sect => {
              const isEnabled = template.enabled?.[sect.key] !== false;
              const items = template[sect.key] || [];
              return (
                <div
                  key={sect.key}
                  className="glass-card"
                  onClick={() => setEditSection(sect)}
                  style={{
                    cursor: 'pointer',
                    opacity: isEnabled ? 1 : 0.5,
                    border: isEnabled ? '1px solid var(--primary-low)' : '1px solid var(--border-glass)',
                    transition: 'all 0.2s',
                    position: 'relative'
                  }}
                >
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      {sect.icon}
                      <h3 style={{ fontSize: '16px' }}>{sect.label}</h3>
                      <span style={{ fontSize: '11px', color: 'var(--text-dim)', background: 'var(--bg-glass-heavy)', padding: '2px 8px', borderRadius: '10px' }}>
                        {items.length} items
                      </span>
                    </div>
                    {/* Enable toggle */}
                    <label
                      onClick={e => e.stopPropagation()}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', color: isEnabled ? 'var(--success)' : 'var(--text-dim)' }}
                    >
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={e => {
                          const newEnabled = { ...template.enabled, [sect.key]: e.target.checked };
                          setTemplate(t => ({ ...t, enabled: newEnabled }));
                        }}
                        style={{ accentColor: 'var(--success)', width: '15px', height: '15px' }}
                      />
                      {isEnabled ? 'Enabled' : 'Disabled'}
                    </label>
                  </div>

                  {/* Preview of items */}
                  <div style={{ display: 'grid', gap: '6px' }}>
                    {items.slice(0, 3).map((item, i) => (
                      <div key={i} style={{
                        fontSize: '12px', 
                        color: (item.enabled !== false) ? 'var(--text-dim)' : 'rgba(255,255,255,0.2)',
                        background: 'var(--bg-glass-heavy)', padding: '8px 10px',
                        borderRadius: '6px', overflow: 'hidden',
                        whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                        textDecoration: (item.enabled !== false) ? 'none' : 'line-through'
                      }}>
                        {typeof item === 'object' ? (item.content || <span style={{ fontStyle: 'italic', opacity: 0.5 }}>Empty Item</span>) : item}
                      </div>
                    ))}
                    {items.length > 3 && (
                      <div style={{ fontSize: '11px', color: 'var(--primary)', textAlign: 'center', paddingTop: '4px' }}>
                        +{items.length - 3} more — click to edit
                      </div>
                    )}
                    {items.length === 0 && (
                      <div style={{ fontSize: '12px', color: 'var(--text-dim)', textAlign: 'center', padding: '16px', border: '1px dashed var(--border-glass)', borderRadius: '8px' }}>
                        Click to add items
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Full-Screen Section Edit Modal */}
          {editSection && (
            <div style={{
              position: 'fixed', inset: 0, zIndex: 3000,
              background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
              display: 'flex', flexDirection: 'column'
            }}>
              {/* Modal Header */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '20px 32px', borderBottom: '1px solid var(--border-glass)',
                background: 'var(--bg-glass-heavy)'
              }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  {editSection.icon}
                  <h2 style={{ fontSize: '22px' }}>{editSection.label}</h2>
                  <span style={{ fontSize: '13px', color: 'var(--text-dim)' }}>
                    {(template[editSection.key] || []).length} items
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  {/* Enabled toggle in modal header */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px',
                    color: template.enabled?.[editSection.key] !== false ? 'var(--success)' : 'var(--text-dim)'
                  }}>
                    <input
                      type="checkbox"
                      checked={template.enabled?.[editSection.key] !== false}
                      onChange={e => {
                        const newEnabled = { ...template.enabled, [editSection.key]: e.target.checked };
                        setTemplate(t => ({ ...t, enabled: newEnabled }));
                      }}
                      style={{ accentColor: 'var(--success)', width: '16px', height: '16px' }}
                    />
                    {template.enabled?.[editSection.key] !== false ? 'Section Enabled' : 'Section Disabled'}
                  </label>
                  <button
                    onClick={() => addTemplateItem(editSection.key)}
                    style={{ padding: '8px 16px', background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
                  >
                    <Plus size={14} /> Add Item
                  </button>
                  <button
                    className="btn-primary"
                    onClick={async () => { await handleUpdateTemplate(); setEditSection(null); }}
                    disabled={isSavingTemplate}
                    style={{ padding: '8px 20px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    {isSavingTemplate ? <Loader2 size={14} className="spin" /> : <Send size={14} />}
                    Save & Close
                  </button>
                  <button
                    onClick={() => setEditSection(null)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '22px', lineHeight: '1' }}
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Scrollable item list */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '32px', display: 'grid', gap: '16px', alignContent: 'start' }}>
                {(template[editSection.key] || []).length === 0 && (
                  <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '60px', fontSize: '16px' }}>
                    No items yet. Click "Add Item" to get started.
                  </div>
                )}
                {(template[editSection.key] || []).map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', paddingTop: '10px' }}>
                      <span style={{ color: 'var(--text-dim)', fontSize: '13px', minWidth: '24px', textAlign: 'right' }}>
                        {idx + 1}.
                      </span>
                      <input 
                        type="checkbox"
                        checked={item.enabled !== false}
                        onChange={e => {
                          const updated = [...(template[editSection.key] || [])];
                          const oldItem = updated[idx];
                          if (typeof oldItem === 'object') {
                            updated[idx] = { ...oldItem, enabled: e.target.checked };
                          } else {
                            updated[idx] = { content: oldItem, enabled: e.target.checked };
                          }
                          setTemplate(t => ({ ...t, [editSection.key]: updated }));
                        }}
                        style={{ accentColor: 'var(--success)', width: '16px', height: '16px', cursor: 'pointer' }}
                        title={item.enabled !== false ? "Disable this item" : "Enable this item"}
                      />
                    </div>
                    <textarea
                      value={typeof item === 'object' ? (item.content || '') : item}
                      rows={editSection.key === 'body_paragraphs' ? 8 : 2}
                      onChange={e => {
                        const updated = [...(template[editSection.key] || [])];
                        const oldItem = updated[idx];
                        if (typeof oldItem === 'object') {
                          updated[idx] = { ...oldItem, content: e.target.value };
                        } else {
                          updated[idx] = { content: e.target.value, enabled: true };
                        }
                        setTemplate(t => ({ ...t, [editSection.key]: updated }));
                      }}
                      style={{
                        flex: 1, background: 'var(--bg-glass)', border: '1px solid var(--border-glass)',
                        borderRadius: '10px', color: (item.enabled !== false) ? 'white' : 'var(--text-dim)', 
                        padding: '12px', outline: 'none',
                        resize: 'vertical', fontFamily: 'inherit', fontSize: '14px', lineHeight: '1.6',
                        opacity: (item.enabled !== false) ? 1 : 0.6
                      }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '4px' }}>
                      <button
                        onClick={() => setPreviewHtml(typeof item === 'object' ? (item.content || '') : item)}
                        title="Preview HTML"
                        style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '8px', color: 'var(--primary)', cursor: 'pointer', padding: '8px', display: 'grid', placeItems: 'center' }}
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => removeTemplateItem(editSection.key, idx)}
                        title="Delete Item"
                        style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#ff4d4d', cursor: 'pointer', padding: '8px', display: 'grid', placeItems: 'center' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {activeTab === 'smtp' && (
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px' }}>
            <h2 style={{ fontSize: '24px' }}>SMTP Account Pool</h2>
            <button 
              className="btn-primary" 
              onClick={() => setShowSmtpModal(true)}
              style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Server size={18} /> Add Account
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
             {smtpAccounts.map(acc => (
               <SmtpCard 
                 key={acc._id} 
                 acc={acc} 
                 onToggle={() => handleSmtpToggle(acc._id, acc.enabled)}
                 onDelete={() => handleSmtpDelete(acc._id)}
                 onRefresh={fetchData}
               />
             ))}
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h2 style={{ fontSize: '24px' }}>Delivery Logs</h2>
              <div style={{ 
                display: 'flex', alignItems: 'center', gap: '6px', 
                background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)',
                padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '700'
              }}>
                {logs.length} TOTAL
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <button 
                onClick={handleClearLogs}
                style={{ background: 'transparent', border: 'none', color: '#ff4d4d', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                Clear History
              </button>
              <RefreshCw size={18} className="text-muted" style={{ cursor: 'pointer' }} onClick={fetchData} />
            </div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--text-dim)', fontSize: '14px', borderBottom: '1px solid var(--border-glass)' }}>
                <th style={{ padding: '16px' }}>Recipient</th>
                <th style={{ padding: '16px' }}>Status</th>
                <th style={{ padding: '16px' }}>SMTP Account</th>
                <th style={{ padding: '16px' }}>Time</th>
              </tr>
            </thead>
            <tbody>
              {logs.length > 0 ? logs.map(log => (
                <tr key={log._id} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                  <td style={{ padding: '16px', fontSize: '14px' }}>{log.email}</td>
                  <td style={{ padding: '16px' }}>
                    <span style={{ 
                      padding: '4px 10px', 
                      borderRadius: '20px', 
                      fontSize: '11px', 
                      background: 
                        log.status === 'clicked' ? 'rgba(59, 130, 246, 0.1)' :
                        log.status === 'opened' ? 'rgba(16, 185, 129, 0.1)' : 
                        'rgba(100, 116, 139, 0.1)',
                      color: 
                        log.status === 'clicked' ? 'var(--primary)' :
                        log.status === 'opened' ? 'var(--success)' : 
                        'var(--text-dim)',
                      border: `1px solid ${
                        log.status === 'clicked' ? 'var(--primary)' :
                        log.status === 'opened' ? 'var(--success)' : 
                        'var(--text-dim)'
                      }22`,
                      textTransform: 'uppercase'
                    }}>
                      {log.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px', fontSize: '13px', color: 'var(--text-dim)' }}>{log.smtp_account || '---'}</td>
                  <td style={{ padding: '16px', fontSize: '13px', color: 'var(--text-dim)' }}>{new Date(log.createdAt).toLocaleString()}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)' }}>No delivery logs available yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Campaign Create Modal */}
      {showCampaignModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)',
          zIndex: 2000, display: 'grid', placeItems: 'center'
        }}>
          <div className="glass-card" style={{ width: '400px', padding: '32px' }}>
            <h2 style={{ marginBottom: '24px' }}>New Campaign</h2>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>Campaign Name</label>
              <input 
                type="text" 
                value={newCampaignName}
                onChange={(e) => setNewCampaignName(e.target.value)}
                placeholder="e.g. Real Estate Investors"
                autoFocus
                style={{ width: '100%', padding: '12px', background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: 'white' }}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateCampaign()}
              />
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
              <button className="btn-primary" onClick={handleCreateCampaign} style={{ flex: 1 }}>Create & Select</button>
              <button 
                onClick={() => setShowCampaignModal(false)}
                style={{ flex: 1, padding: '12px', background: 'var(--bg-glass-heavy)', border: '1px solid var(--border-glass)', borderRadius: '12px', color: 'white' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {activeTab === 'spam-test' && (
        <SpamTestView 
          smtpAccounts={smtpAccounts} 
          API_BASE={API_BASE} 
        />
      )}
    </div>
  );
}

function SmtpCard({ acc, onToggle, onDelete, onRefresh }) {
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState(null);

  const percent = (acc.sent_today / acc.daily_limit) * 100;
  const statusColor = acc.status === 'error' ? 'var(--danger)' : acc.sent_today >= acc.daily_limit ? 'var(--warning)' : 'var(--success)';

  const handleCheckReset = async () => {
    setChecking(true);
    setCheckResult(null);
    try {
      const res = await axios.post(`${API_BASE}/api/smtp/${acc._id}/check-reset`);
      setCheckResult(res.data);
      if (res.data.reset) {
        onRefresh(); // Refresh parent to update the count shown
      }
    } catch (err) {
      setCheckResult({ error: err.response?.data?.error || err.message });
    } finally {
      setChecking(false);
    }
  };

  const formatLastUsed = (dateStr) => {
    if (!dateStr) return 'Never sent';
    const d = new Date(dateStr);
    return d.toLocaleString();
  };

  const formatHours = (h) => {
    if (h === null) return null;
    if (h < 1) return `${Math.round(h * 60)} min ago`;
    if (h < 24) return `${h.toFixed(1)} hrs ago`;
    return `${(h / 24).toFixed(1)} days ago`;
  };

  return (
    <div className="glass-card" style={{ border: acc.enabled ? '1px solid var(--primary-low)' : '1px solid var(--border-glass)', opacity: acc.enabled ? 1 : 0.7 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-glass-heavy)', display: 'grid', placeItems: 'center' }}>
            <Server size={14} color={statusColor} />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '600' }}>{acc.email}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>{acc.status}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <input 
            type="checkbox" 
            checked={acc.enabled} 
            onChange={onToggle} 
            style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--primary)' }} 
          />
          <button onClick={onDelete} style={{ background: 'transparent', border: 'none', color: '#ff4d4d', cursor: 'pointer' }}><XCircle size={18} /></button>
        </div>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px' }}>
        <span style={{ color: 'var(--text-dim)' }}>Daily Usage</span>
        <span>{acc.sent_today} / {acc.daily_limit}</span>
      </div>
      <div style={{ height: '6px', background: 'var(--bg-glass)', borderRadius: '3px', overflow: 'hidden', marginBottom: '16px' }}>
        <div style={{ width: `${Math.min(100, percent)}%`, height: '100%', background: statusColor, borderRadius: '3px' }} />
      </div>

      {/* Last sent info from check result */}
      {checkResult && !checkResult.error && (
        <div style={{
          padding: '10px 12px', borderRadius: '8px', marginBottom: '12px', fontSize: '12px',
          background: checkResult.reset ? 'rgba(16, 185, 129, 0.1)' : checkResult.eligible ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${checkResult.reset ? 'rgba(16,185,129,0.3)' : checkResult.eligible ? 'rgba(16,185,129,0.15)' : 'var(--border-glass)'}`,
          display: 'grid', gap: '4px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-dim)' }}>Last Sent:</span>
            <span style={{ color: 'white', fontWeight: '500' }}>{formatLastUsed(checkResult.lastUsed)}</span>
          </div>
          {checkResult.hoursSinceLast !== null && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-dim)' }}>Time Since:</span>
              <span style={{ color: checkResult.eligible ? 'var(--success)' : 'var(--warning)', fontWeight: '600' }}>
                {formatHours(checkResult.hoursSinceLast)}
              </span>
            </div>
          )}
          {/* Reset success */}
          {checkResult.reset && (
            <div style={{ marginTop: '4px', color: 'var(--success)', fontWeight: '700', textAlign: 'center', fontSize: '11px' }}>
              ✓ Count reset to 0 — ready for new cycle!
            </div>
          )}
          {/* Eligible but sent_today was already 0 */}
          {!checkResult.reset && checkResult.eligible && (
            <div style={{ marginTop: '4px', color: 'var(--success)', fontWeight: '600', textAlign: 'center', fontSize: '11px' }}>
              ✓ 24h passed — count was already at 0
            </div>
          )}
          {/* Not yet eligible — show remaining time */}
          {!checkResult.eligible && checkResult.hoursRemaining !== null && (
            <div style={{ marginTop: '4px', color: 'var(--warning)', fontWeight: '700', textAlign: 'center', fontSize: '12px' }}>
              ⏳ Reset in {checkResult.hoursRemaining.toFixed(1)} hrs
            </div>
          )}
          {/* Never sent */}
          {checkResult.lastUsed === null && (
            <div style={{ marginTop: '4px', color: 'var(--text-dim)', textAlign: 'center', fontSize: '11px' }}>
              No emails sent yet from this account
            </div>
          )}
        </div>
      )}

      {checkResult?.error && (
        <div style={{ padding: '8px', borderRadius: '8px', marginBottom: '12px', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', fontSize: '12px' }}>
          Error: {checkResult.error}
        </div>
      )}

      <button
        onClick={handleCheckReset}
        disabled={checking}
        style={{
          width: '100%', padding: '9px', borderRadius: '8px', fontSize: '12px', fontWeight: '600',
          background: 'var(--bg-glass-heavy)', border: '1px solid var(--border-glass)',
          color: 'var(--primary)', cursor: checking ? 'wait' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          transition: 'all 0.2s'
        }}
      >
        {checking ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />}
        {checking ? 'Checking...' : 'Check Mail & Reset'}
      </button>
    </div>
  );
}


function SmtpItemCompact({ user, sends, limit = 500, status }) {
  const percent = (sends / limit) * 100;
  const statusColor = status === 'error' ? 'var(--danger)' : sends >= limit ? 'var(--warning)' : 'var(--success)';
  return (
    <div style={{ display: 'grid', gap: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
        <span style={{ color: 'var(--text-muted)' }}>{user}</span>
        <span style={{ color: statusColor }}>{sends}/{limit}</span>
      </div>
      <div style={{ height: '6px', background: 'var(--bg-glass)', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(100, percent)}%`, height: '100%', background: statusColor, borderRadius: '3px' }} />
      </div>
    </div>
  );
}

function StatCard({ icon, title, value, sub, active = false }) {
  return (
    <div className={`glass-card stat-card-v2 ${active ? 'glow' : ''}`} style={{ border: active ? '1px solid var(--primary)' : '1px solid var(--border-glass)' }}>
      <div style={{ 
        width: '44px', height: '44px', 
        background: active ? 'var(--primary)' : 'var(--bg-glass-heavy)', 
        borderRadius: '12px', display: 'grid', placeItems: 'center', marginBottom: '16px',
        boxShadow: active ? '0 0 15px var(--primary-glow)' : 'none',
        transition: 'all 0.3s ease'
      }}>
        {icon}
      </div>
      <h4 style={{ color: 'var(--text-dim)', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>{title}</h4>
      <div style={{ 
        fontSize: '32px', fontWeight: '800', marginBottom: '4px', 
        background: 'linear-gradient(to right, #fff, #94a3b8)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
      }}>{value}</div>
      <div style={{ fontSize: '12px', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '4px' }}>
        {active && <span className="pulse" style={{ width: '6px', height: '6px', background: 'var(--success)', borderRadius: '50%' }} />}
        {sub}
      </div>
    </div>
  );
}

function RecentActivityItem({ log }) {
  const isClick = log.status === 'clicked';
  const isOpen = log.status === 'opened';
  const time = new Date(log.updatedAt || log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="activity-item" style={{ 
      padding: '12px', background: 'var(--bg-glass-heavy)', borderRadius: '12px', 
      border: '1px solid var(--border-glass)', display: 'flex', gap: '12px', alignItems: 'center'
    }}>
      <div style={{
        width: '36px', height: '36px', borderRadius: '10px', display: 'grid', placeItems: 'center',
        background: isClick ? 'rgba(168, 85, 247, 0.15)' : 'rgba(16, 185, 129, 0.15)',
        color: isClick ? 'var(--secondary)' : 'var(--success)'
      }}>
        {isClick ? <TrendingUp size={16} /> : <Eye size={16} />}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '13px', fontWeight: '600' }}>
          {isClick ? 'Link Clicked' : 'Email Opened'}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>
          {log.email}
        </div>
      </div>
      <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: '500' }}>{time}</div>
    </div>
  );
}

function SmtpItem({ user, sends, limit = 500, status }) {
  const percent = (sends / limit) * 100;
  const statusColor = status === 'limit' ? 'var(--danger)' : status === 'warning' ? 'var(--warning)' : 'var(--success)';
  
  return (
    <div style={{ display: 'grid', gap: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
        <span style={{ color: 'var(--text-muted)' }}>{user}</span>
        <span style={{ color: statusColor }}>{sends}/{limit}</span>
      </div>
      <div style={{ height: '6px', background: 'var(--bg-glass)', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ width: `${percent}%`, height: '100%', background: statusColor, borderRadius: '3px' }} />
      </div>
    </div>
  );
}

function LeadRow({ lead, onDelete }) {
  const [showMenu, setShowMenu] = useState(false);
  const date = lead.created_at ? new Date(lead.created_at).toLocaleDateString() : '---';

  return (
    <tr style={{ borderBottom: '1px solid var(--border-glass)' }}>
      <td style={{ padding: '16px', fontSize: '15px' }}>{lead.email}</td>
      <td style={{ padding: '16px', color: 'var(--primary)', fontSize: '14px', fontWeight: '500' }}>{lead.campaign || '---'}</td>
      <td style={{ padding: '16px' }}>
        <span style={{ 
          padding: '4px 10px', 
          borderRadius: '20px', 
          fontSize: '12px', 
          background: lead.status === 'active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          color: lead.status === 'active' ? 'var(--success)' : 'var(--danger)',
          border: `1px solid ${lead.status === 'active' ? 'var(--success)' : 'var(--danger)'}44`,
          textTransform: 'capitalize'
        }}>
          {lead.status}
        </span>
      </td>
      <td style={{ padding: '16px', color: 'var(--text-dim)', fontSize: '14px' }}>{date}</td>
      <td style={{ padding: '16px', textAlign: 'right', position: 'relative' }}>
        <button 
          onClick={() => setShowMenu(!showMenu)}
          style={{ background: 'transparent', color: 'var(--text-dim)', border: 'none', cursor: 'pointer' }}
        >
          <MoreVertical size={18} />
        </button>
        
        {showMenu && (
          <div 
            className="glass-card"
            style={{ 
              position: 'absolute', right: '40px', top: '10px', zIndex: 100,
              padding: '8px', minWidth: '120px', textAlign: 'left',
              display: 'grid', gap: '4px'
            }}
          >
            <button 
              onClick={() => { onDelete(); setShowMenu(false); }}
              style={{ 
                background: 'transparent', color: '#ff4d4d', padding: '8px 12px', 
                borderRadius: '6px', fontSize: '13px', display: 'flex', gap: '8px', alignItems: 'center',
                width: '100%', transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.background = 'rgba(255, 77, 77, 0.1)'}
              onMouseLeave={(e) => e.target.style.background = 'transparent'}
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}

/**
 * Spam / Deliverability Test View
 */
function SpamTestView({ smtpAccounts, API_BASE }) {
  const [selectedSmtps, setSelectedSmtps] = useState([]);
  const [testEmails, setTestEmails] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testLogs, setTestLogs] = useState([]);
  const logEndRef = useRef(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [testLogs]);

  const toggleAll = () => {
    if (selectedSmtps.length === smtpAccounts.length) setSelectedSmtps([]);
    else setSelectedSmtps(smtpAccounts.map(a => a._id));
  };

  const toggleSmtp = (id) => {
    if (selectedSmtps.includes(id)) setSelectedSmtps(selectedSmtps.filter(s => s !== id));
    else setSelectedSmtps([...selectedSmtps, id]);
  };

  const handleRunTest = async () => {
    const emails = testEmails.split(/[,\n]/).map(e => e.trim()).filter(e => e);
    if (selectedSmtps.length === 0) return alert('Select at least one SMTP account.');
    if (emails.length === 0) return alert('Enter at least one test email.');

    setIsTesting(true);
    setTestLogs([{ type: 'info', msg: `🚀 Starting Spam Test with ${selectedSmtps.length} SMTPs and ${emails.length} recipients...` }]);

    try {
      const res = await axios.post(`${API_BASE}/api/smtp/test-delivery`, {
        smtpIds: selectedSmtps,
        testEmails: emails
      });

      const newLogs = res.data.results.map(r => ({
        type: r.status === 'success' ? 'success' : 'error',
        msg: `${r.status === 'success' ? '✅' : '❌'} [${smtpAccounts.find(a => a._id === r.smtpId)?.email}] -> ${r.recipient}${r.error ? ': ' + r.error : ''}`
      }));

      setTestLogs(prev => [...prev, ...newLogs, { type: 'info', msg: '✨ Test Complete!' }]);
    } catch (err) {
      setTestLogs(prev => [...prev, { type: 'error', msg: `Critical Failure: ${err.response?.data?.error || err.message}` }]);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>1. Select SMTP Accounts</h2>
            <p style={{ color: 'var(--text-dim)', fontSize: '13px' }}>Choose accounts to test delivery from.</p>
          </div>
          <button 
            onClick={toggleAll}
            style={{ padding: '8px 16px', background: 'var(--bg-glass-heavy)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: 'white', fontSize: '12px', cursor: 'pointer' }}
          >
            {selectedSmtps.length === smtpAccounts.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        <div style={{ display: 'grid', gap: '8px', maxHeight: '500px', overflowY: 'auto', paddingRight: '10px' }}>
          {smtpAccounts.map(acc => (
            <div 
              key={acc._id}
              onClick={() => toggleSmtp(acc._id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '12px',
                background: selectedSmtps.includes(acc._id) ? 'rgba(59,130,246,0.1)' : 'var(--bg-glass-heavy)',
                border: selectedSmtps.includes(acc._id) ? '1px solid var(--primary)' : '1px solid var(--border-glass)',
                borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s',
                opacity: acc.enabled ? 1 : 0.5
              }}
            >
              <div style={{ 
                width: '18px', height: '18px', borderRadius: '4px', border: '1px solid var(--border-glass)',
                display: 'grid', placeItems: 'center', background: selectedSmtps.includes(acc._id) ? 'var(--primary)' : 'transparent'
              }}>
                {selectedSmtps.includes(acc._id) && <span style={{ color: 'white', fontSize: '12px' }}>✓</span>}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', color: 'white', fontWeight: '500' }}>{acc.email}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{acc.sent_today} / {acc.daily_limit} used</div>
              </div>
              <div style={{ 
                padding: '4px 8px', borderRadius: '4px', fontSize: '10px', textTransform: 'uppercase',
                background: acc.status === 'active' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                color: acc.status === 'active' ? 'var(--success)' : 'var(--danger)'
              }}>
                {acc.status}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div className="glass-card">
          <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>2. Test Recipients</h2>
          <p style={{ color: 'var(--text-dim)', fontSize: '13px', marginBottom: '16px' }}>Paste email addresses to send test mails to (one per line or comma separated).</p>
          <textarea 
            value={testEmails}
            onChange={(e) => setTestEmails(e.target.value)}
            placeholder="example1@gmail.com&#10;example2@outlook.com"
            style={{
              width: '100%', height: '150px', background: 'var(--bg-glass)', border: '1px solid var(--border-glass)',
              borderRadius: '12px', color: 'white', padding: '16px', outline: 'none', resize: 'none',
              fontSize: '14px', fontFamily: 'monospace', lineHeight: '1.5'
            }}
          />
          <button 
            className="btn-primary"
            onClick={handleRunTest}
            disabled={isTesting}
            style={{ width: '100%', marginTop: '16px', display: 'flex', justifyContent: 'center', gap: '10px', padding: '14px', fontSize: '16px' }}
          >
            {isTesting ? <Loader2 size={20} className="spin" /> : <Play size={20} />}
            {isTesting ? 'Sending Tests...' : 'Start Deliverability Test'}
          </button>
        </div>

        <div className="glass-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '350px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px' }}>Execution Progress</h2>
            {testLogs.length > 0 && <button onClick={() => setTestLogs([])} style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '12px' }}>Clear Logs</button>}
          </div>
          <div style={{ 
            flex: 1, background: '#0a0a14', borderRadius: '12px', padding: '20px',
            fontFamily: 'monospace', fontSize: '13px', overflowY: 'auto', border: '1px solid var(--border-glass)'
          }}>
            {testLogs.length === 0 && <div style={{ color: 'var(--text-dim)', textAlign: 'center', paddingTop: '40px' }}>Ready to test. Select SMTPs and recipients above.</div>}
            {testLogs.map((log, i) => (
              <div key={i} style={{ 
                marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.03)',
                color: log.type === 'error' ? '#ff4d4d' : log.type === 'success' ? '#10b981' : '#3b82f6'
              }}>
                {log.msg}
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
