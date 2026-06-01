'use client';
import { useState, useEffect } from 'react';
import { useUser } from '../context';
import { 
  Sparkles, Award, UserCheck, Calendar, Activity, 
  Plus, Send, Image as ImageIcon, ClipboardList, 
  MessageSquare, UserPlus, CheckCircle2, ChevronRight, X, Paperclip, Download,
  Palette, Mic, Video, FileText, Users, MapPin, Megaphone,
  BookOpen, HelpCircle, Link2, QrCode, Receipt, Clock, DollarSign,
  Trophy, Medal, TrendingUp
} from 'lucide-react';

// ── 5 Core Role Definitions ──
const ROLES = {
  content: {
    label: 'Content Creator',
    icon: Palette,
    color: '#8b5cf6',
    gradient: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
    desc: 'Social media posts, blogs, videos & stories',
    statKey: 'contentCreated',
    statLabel: 'Posts Created',
    types: [
      { value: 'content_post', label: 'Social Media Post', icon: Megaphone },
      { value: 'blog_article', label: 'Blog / Article', icon: FileText },
      { value: 'video_created', label: 'Video / Reel', icon: Video },
      { value: 'advertised_event', label: 'Event Promotion', icon: Mic },
    ],
  },
  events: {
    label: 'Event Host',
    icon: Calendar,
    color: '#f59e0b',
    gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
    desc: 'Campus tours, workshops, booths & panels',
    statKey: 'eventsHosted',
    statLabel: 'Events Hosted',
    types: [
      { value: 'event_hosted', label: 'Event Hosted', icon: Calendar },
      { value: 'campus_tour', label: 'Campus Tour', icon: MapPin },
      { value: 'workshop', label: 'Workshop / Seminar', icon: BookOpen },
      { value: 'booth_managed', label: 'Booth Managed', icon: Users },
    ],
  },
  mentor: {
    label: 'Peer Mentor',
    icon: MessageSquare,
    color: '#06b6d4',
    gradient: 'linear-gradient(135deg, #06b6d4, #0891b2)',
    desc: 'Student chats, Q&A sessions & inquiry responses',
    statKey: 'studentsMentored',
    statLabel: 'Students Mentored',
    types: [
      { value: 'student_mentored', label: 'Student Mentored', icon: UserPlus },
      { value: 'qa_session', label: 'Q&A Session', icon: HelpCircle },
      { value: 'inquiry_response', label: 'Inquiry Response', icon: MessageSquare },
    ],
  },
  leads: {
    label: 'Lead Generator',
    icon: UserCheck,
    color: '#10b981',
    gradient: 'linear-gradient(135deg, #10b981, #059669)',
    desc: 'Sign-ups, referral codes & app installs',
    statKey: 'leadsGenerated',
    statLabel: 'Leads Generated',
    types: [
      { value: 'lead_signup', label: 'Sign-up Collected', icon: UserPlus },
      { value: 'referral_distributed', label: 'Referral Code Shared', icon: Link2 },
      { value: 'app_install', label: 'App Install', icon: QrCode },
      { value: 'people_added', label: 'People Added', icon: Users },
    ],
  },
  admin: {
    label: 'Admin & Compensation',
    icon: Receipt,
    color: '#ec4899',
    gradient: 'linear-gradient(135deg, #ec4899, #db2777)',
    desc: 'Timesheets, invoices, and reimbursement claims',
    statKey: 'adminClaims',
    statLabel: 'Claims Submitted',
    types: [
      { value: 'timesheet', label: 'Timesheet', icon: Clock },
      { value: 'reimbursement', label: 'Reimbursement', icon: Receipt },
      { value: 'stipend', label: 'Stipend', icon: DollarSign },
    ],
  },
};

const ROLE_KEYS = Object.keys(ROLES);

function getRoleForType(type) {
  for (const [key, role] of Object.entries(ROLES)) {
    if (role.types.some(t => t.value === type)) return key;
  }
  return null;
}

function getTypeLabel(type) {
  for (const role of Object.values(ROLES)) {
    const found = role.types.find(t => t.value === type);
    if (found) return found.label;
  }
  return type.replace(/_/g, ' ');
}

export default function AmbassadorDashboard() {
  const ctx = useUser();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeRole, setActiveRole] = useState('content');
  const [hubTab, setHubTab] = useState('workspace'); // workspace | leaderboard
  
  // Gamification Data
  const [leaderboard, setLeaderboard] = useState([]);
  const [searchRep, setSearchRep] = useState('');

  // Activity Logger State
  const [showLogModal, setShowLogModal] = useState(false);
  const [logType, setLogType] = useState('content_post');
  const [logDescription, setLogDescription] = useState('');
  const [logCount, setLogCount] = useState(1);
  const [logEventName, setLogEventName] = useState('');
  const [logProof, setLogProof] = useState(null);
  const [logSubmitting, setLogSubmitting] = useState(false);
  const [logSuccess, setLogSuccess] = useState(false);
  const [logError, setLogError] = useState('');

  // Admin form specific states
  const [logTitle, setLogTitle] = useState('');
  const [adminClaimType, setAdminClaimType] = useState('timesheet');
  const [adminAmount, setAdminAmount] = useState(0);
  const [adminHours, setAdminHours] = useState(0);
  const [adminNotes, setAdminNotes] = useState('');

  // Task Thread State
  const [selectedTask, setSelectedTask] = useState(null);
  const [threadComment, setThreadComment] = useState('');
  const [threadIsActivity, setThreadIsActivity] = useState(false);
  const [threadActivityType, setThreadActivityType] = useState('content_post');
  const [threadActivityCount, setThreadActivityCount] = useState(0);
  const [threadActivityName, setThreadActivityName] = useState('');
  const [threadProof, setThreadProof] = useState(null);
  const [threadSubmitting, setThreadSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/ambassadors');
      if (res.ok) {
        const json = await res.json();
        setData(json);
        if (selectedTask) {
          const freshTask = json.tasks?.find(t => t.id === selectedTask.id);
          if (freshTask) setSelectedTask(freshTask);
        }
      }

      // Fetch Gamification Leaderboard
      const lbRes = await fetch('/api/ambassadors/leaderboard');
      if (lbRes.ok) {
        const lbJson = await lbRes.json();
        setLeaderboard(lbJson.leaderboard || []);
      }
    } catch (err) {
      console.error('Failed to load Ambassador Hub datasets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleFileChange = (e, targetSetter) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => targetSetter(event.target.result);
    reader.readAsDataURL(file);
  };

  const handleLogSubmit = async (e) => {
    e.preventDefault();
    setLogSubmitting(true);
    setLogError('');
    setLogSuccess(false);
    
    if (activeRole === 'admin') {
      try {
        const res = await fetch('/api/ambassadors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'submit_proof',
            category: 'admin',
            title: logTitle || `Admin Claim: ${adminClaimType}`,
            description: logDescription || adminNotes,
            proof: logProof,
            claimType: adminClaimType,
            amount: adminAmount,
            hoursWorked: adminHours,
            notes: adminNotes,
          }),
        });
        const resJson = await res.json();
        if (res.ok) {
          setLogSuccess(true);
          setLogTitle('');
          setLogDescription('');
          setLogProof(null);
          setAdminClaimType('timesheet');
          setAdminAmount(0);
          setAdminHours(0);
          setAdminNotes('');
          fetchData();
          setTimeout(() => { setShowLogModal(false); setLogSuccess(false); }, 1200);
        } else {
          setLogError(resJson.error || 'Failed to submit claim');
        }
      } catch {
        setLogError('Network error. Please try again.');
      } finally {
        setLogSubmitting(false);
      }
      return;
    }

    try {
      const res = await fetch('/api/ambassadors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'log_activity',
          type: logType,
          description: logDescription,
          count: logCount,
          eventName: logEventName,
          proof: logProof,
        }),
      });
      const resJson = await res.json();
      if (res.ok) {
        setLogSuccess(true);
        setLogDescription('');
        setLogCount(1);
        setLogEventName('');
        setLogProof(null);
        fetchData();
        setTimeout(() => { setShowLogModal(false); setLogSuccess(false); }, 1200);
      } else {
        setLogError(resJson.error || 'Failed to log activity');
      }
    } catch {
      setLogError('Network error. Please try again.');
    } finally {
      setLogSubmitting(false);
    }
  };

  const handlePostThreadComment = async (e) => {
    e.preventDefault();
    if (!threadComment.trim() && !threadIsActivity) return;
    setThreadSubmitting(true);
    try {
      const res = await fetch('/api/ambassadors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'thread_post',
          taskId: selectedTask.id,
          text: threadComment,
          isActivityLog: threadIsActivity,
          activityType: threadActivityType,
          activityDescription: threadComment,
          activityCount: threadActivityCount,
          eventName: threadActivityName,
          proof: threadProof,
        }),
      });
      if (res.ok) {
        setThreadComment('');
        setThreadIsActivity(false);
        setThreadActivityCount(0);
        setThreadActivityName('');
        setThreadProof(null);
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setThreadSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 80, fontSize: '0.9rem' }}>
        <div style={{ width: 36, height: 36, border: '3px solid var(--surface-border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        Loading Ambassador Hub...
      </div>
    );
  }

  const activities = data?.activities || [];
  const workspaceProofs = data?.workspaceProofs || [];
  const adminClaimsCount = workspaceProofs.filter(p => p.category === 'admin').length;
  const stats = {
    ...(data?.stats || {}),
    adminClaims: adminClaimsCount,
  };
  const tasks = data?.tasks || [];
  const role = ROLES[activeRole];
  const RoleIcon = role.icon;

  // Filter activities for the active role
  const roleActivities = activities.filter(a => role.types.some(t => t.value === a.type));

  // Find user's own ranking in leaderboard
  const myRanking = leaderboard.find(rep => rep.userId === ctx?.user?.id);

  // Filtered Leaderboard
  const filteredLeaderboard = leaderboard.filter(rep => 
    rep.name.toLowerCase().includes(searchRep.toLowerCase()) ||
    rep.collegeName.toLowerCase().includes(searchRep.toLowerCase())
  );

  return (
    <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ═══ Premium Welcome Banner ═══ */}
      <div style={{
        background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
        borderRadius: 24, padding: '36px 40px', color: '#fff',
        position: 'relative', overflow: 'hidden', boxShadow: 'var(--shadow-lg)',
        border: '1px solid rgba(255,255,255,0.08)'
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(circle at top right, rgba(99,102,241,0.3) 0%, transparent 60%)',
          zIndex: 0
        }} />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
          <div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(4px)', padding: '4px 12px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700, border: '1px solid rgba(255,255,255,0.15)', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#a5b4fc', marginBottom: 12 }}>
              <Sparkles size={12} /> Campus Ambassador Portal
            </span>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em' }}>Student Rep Workspace</h1>
            <p style={{ fontSize: '0.88rem', opacity: 0.85, marginTop: 6, maxWidth: 500 }}>
              Log campus activities, view rankings, track campaign deliverables, and submit claims.
            </p>
          </div>
          <button 
            onClick={() => { 
              if (activeRole === 'admin') {
                setAdminClaimType('timesheet');
                setLogTitle('');
                setLogDescription('');
                setAdminAmount(0);
                setAdminHours(0);
                setAdminNotes('');
              } else {
                setLogType(role.types[0].value);
              }
              setShowLogModal(true); 
            }} 
            className="btn btn-primary"
            style={{ 
              background: role.gradient,
              padding: '12px 24px', borderRadius: 14, fontWeight: 700, 
              boxShadow: `0 6px 20px ${role.color}60`, gap: 8 
            }}
          >
            <Plus size={18} /> {activeRole === 'admin' ? 'New Claim' : 'Log Activity'}
          </button>
        </div>
      </div>

      {/* ═══ Glassmorphic Tab Bar ═══ */}
      <div style={{
        display: 'flex', gap: 6, background: 'var(--bg-secondary)', padding: 4, borderRadius: 14,
        width: 'fit-content', border: '1px solid var(--surface-border)', marginBottom: 8
      }}>
        {[
          { key: 'workspace', label: 'My Workspace & Logs', icon: Activity },
          { key: 'leaderboard', label: 'Leaderboard & Badges', icon: Trophy },
        ].map(t => {
          const TabIcon = t.icon;
          const isSelected = hubTab === t.key;
          return (
            <button key={t.key} onClick={() => setHubTab(t.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
                fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.2s',
                background: isSelected ? 'var(--surface)' : 'transparent',
                color: isSelected ? 'var(--primary)' : 'var(--text-muted)',
                boxShadow: isSelected ? 'var(--shadow-sm)' : 'none',
              }}>
              <TabIcon size={15} color={isSelected ? 'var(--primary)' : 'var(--text-muted)'} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ═══ TAB 1: WORKSPACE & LOGS ═══ */}
      {hubTab === 'workspace' && (
        <>
          {/* ═══ 5 Role Stat Cards ═══ */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
            {ROLE_KEYS.map(key => {
              const r = ROLES[key];
              const Icon = r.icon;
              const isActive = activeRole === key;
              const value = stats[r.statKey] || 0;
              return (
                <button
                  key={key}
                  onClick={() => setActiveRole(key)}
                  style={{
                    background: isActive ? 'var(--surface)' : 'var(--bg-secondary)',
                    border: isActive ? `2px solid ${r.color}` : '2px solid transparent',
                    borderRadius: 16, padding: '18px 16px', cursor: 'pointer',
                    textAlign: 'left', transition: 'all 0.25s ease',
                    boxShadow: isActive ? `0 4px 20px ${r.color}20` : 'none',
                    position: 'relative', overflow: 'hidden',
                  }}
                >
                  {isActive && (
                    <div style={{
                      position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                      background: r.gradient,
                    }} />
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: isActive ? r.gradient : `${r.color}15`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon size={18} color={isActive ? '#fff' : r.color} />
                    </div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: isActive ? r.color : 'var(--text-muted)' }}>
                      {r.label}
                    </div>
                  </div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>{value}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>{r.statLabel}</div>
                </button>
              );
            })}
          </div>

          {/* ═══ Role-Specific Activity Types ═══ */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{
              background: role.gradient,
              padding: '20px 24px',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <RoleIcon size={22} color="#fff" />
              <div>
                <h3 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>{role.label}</h3>
                <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.78rem', margin: 0, marginTop: 2 }}>{role.desc}</p>
              </div>
              <button
                onClick={() => {
                  if (activeRole === 'admin') {
                    setAdminClaimType('timesheet');
                    setLogTitle('');
                    setLogDescription('');
                    setAdminAmount(0);
                    setAdminHours(0);
                    setAdminNotes('');
                  } else {
                    setLogType(role.types[0].value);
                  }
                  setShowLogModal(true);
                }}
                style={{
                  marginLeft: 'auto', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)',
                  color: '#fff', padding: '8px 16px', borderRadius: 10, cursor: 'pointer',
                  fontWeight: 600, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6,
                  backdropFilter: 'blur(8px)',
                }}
              >
                <Plus size={14} /> {activeRole === 'admin' ? 'New Claim' : `Log ${role.label.split(' ')[0]}`}
              </button>
            </div>

            {/* Quick-log type buttons */}
            <div style={{ padding: '16px 24px', display: 'flex', gap: 10, flexWrap: 'wrap', borderBottom: '1px solid var(--surface-border)' }}>
              {role.types.map(t => {
                const TIcon = t.icon;
                return (
                  <button
                    key={t.value}
                    onClick={() => {
                      if (activeRole === 'admin') {
                        setAdminClaimType(t.value);
                        setLogTitle('');
                        setLogDescription('');
                        setAdminAmount(0);
                        setAdminHours(0);
                        setAdminNotes('');
                      } else {
                        setLogType(t.value);
                      }
                      setShowLogModal(true);
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 14px', borderRadius: 10, border: `1.5px solid ${role.color}25`,
                      background: `${role.color}08`, cursor: 'pointer', color: 'var(--text)',
                      fontSize: '0.8rem', fontWeight: 500, transition: 'all 0.2s',
                    }}
                  >
                    <TIcon size={14} color={role.color} />
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* Activity Timeline */}
            <div style={{ padding: '16px 24px' }}>
              <h4 style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>
                {activeRole === 'admin' ? `Recent Claims (${adminClaimsCount})` : `Recent Activity (${roleActivities.length})`}
              </h4>
              {activeRole === 'admin' ? (
                (() => {
                  const adminProofs = workspaceProofs.filter(p => p.category === 'admin');
                  const getStatusBadge = (status) => {
                    if (status === 'approved') return { bg: '#10b98115', color: '#10b981', label: 'Approved' };
                    if (status === 'rejected') return { bg: '#ef444415', color: '#ef4444', label: 'Rejected' };
                    return { bg: '#f59e0b15', color: '#f59e0b', label: 'Pending' };
                  };
                  if (adminProofs.length === 0) {
                    return (
                      <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>
                        <RoleIcon size={32} style={{ opacity: 0.2, marginBottom: 8 }} />
                        <p style={{ fontSize: '0.85rem' }}>No admin claims submitted yet.</p>
                        <button
                          onClick={() => {
                            setAdminClaimType('timesheet');
                            setLogTitle('');
                            setLogDescription('');
                            setAdminAmount(0);
                            setAdminHours(0);
                            setAdminNotes('');
                            setShowLogModal(true);
                          }}
                          className="btn btn-primary"
                          style={{ background: role.gradient, fontSize: '0.8rem', padding: '8px 18px', borderRadius: 10, marginTop: 8 }}
                        >
                          <Plus size={14} /> Submit Your First Claim
                        </button>
                      </div>
                    );
                  }
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {adminProofs.map((p, idx) => {
                        const badge = getStatusBadge(p.status);
                        return (
                          <div key={p.id || idx} style={{
                            padding: '16px 20px', borderRadius: 16,
                            background: 'var(--bg-secondary)',
                            borderLeft: `4px solid ${role.color}`,
                            display: 'flex', flexDirection: 'column', gap: 10,
                            border: '1px solid var(--surface-border)',
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontSize: '1.1rem' }}>📋</span>
                                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>{p.title || 'Untitled Claim'}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{
                                  fontSize: '0.68rem', fontWeight: 700, padding: '3px 10px', borderRadius: 8,
                                  background: badge.bg, color: badge.color,
                                }}>
                                  {badge.label}
                                </span>
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                  {new Date(p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                </span>
                              </div>
                            </div>

                            {p.adminData && (
                              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                <span style={{ fontWeight: 600, color: role.color }}>📋 {p.adminData.claimType?.toUpperCase()}</span>
                                {p.adminData.amount > 0 && <span>💰 ₹{p.adminData.amount}</span>}
                                {p.adminData.hoursWorked > 0 && <span>⏱ {p.adminData.hoursWorked} hours</span>}
                              </div>
                            )}

                            {p.description && (
                              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>{p.description}</p>
                            )}

                            {p.proofs?.length > 0 && (
                              <div style={{ display: 'flex', gap: 6, fontSize: '0.72rem', color: role.color, alignItems: 'center' }}>
                                <Paperclip size={12} />
                                <span>{p.proofs.length} file(s) attached</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()
              ) : (
                roleActivities.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>
                    <RoleIcon size={32} style={{ opacity: 0.2, marginBottom: 8 }} />
                    <p style={{ fontSize: '0.85rem' }}>No {role.label.toLowerCase()} activities logged yet.</p>
                    <button
                      onClick={() => { setLogType(role.types[0].value); setShowLogModal(true); }}
                      className="btn btn-primary"
                      style={{ background: role.gradient, fontSize: '0.8rem', padding: '8px 18px', borderRadius: 10, marginTop: 8 }}
                    >
                      <Plus size={14} /> Log Your First Activity
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {roleActivities.slice(0, 10).map((act, idx) => (
                      <div key={act.id || idx} style={{
                        display: 'flex', alignItems: 'flex-start', gap: 12,
                        padding: '12px 14px', borderRadius: 12,
                        background: 'var(--bg-secondary)',
                        borderLeft: `3px solid ${role.color}`,
                      }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                          background: `${role.color}12`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Activity size={14} color={role.color} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{getTypeLabel(act.type)}</span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              {new Date(act.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                            </span>
                          </div>
                          {act.description && (
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, marginBottom: 4 }}>{act.description}</p>
                          )}
                          <div style={{ display: 'flex', gap: 12, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {act.metrics?.count > 0 && <span style={{ fontWeight: 600, color: role.color }}>Count: {act.metrics.count}</span>}
                            {act.metrics?.eventName && <span>📌 {act.metrics.eventName}</span>}
                            {act.proofs?.length > 0 && <span style={{ color: role.color }}>📎 Proof attached</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>

          {/* ═══ Assigned Tasks ═══ */}
          {tasks.length > 0 && (
            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <ClipboardList size={18} color="var(--primary)" />
                Assigned Tasks
                <span style={{ background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: 10, fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                  {tasks.length}
                </span>
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {tasks.map(task => (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    style={{
                      padding: '14px 16px', borderRadius: 12,
                      background: selectedTask?.id === task.id ? 'var(--bg-secondary)' : 'transparent',
                      border: '1px solid var(--surface-border)',
                      cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{task.title}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        {task.deadline ? `Due: ${new Date(task.deadline).toLocaleDateString()}` : 'No deadline'}
                        {' · '}
                        <span className={`badge ${task.status === 'Completed' ? 'badge-success' : task.status === 'In Progress' ? 'badge-warning' : 'badge-info'}`} style={{ fontSize: '0.6rem' }}>
                          {task.status}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={16} color="var(--text-muted)" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══ Task Thread Panel ═══ */}
          {selectedTask && (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{
                padding: '16px 24px', background: 'var(--bg-secondary)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                borderBottom: '1px solid var(--surface-border)',
              }}>
                <div>
                  <h4 style={{ fontWeight: 700, fontSize: '1rem', margin: 0 }}>{selectedTask.title}</h4>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, marginTop: 2 }}>
                    Task Thread · {(selectedTask.thread || []).length} posts
                  </p>
                </div>
                <button onClick={() => setSelectedTask(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
                  <X size={18} />
                </button>
              </div>

              {/* Thread Messages */}
              <div style={{ padding: '16px 24px', maxHeight: 400, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {selectedTask.description && (
                  <div style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: 4 }}>Task Brief</div>
                    <p style={{ fontSize: '0.85rem', margin: 0, lineHeight: 1.6 }}>{selectedTask.description}</p>
                  </div>
                )}
                {(selectedTask.thread || []).map((post, idx) => (
                  <div key={idx} style={{
                    padding: '12px 14px', borderRadius: 10,
                    background: post.isActivityLog ? `${ROLES[getRoleForType(post.activityType)]?.color || '#666'}08` : 'var(--bg-secondary)',
                    borderLeft: post.isActivityLog ? `3px solid ${ROLES[getRoleForType(post.activityType)]?.color || '#666'}` : '3px solid var(--surface-border)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: '0.8rem' }}>{post.authorName || 'You'}</span>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{new Date(post.createdAt).toLocaleString()}</span>
                    </div>
                    {post.isActivityLog && (
                      <span style={{
                        display: 'inline-block', fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                        background: `${ROLES[getRoleForType(post.activityType)]?.color || '#666'}15`,
                        color: ROLES[getRoleForType(post.activityType)]?.color || '#666',
                        marginBottom: 4,
                      }}>
                        📊 {getTypeLabel(post.activityType)} {post.activityCount > 0 ? `(×${post.activityCount})` : ''}
                      </span>
                    )}
                    <p style={{ fontSize: '0.82rem', margin: 0, lineHeight: 1.5 }}>{post.text}</p>
                    {post.proof && (
                      <div style={{ marginTop: 6 }}>
                        <a href={post.proof.startsWith('data:') ? post.proof : `data:application/octet-stream;base64,${post.proof}`} download style={{ fontSize: '0.72rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Paperclip size={12} /> Proof Attached <Download size={12} />
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Post Comment */}
              <form onSubmit={handlePostThreadComment} style={{ padding: '14px 24px', borderTop: '1px solid var(--surface-border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', cursor: 'pointer', color: threadIsActivity ? role.color : 'var(--text-muted)' }}>
                    <input type="checkbox" checked={threadIsActivity} onChange={e => setThreadIsActivity(e.target.checked)} />
                    Log as Activity
                  </label>
                  {threadIsActivity && (
                    <select value={threadActivityType} onChange={e => setThreadActivityType(e.target.value)} style={{ fontSize: '0.75rem', padding: '3px 8px', borderRadius: 6, border: '1px solid var(--surface-border)' }}>
                      {ROLE_KEYS.flatMap(k => ROLES[k].types).map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    value={threadComment}
                    onChange={e => setThreadComment(e.target.value)}
                    placeholder="Write a comment or log activity..."
                    style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1px solid var(--surface-border)', fontSize: '0.85rem' }}
                  />
                  <button type="submit" disabled={threadSubmitting} className="btn btn-primary" style={{ padding: '10px 16px', borderRadius: 10 }}>
                    <Send size={14} />
                  </button>
                </div>
              </form>
            </div>
          )}
        </>
      )}

      {/* ═══ TAB 2: GAMIFICATION LEADERBOARD & BADGES ═══ */}
      {hubTab === 'leaderboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* My Quick Stats Dashboard summary */}
          {myRanking && (
            <div className="card" style={{
              background: 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(244,114,182,0.06))',
              border: '1px solid rgba(99,102,241,0.15)', padding: 24, borderRadius: 18,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
                <div style={{
                  width: 64, height: 64, borderRadius: 18,
                  background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.6rem', color: '#fff', fontWeight: 800,
                  boxShadow: '0 6px 20px rgba(99,102,241,0.3)',
                }}>
                  #{myRanking.rank}
                </div>
                <div>
                  <h3 style={{ fontWeight: 800, fontSize: '1.2rem', margin: 0 }}>Your Performance Rank</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
                    Rep Points Score: <strong style={{ color: 'var(--primary)', fontSize: '1rem' }}>{myRanking.score.toLocaleString()}</strong>
                  </p>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Total Logs', value: myRanking.stats.totalActivities },
                    { label: 'Posts Created', value: myRanking.stats.contentCreated },
                    { label: 'Events Hosted', value: myRanking.stats.eventsHosted },
                    { label: 'Leads Generated', value: myRanking.stats.leadsGenerated },
                  ].map((s, i) => (
                    <div key={i} style={{ textAlign: 'center', padding: '4px 12px', background: 'var(--bg-secondary)', borderRadius: 12, border: '1px solid var(--surface-border)' }}>
                      <p style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)', margin: 0 }}>{s.value}</p>
                      <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 2 }}>{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Visual 3D-style Podium for Top 3 */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 16, margin: '24px 0 10px', flexWrap: 'wrap' }}>
            {/* 2nd Place */}
            {leaderboard[1] && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 170 }}>
                <div style={{
                  width: 50, height: 50, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #cbd5e1, #94a3b8)',
                  color: '#fff', fontSize: '1.2rem', fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 8, boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                }}>🥈</div>
                <div style={{ textAlign: 'center', marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>{leaderboard[1].name.split(' ')[0]}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>{leaderboard[1].collegeName}</div>
                </div>
                <div style={{
                  width: '100%', height: 110,
                  background: 'linear-gradient(180deg, rgba(148,163,184,0.2) 0%, rgba(148,163,184,0.05) 100%)',
                  border: '1.5px solid rgba(148,163,184,0.25)',
                  borderRadius: '16px 16px 12px 12px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                  <span style={{ fontWeight: 800, fontSize: '1.2rem', color: '#64748b' }}>{leaderboard[1].score}</span>
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>POINTS</span>
                  <div style={{ display: 'flex', gap: 3, marginTop: 4 }}>
                    {leaderboard[1].badges.filter(b => b.unlocked).map(b => (
                      <span key={b.id} title={b.label} style={{ fontSize: '0.9rem' }}>{b.emoji}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 1st Place (Tallest, Middle) */}
            {leaderboard[0] && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 190, zIndex: 5 }}>
                <div style={{
                  width: 60, height: 60, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                  color: '#fff', fontSize: '1.5rem', fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 8, boxShadow: '0 6px 15px rgba(245,158,11,0.3)',
                  border: '3px solid var(--surface)',
                }}>🥇</div>
                <div style={{ textAlign: 'center', marginBottom: 12 }}>
                  <div style={{ fontWeight: 800, fontSize: '1.0rem', color: 'var(--text)' }}>{leaderboard[0].name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{leaderboard[0].collegeName}</div>
                </div>
                <div style={{
                  width: '100%', height: 140,
                  background: 'linear-gradient(180deg, rgba(245,158,11,0.2) 0%, rgba(245,158,11,0.05) 100%)',
                  border: '2px solid rgba(245,158,11,0.4)',
                  borderRadius: '20px 20px 14px 14px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
                  boxShadow: '0 10px 30px rgba(245,158,11,0.08)',
                }}>
                  <span style={{ fontWeight: 900, fontSize: '1.4rem', color: '#d97706' }}>{leaderboard[0].score}</span>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.04em' }}>POINTS</span>
                  <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                    {leaderboard[0].badges.filter(b => b.unlocked).map(b => (
                      <span key={b.id} title={b.label} style={{ fontSize: '1.0rem' }}>{b.emoji}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 3rd Place */}
            {leaderboard[2] && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 170 }}>
                <div style={{
                  width: 50, height: 50, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #ffedd5, #ea580c)',
                  color: '#fff', fontSize: '1.2rem', fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 8, boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                }}>🥉</div>
                <div style={{ textAlign: 'center', marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>{leaderboard[2].name.split(' ')[0]}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>{leaderboard[2].collegeName}</div>
                </div>
                <div style={{
                  width: '100%', height: 95,
                  background: 'linear-gradient(180deg, rgba(234,88,12,0.15) 0%, rgba(234,88,12,0.04) 100%)',
                  border: '1.5px solid rgba(234,88,12,0.25)',
                  borderRadius: '16px 16px 12px 12px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                  <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#c2410c' }}>{leaderboard[2].score}</span>
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>POINTS</span>
                  <div style={{ display: 'flex', gap: 3, marginTop: 4 }}>
                    {leaderboard[2].badges.filter(b => b.unlocked).map(b => (
                      <span key={b.id} title={b.label} style={{ fontSize: '0.9rem' }}>{b.emoji}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Achievement Badges Shelf */}
          {myRanking && (
            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Award size={20} color="var(--primary)" />
                My Achievement Badges Shelf
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                {myRanking.badges.map(badge => {
                  const pct = Math.min(100, Math.round((badge.current / badge.target) * 100));
                  return (
                    <div key={badge.id} style={{
                      padding: 18, borderRadius: 14,
                      background: badge.unlocked ? 'var(--bg-secondary)' : 'transparent',
                      border: `1.5px solid ${badge.unlocked ? 'rgba(99,102,241,0.2)' : 'var(--surface-border)'}`,
                      opacity: badge.unlocked ? 1 : 0.65,
                      display: 'flex', flexDirection: 'column', gap: 10,
                      position: 'relative', overflow: 'hidden',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                      {badge.unlocked && (
                        <div style={{
                          position: 'absolute', top: 0, right: 0, width: 32, height: 32,
                          background: 'linear-gradient(135deg, #10b981, #059669)',
                          clipPath: 'polygon(100% 0, 0 0, 100% 100%)',
                        }}>
                          <span style={{ position: 'absolute', top: 3, right: 3, fontSize: '0.55rem', color: '#fff', fontWeight: 900 }}>✓</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 44, height: 44, borderRadius: 12,
                          background: badge.unlocked ? 'rgba(99,102,241,0.08)' : 'var(--bg-secondary)',
                          border: '1px solid var(--surface-border)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '1.6rem',
                          animation: badge.unlocked ? 'pulse 2s infinite' : 'none',
                        }}>
                          {badge.emoji}
                        </div>
                        <div>
                          <h4 style={{ fontWeight: 700, fontSize: '0.9rem', margin: 0 }}>{badge.label}</h4>
                          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{badge.desc}</p>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div style={{ marginTop: 'auto', paddingTop: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>
                          <span>{badge.unlocked ? 'Completed ✓' : 'Progress'}</span>
                          <span>{badge.current} / {badge.target}</span>
                        </div>
                        <div style={{ height: 6, borderRadius: 3, background: 'var(--surface-border)', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', width: `${pct}%`,
                            background: badge.unlocked ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #6366f1, #818cf8)',
                            borderRadius: 3,
                          }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Rep Rankings list */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Trophy size={18} color="var(--primary)" />
                Leaderboard Rankings
              </h3>
              <input
                value={searchRep}
                onChange={e => setSearchRep(e.target.value)}
                placeholder="Search rep or college..."
                style={{
                  padding: '8px 14px', borderRadius: 10, border: '1px solid var(--surface-border)',
                  fontSize: '0.82rem', background: 'var(--bg-secondary)', width: 220,
                }}
              />
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--surface-border)' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Rank</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Representative</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>College</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Earned Badges</th>
                    <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Score Points</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeaderboard.map((rep, idx) => {
                    const isMe = rep.userId === ctx?.user?.id;
                    return (
                      <tr key={rep.userId} style={{
                        borderBottom: '1px solid var(--surface-border)',
                        background: isMe ? 'rgba(99,102,241,0.05)' : 'transparent',
                        fontWeight: isMe ? 600 : 400,
                      }}>
                        <td style={{ padding: '14px 16px' }}>
                          {rep.rank <= 3 ? (
                            <span style={{ fontSize: '1.2rem' }}>
                              {rep.rank === 1 ? '🥇' : rep.rank === 2 ? '🥈' : '🥉'}
                            </span>
                          ) : (
                            <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>#{rep.rank}</span>
                          )}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 32, height: 32, borderRadius: 8,
                              background: isMe ? 'linear-gradient(135deg, #6366f1, #818cf8)' : `linear-gradient(135deg, hsl(${200 + idx * 30}, 65%, 60%), hsl(${220 + idx * 30}, 65%, 50%))`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: '#fff', fontSize: '0.8rem', fontWeight: 700,
                            }}>
                              {rep.name.charAt(0)}
                            </div>
                            <div>
                              <span>{rep.name}</span>
                              {isMe && <span style={{ fontSize: '0.7rem', background: 'rgba(99,102,241,0.12)', color: 'var(--primary)', padding: '2px 6px', borderRadius: 8, marginLeft: 6, fontWeight: 700 }}>You</span>}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>{rep.collegeName}</td>
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                            {rep.badges.filter(b => b.unlocked).map(b => (
                              <span key={b.id} title={b.label} style={{ fontSize: '1.1rem' }}>{b.emoji}</span>
                            ))}
                            {rep.badges.filter(b => b.unlocked).length === 0 && (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>No badges yet</span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }}>
                          {rep.score.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Activity Log Modal ═══ */}
      {showLogModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          onClick={() => setShowLogModal(false)}
        >
          <div className="card" style={{ width: 520, maxWidth: '95vw', padding: 0, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{ background: role.gradient, padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                {activeRole === 'admin' ? 'Submit Admin Claim' : 'Log Activity'}
              </h3>
              <button onClick={() => setShowLogModal(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: '#fff' }}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleLogSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {logSuccess && (
                <div style={{ background: '#10b98115', border: '1px solid #10b981', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8, color: '#10b981', fontWeight: 600, fontSize: '0.85rem' }}>
                  <CheckCircle2 size={18} /> {activeRole === 'admin' ? 'Claim submitted successfully!' : 'Activity logged successfully!'}
                </div>
              )}
              {logError && (
                <div style={{ background: '#ef444415', border: '1px solid #ef4444', borderRadius: 10, padding: '12px 16px', color: '#ef4444', fontSize: '0.85rem' }}>
                  {logError}
                </div>
              )}
              {activeRole === 'admin' ? (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Title / Summary *</label>
                    <input value={logTitle} onChange={e => setLogTitle(e.target.value)} placeholder="e.g. May stipend, travel allowance" required style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--surface-border)', fontSize: '0.88rem', background: 'var(--surface)', color: 'var(--text)', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Claim Type *</label>
                    <select value={adminClaimType} onChange={e => setAdminClaimType(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--surface-border)', fontSize: '0.88rem', background: 'var(--surface)', color: 'var(--text)' }}>
                      <option value="timesheet">Timesheet</option>
                      <option value="reimbursement">Reimbursement / Expense</option>
                      <option value="stipend">Stipend Claim</option>
                    </select>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Amount (₹)</label>
                      <input type="number" min={0} step="0.01" value={adminAmount} onChange={e => setAdminAmount(parseFloat(e.target.value) || 0)} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--surface-border)', fontSize: '0.88rem', background: 'var(--surface)', color: 'var(--text)', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Hours Worked</label>
                      <input type="number" min={0} step="0.5" value={adminHours} onChange={e => setAdminHours(parseFloat(e.target.value) || 0)} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--surface-border)', fontSize: '0.88rem', background: 'var(--surface)', color: 'var(--text)', boxSizing: 'border-box' }} />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Notes / Details</label>
                    <textarea
                      value={adminNotes}
                      onChange={e => setAdminNotes(e.target.value)}
                      placeholder="Describe the hours or expense in detail..."
                      rows={3}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--surface-border)', fontSize: '0.85rem', resize: 'none', background: 'var(--surface)', color: 'var(--text)', boxSizing: 'border-box' }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Activity Type</label>
                    <select value={logType} onChange={e => setLogType(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--surface-border)', fontSize: '0.88rem', background: 'var(--surface)', color: 'var(--text)' }}>
                      {ROLE_KEYS.map(k => (
                        <optgroup key={k} label={ROLES[k].label}>
                          {ROLES[k].types.map(t => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Description</label>
                    <textarea
                      value={logDescription}
                      onChange={e => setLogDescription(e.target.value)}
                      placeholder="What did you do? Share details..."
                      rows={3}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--surface-border)', fontSize: '0.85rem', resize: 'none', background: 'var(--surface)', color: 'var(--text)', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Count / Quantity</label>
                      <input type="number" min={0} value={logCount} onChange={e => setLogCount(parseInt(e.target.value) || 0)} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--surface-border)', fontSize: '0.88rem', background: 'var(--surface)', color: 'var(--text)', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Event / Campaign Name</label>
                      <input value={logEventName} onChange={e => setLogEventName(e.target.value)} placeholder="Optional" style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--surface-border)', fontSize: '0.88rem', background: 'var(--surface)', color: 'var(--text)', boxSizing: 'border-box' }} />
                    </div>
                  </div>
                </>
              )}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>
                  {activeRole === 'admin' ? 'Attach Proof (Screenshot / timesheet / receipt)' : 'Attach Proof (optional)'}
                </label>
                <label style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10,
                  border: `1.5px dashed ${logProof ? role.color : 'var(--surface-border)'}`,
                  background: logProof ? `${role.color}08` : 'transparent',
                  cursor: 'pointer', fontSize: '0.85rem', color: logProof ? role.color : 'var(--text-muted)',
                }}>
                  <ImageIcon size={16} />
                  {logProof ? 'Proof attached ✓' : 'Click to upload screenshot or file'}
                  <input type="file" accept="image/*,.pdf" hidden onChange={e => handleFileChange(e, setLogProof)} />
                </label>
              </div>
              <button type="submit" disabled={logSubmitting} className="btn btn-primary" style={{
                background: role.gradient, padding: '12px', borderRadius: 12, fontWeight: 700, fontSize: '0.9rem',
              }}>
                {logSubmitting ? 'Submitting...' : activeRole === 'admin' ? 'Submit Claim' : 'Log Activity'}
              </button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.04); opacity: 0.9; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
