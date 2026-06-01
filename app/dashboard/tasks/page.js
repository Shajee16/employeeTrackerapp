'use client';
import { useState, useEffect } from 'react';
import { useUser } from '../context';
import { 
  ListTodo, Clock, RotateCcw, CheckCircle2, AlertTriangle, Play, Check, 
  MessageSquare, Send, X, Calendar, Paperclip, Download, ChevronLeft, ChevronRight,
  TrendingUp, Award, Briefcase, Eye
} from 'lucide-react';

const priorityOrder = { Urgent: 0, High: 1, Medium: 2, Low: 3 };

export default function TasksPage() {
  const ctx = useUser();
  const user = ctx?.user;

  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('');
  const [prioFilter, setPrioFilter] = useState('');
  const [detail, setDetail] = useState(null);
  const [comment, setComment] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState(null); // { src, filename, contentType }

  // Campaigns & Calendar States for Campus Ambassador
  const [taskTab, setTaskTab] = useState('list'); // list | calendar
  const [campaigns, setCampaigns] = useState([]);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedCampaign, setSelectedCampaign] = useState(null);

  useEffect(() => { 
    fetchTasks();
    if (user?.role === 'Campus Ambassador') {
      fetchCampaigns();
    }
  }, [user]);

  const fetchTasks = () => fetch('/api/tasks').then(r => r.json()).then(d => setTasks(d.tasks || []));

  const fetchCampaigns = async () => {
    try {
      const res = await fetch('/api/ambassadors/campaigns');
      if (res.ok) {
        const d = await res.json();
        setCampaigns(d.campaigns || []);
      }
    } catch (err) {
      console.error('Failed to load campaigns inside tasks page:', err);
    }
  };

  const isOverdue = (t) => t.status !== 'Completed' && new Date(t.deadline) < new Date();
  const getDisplayStatus = (t) => isOverdue(t) ? 'Overdue' : t.status;

  const filtered = tasks
    .filter(t => (!filter || getDisplayStatus(t) === filter) && (!prioFilter || t.priority === prioFilter))
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  const updateStatus = async (id, status, proof = null) => {
    const payload = { id, status };
    if (proof) payload.completionProof = proof;
    await fetch('/api/tasks', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    fetchTasks();
    if (detail?.id === id) setDetail(d => ({ ...d, status, completionProof: proof || d.completionProof }));
    if (status === 'Completed') setProofFile(null);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => setProofFile(event.target.result);
    reader.readAsDataURL(file);
  };

  const downloadAdminAttachment = async (taskId, filename) => {
    try {
      const res = await fetch(`/api/tasks/attachment?taskId=${taskId}`);
      const data = await res.json();
      if (!res.ok) { alert(data.error || 'Attachment not found or expired'); return; }
      const link = document.createElement('a');
      link.href = `data:${data.contentType};base64,${data.base64Data}`;
      link.download = data.filename || filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch { alert('Failed to download attachment'); }
  };

  const loadCompletionProof = async (taskId) => {
    try {
      const res = await fetch(`/api/tasks/proof?taskId=${taskId}`);
      if (!res.ok) return;
      const data = await res.json();
      setProofPreview({
        src: `data:${data.contentType};base64,${data.base64Data}`,
        filename: data.filename,
        contentType: data.contentType,
      });
    } catch { }
  };

  const addComment = async () => {
    if (!comment.trim() || !detail) return;
    await fetch('/api/tasks', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: detail.id, newComment: comment }) });
    setComment('');
    fetchTasks();
    const res = await fetch('/api/tasks');
    const d = await res.json();
    setDetail(d.tasks.find(t => t.id === detail.id));
  };

  const statusCards = [
    { label: 'Pending', count: tasks.filter(t => t.status === 'Pending' && !isOverdue(t)).length, color: '#f59e0b', icon: Clock, bg: 'rgba(245,158,11,0.08)' },
    { label: 'In Progress', count: tasks.filter(t => t.status === 'In Progress').length, color: '#6366f1', icon: RotateCcw, bg: 'rgba(99,102,241,0.08)' },
    { label: 'Completed', count: tasks.filter(t => t.status === 'Completed').length, color: '#34d399', icon: CheckCircle2, bg: 'rgba(52,211,153,0.08)' },
    { label: 'Overdue', count: tasks.filter(t => isOverdue(t)).length, color: '#f87171', icon: AlertTriangle, bg: 'rgba(248,113,113,0.08)' },
  ];

  const priorityColors = { Urgent: '#f87171', High: '#f97316', Medium: '#f59e0b', Low: '#6366f1' };

  // Calendar parameters for Campaigns
  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const prevMonth = () => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
  const nextMonth = () => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));

  const daysInMonth = getDaysInMonth(calendarDate);
  const startDay = getFirstDayOfMonth(calendarDate);
  const blanks = Array(startDay).fill(null);
  const monthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const calendarCells = [...blanks, ...monthDays];
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const getCampaignsForDate = (dayNum) => {
    if (!dayNum) return [];
    const dateStr = `${calendarDate.getFullYear()}-${String(calendarDate.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    return campaigns.filter(camp => {
      const start = camp.startDate;
      const end = camp.endDate;
      return dateStr >= start && dateStr <= end;
    });
  };

  const getTasksForDate = (dayNum) => {
    if (!dayNum) return [];
    const dateStr = `${calendarDate.getFullYear()}-${String(calendarDate.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    return tasks.filter(t => {
      const start = t.startDate ? t.startDate.substring(0, 10) : (t.createdAt || '').substring(0, 10) || dateStr;
      const end = (t.deadline || '').substring(0, 10);
      return end && dateStr >= start && dateStr <= end;
    });
  };

  return (
    <div className="animate-fade">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(99,102,241,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ListTodo size={20} color="var(--primary)" />
          </div>
          <div>
            <h2 style={{ fontWeight: 700, fontSize: '1.3rem', letterSpacing: '-0.02em' }}>Assigned Tasks</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{tasks.length} total tasks</p>
          </div>
        </div>

        {/* Tab switcher for Campus Ambassador */}
        {user?.role === 'Campus Ambassador' && (
          <div style={{
            display: 'flex', gap: 4, background: 'var(--bg-secondary)', padding: 3, borderRadius: 10,
            border: '1px solid var(--surface-border)', width: 'fit-content'
          }}>
            {[
              { key: 'list', label: 'Deliverable Checklist', icon: ListTodo },
              { key: 'calendar', label: 'Campaigns Calendar', icon: Calendar },
            ].map(tab => {
              const TabIcon = tab.icon;
              const isSelected = taskTab === tab.key;
              return (
                <button key={tab.key} onClick={() => setTaskTab(tab.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    fontSize: '0.8rem', fontWeight: 600, transition: 'all 0.15s',
                    background: isSelected ? 'var(--surface)' : 'transparent',
                    color: isSelected ? 'var(--primary)' : 'var(--text-muted)',
                    boxShadow: isSelected ? 'var(--shadow-sm)' : 'none',
                  }}>
                  <TabIcon size={14} color={isSelected ? 'var(--primary)' : 'var(--text-muted)'} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── SUB-VIEW: STANDARD LIST Deliverable Checklist ── */}
      {(user?.role !== 'Campus Ambassador' || taskTab === 'list') && (
        <>
          {/* Status summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
            {statusCards.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className="card" style={{
                  textAlign: 'center', padding: 18, cursor: 'pointer',
                  borderColor: filter === s.label ? s.color : undefined,
                  borderWidth: filter === s.label ? 2 : 1,
                  transition: 'all 0.2s',
                }} onClick={() => setFilter(filter === s.label ? '' : s.label)}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
                    <Icon size={20} color={s.color} />
                  </div>
                  <p style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.count}</p>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</p>
                </div>
              );
            })}
          </div>

          {/* Priority filter */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={prioFilter} onChange={e => setPrioFilter(e.target.value)} style={{ padding: '8px 14px', border: '1.5px solid var(--surface-border)', borderRadius: 10, background: 'var(--surface)', color: 'var(--text)', fontSize: '0.85rem', width: 'auto', minWidth: 140 }}>
              <option value="">All Priority</option>
              {['Urgent', 'High', 'Medium', 'Low'].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            {filter && <button className="btn btn-ghost btn-sm" onClick={() => setFilter('')} style={{ display: 'flex', alignItems: 'center', gap: 4 }}><X size={14} /> Clear filter</button>}
          </div>

          {/* Task list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: 40 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <ListTodo size={22} color="var(--text-muted)" />
                </div>
                <p style={{ color: 'var(--text-muted)', fontWeight: 500 }}>No tasks found</p>
              </div>
            ) : filtered.map((t, idx) => (
              <div key={`${t.id}-${idx}`} className="card" style={{
                padding: 18, cursor: 'pointer',
                borderLeft: `4px solid ${priorityColors[t.priority] || '#6366f1'}`,
                transition: 'all 0.15s',
              }}
                onClick={() => { setDetail(t); setProofPreview(null); }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateX(4px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ fontWeight: 700, marginBottom: 4, fontSize: '0.95rem' }}>{t.title}</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description}</p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span className={`badge badge-${t.priority.toLowerCase()}`}>{t.priority}</span>
                      <span className={`badge badge-${isOverdue(t) ? 'danger' : t.status === 'Completed' ? 'success' : t.status === 'In Progress' ? 'info' : 'warning'}`}>{getDisplayStatus(t)}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        <Calendar size={12} /> {new Date(t.deadline).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                    {t.status === 'Pending' && (
                      <button className="btn btn-primary btn-sm" onClick={() => updateStatus(t.id, 'In Progress')} style={{ gap: 4 }}>
                        <Play size={13} /> Start
                      </button>
                    )}
                    {t.status === 'In Progress' && (
                      <button className="btn btn-success btn-sm" onClick={() => updateStatus(t.id, 'Completed')} style={{ gap: 4 }}>
                        <Check size={13} /> Done
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── SUB-VIEW: CAMPAIGNS CALENDAR (Campus Ambassadors only) ── */}
      {user?.role === 'Campus Ambassador' && taskTab === 'calendar' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, flexWrap: 'wrap' }}>
          {/* Main interactive Calendar grid */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Calendar size={18} color="var(--primary)" />
                Campaign Schedules
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button onClick={prevMonth} className="btn btn-ghost" style={{ padding: 6, minWidth: 'auto', display: 'flex' }}><ChevronLeft size={16} /></button>
                <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text)', width: 120, textAlign: 'center' }}>
                  {monthNames[calendarDate.getMonth()]} {calendarDate.getFullYear()}
                </span>
                <button onClick={nextMonth} className="btn btn-ghost" style={{ padding: 6, minWidth: 'auto', display: 'flex' }}><ChevronRight size={16} /></button>
              </div>
            </div>

            {/* Custom Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
              {/* Day Headers */}
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                <div key={day} style={{ textAlign: 'center', fontWeight: 700, fontSize: '0.72rem', color: 'var(--text-muted)', padding: '6px 0', textTransform: 'uppercase' }}>
                  {day}
                </div>
              ))}

              {/* Calendar Cells */}
              {calendarCells.map((dayNum, cellIdx) => {
                const dateCampaigns = getCampaignsForDate(dayNum);
                const dateTasks = getTasksForDate(dayNum);
                const hasItem = dateCampaigns.length > 0 || dateTasks.length > 0;
                
                return (
                  <div key={cellIdx} style={{
                    minHeight: 110, padding: 8, borderRadius: 10,
                    background: dayNum ? 'var(--bg-secondary)' : 'transparent',
                    border: dayNum ? '1px solid var(--surface-border)' : 'none',
                    display: 'flex', flexDirection: 'column', gap: 4,
                    position: 'relative',
                  }}>
                    {dayNum && (
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: hasItem ? 'var(--primary)' : 'var(--text-secondary)' }}>
                        {dayNum}
                      </span>
                    )}

                    {/* Render campaign ribbons */}
                    {dateCampaigns.slice(0, 2).map((camp) => (
                      <div
                        key={camp.id}
                        onClick={(e) => { e.stopPropagation(); setSelectedCampaign(camp); }}
                        style={{
                          fontSize: '0.62rem', fontWeight: 700, padding: '3px 6px',
                          background: camp.status === 'active' ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)' : 'linear-gradient(135deg, #06b6d4, #0891b2)',
                          color: '#fff', borderRadius: 4, cursor: 'pointer',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          boxShadow: 'var(--shadow-sm)',
                        }}
                        title={`Campaign: ${camp.title}`}
                      >
                        📢 {camp.title}
                      </div>
                    ))}

                    {/* Render task ribbons */}
                    {dateTasks.slice(0, 2).map((t) => {
                      const completed = t.status === 'Completed';
                      const overdue = isOverdue(t);
                      const ribbonBg = completed 
                        ? 'linear-gradient(135deg, #10b981, #059669)' // Green
                        : overdue 
                        ? 'linear-gradient(135deg, #ef4444, #dc2626)' // Red
                        : 'linear-gradient(135deg, #3b82f6, #2563eb)'; // Blue
                      return (
                        <div
                          key={t.id}
                          onClick={(e) => { e.stopPropagation(); setDetail(t); setProofPreview(null); }}
                          style={{
                            fontSize: '0.62rem', fontWeight: 700, padding: '3px 6px',
                            background: ribbonBg,
                            color: '#fff', borderRadius: 4, cursor: 'pointer',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            boxShadow: 'var(--shadow-sm)',
                          }}
                          title={`Task: ${t.title} (${t.status})`}
                        >
                          📋 {t.title}
                        </div>
                      );
                    })}

                    {(dateCampaigns.length + dateTasks.length) > 4 && (
                      <div style={{ fontSize: '0.58rem', fontWeight: 700, color: 'var(--text-muted)', paddingLeft: 4 }}>
                        + {dateCampaigns.length + dateTasks.length - 4} more
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Campaign cards list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: 12 }}>
                Active initiatives
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {campaigns.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    No campaigns scheduled.
                  </div>
                ) : (
                  campaigns.map(camp => {
                    const isActive = camp.status === 'active';
                    return (
                      <div key={camp.id} onClick={() => setSelectedCampaign(camp)} style={{
                        padding: 14, borderRadius: 12, border: '1px solid var(--surface-border)',
                        background: 'var(--bg-secondary)', cursor: 'pointer', transition: 'all 0.2s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary-light)'; e.currentTarget.style.transform = 'translateX(2px)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--surface-border)'; e.currentTarget.style.transform = 'none'; }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <span style={{
                            fontSize: '0.62rem', fontWeight: 700, padding: '2px 8px', borderRadius: 8,
                            background: isActive ? '#8b5cf615' : '#06b6d415',
                            color: isActive ? '#8b5cf6' : '#06b6d4',
                            textTransform: 'uppercase',
                          }}>
                            {camp.status}
                          </span>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                            {new Date(camp.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          </span>
                        </div>
                        <h4 style={{ fontWeight: 700, fontSize: '0.85rem', margin: 0 }}>{camp.title}</h4>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {camp.description}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Detail Modal (Assigned Tasks details modal) ── */}
      {detail && (
        <div className="modal-overlay" onClick={() => setDetail(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h3 className="modal-title">{detail.title}</h3>
              <button className="modal-close" onClick={() => setDetail(null)}>×</button>
            </div>
            <p style={{ marginBottom: 16, color: 'var(--text-secondary)' }}>{detail.description}</p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              <span className={`badge badge-${detail.priority.toLowerCase()}`}>{detail.priority}</span>
              <span className={`badge badge-${isOverdue(detail) ? 'danger' : detail.status === 'Completed' ? 'success' : 'info'}`}>{getDisplayStatus(detail)}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16, fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Calendar size={14} color="var(--text-muted)" />
                <span style={{ color: 'var(--text-muted)' }}>Assigned:</span> {new Date(detail.createdAt || detail.deadline).toLocaleDateString()}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={14} color="var(--text-muted)" />
                <span style={{ color: 'var(--text-muted)' }}>Deadline:</span> {new Date(detail.deadline).toLocaleDateString()}
              </div>
            </div>

            {/* Admin-attached file */}
            {detail.hasAttachment && (
              <div style={{ marginBottom: 20, padding: '12px 14px', background: 'rgba(99,102,241,0.06)', borderRadius: 10, border: '1px solid rgba(99,102,241,0.15)' }}>
                <p style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Paperclip size={14} color="#6366f1" /> Task Attachment from Admin
                </p>
                <button
                  onClick={() => downloadAdminAttachment(detail.id, detail.attachmentName)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)',
                    borderRadius: 8, padding: '8px 14px', cursor: 'pointer',
                    color: '#6366f1', fontSize: '0.82rem', fontWeight: 600, transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.18)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(99,102,241,0.1)'}
                >
                  <Download size={14} /> {detail.attachmentName || 'Download Attachment'}
                </button>
              </div>
            )}

            {detail.status === 'In Progress' && (
               <div style={{ marginBottom: 20, background: 'var(--bg-secondary)', padding: '12px 14px', borderRadius: 10 }}>
                 <p style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Paperclip size={14} /> Attach work (Optional)
                 </p>
                 <input type="file" accept=".pdf,image/*" onChange={handleFileChange} style={{ fontSize: '0.8rem', width: '100%' }} />
               </div>
            )}

            {/* Completion Proof from MongoDB */}
            {(detail.hasCompletionProof || detail.completionProof) && (
               <div style={{ marginBottom: 20, padding: '12px 14px', background: 'var(--bg-secondary)', borderRadius: 10 }}>
                 <p style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Paperclip size={14} /> Attached Work
                 </p>
                 {/* Old inline proof (backward compat) */}
                 {detail.completionProof && detail.completionProof.startsWith('data:image') ? (
                    <img src={detail.completionProof} alt="Proof" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8 }} />
                 ) : detail.completionProof && detail.completionProof.startsWith('data:') ? (
                    <a href={detail.completionProof} download="Attachment" style={{ fontSize: '0.85rem', color: 'var(--primary)', textDecoration: 'underline' }}>Download Attachment</a>
                 ) : (
                    /* New MongoDB-backed proof */
                    <>
                      {proofPreview ? (
                        proofPreview.contentType?.startsWith('image/') ? (
                          <img src={proofPreview.src} alt="Proof" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, marginBottom: 8 }} />
                        ) : (
                          <a href={proofPreview.src} download={proofPreview.filename} style={{ fontSize: '0.85rem', color: 'var(--primary)', textDecoration: 'underline' }}>
                            <Download size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                            {proofPreview.filename}
                          </a>
                        )
                      ) : (
                        <button
                          onClick={() => loadCompletionProof(detail.id)}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)',
                            borderRadius: 8, padding: '8px 14px', cursor: 'pointer',
                            color: '#10b981', fontSize: '0.82rem', fontWeight: 600,
                          }}
                        >
                          <Download size={14} /> View / Download Proof
                        </button>
                      )}
                    </>
                 )}
               </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20, background: 'var(--bg-secondary)', padding: 14, borderRadius: 12, border: '1px solid var(--surface-border)' }}>
              <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Task Status Tracker</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                {[
                  { key: 'Pending', label: 'Pending', activeBg: '#f59e0b', color: '#fff', border: '1px solid #f59e0b' },
                  { key: 'In Progress', label: 'In Progress', activeBg: '#6366f1', color: '#fff', border: '1px solid #6366f1' },
                  { key: 'Completed', label: 'Mark Done', activeBg: '#34d399', color: '#fff', border: '1px solid #34d399' }
                ].map(item => {
                  const isSelected = detail.status === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => updateStatus(detail.id, item.key, item.key === 'Completed' ? proofFile : null)}
                      className={`btn btn-sm`}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 8,
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        background: isSelected ? item.activeBg : 'transparent',
                        color: isSelected ? item.color : 'var(--text-muted)',
                        border: isSelected ? item.border : '1px solid var(--surface-border)',
                        boxShadow: isSelected ? 'var(--shadow-sm)' : 'none',
                      }}
                    >
                      {item.key === 'Completed' && isSelected && <Check size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />}
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Comments */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <MessageSquare size={16} color="var(--primary)" />
              <h4 style={{ fontWeight: 600, fontSize: '0.95rem' }}>Comments</h4>
            </div>
            {detail.comments?.map((c, ci) => (
              <div key={`${c.id}-${ci}`} style={{ padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 10, marginBottom: 8, fontSize: '0.85rem' }}>
                <p>{c.text}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>{new Date(c.timestamp).toLocaleString()}</p>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input value={comment} onChange={e => setComment(e.target.value)} placeholder="Add a comment..." style={{ flex: 1 }} onKeyDown={e => e.key === 'Enter' && addComment()} />
              <button className="btn btn-primary btn-sm" onClick={addComment}><Send size={14} /></button>
            </div>
          </div>
        </div>
      )}

      {/* ── CAMPAIGN DETAILS MODAL (Campus Ambassadors calendar details) ── */}
      {selectedCampaign && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          onClick={() => setSelectedCampaign(null)}
        >
          <div className="card" style={{ width: 560, maxWidth: '95vw', padding: 0, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{
              background: selectedCampaign.status === 'active' ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)' : 'linear-gradient(135deg, #06b6d4, #0891b2)',
              padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <h3 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                Campaign: {selectedCampaign.title}
              </h3>
              <button onClick={() => setSelectedCampaign(null)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: '#fff' }}>
                <X size={16} />
              </button>
            </div>
            
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <span style={{
                  fontSize: '0.68rem', fontWeight: 700, padding: '3px 10px', borderRadius: 8,
                  background: selectedCampaign.status === 'active' ? '#8b5cf615' : '#06b6d415',
                  color: selectedCampaign.status === 'active' ? '#8b5cf6' : '#06b6d4',
                  textTransform: 'uppercase', marginRight: 10,
                }}>
                  {selectedCampaign.status}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Timeline: <strong>{new Date(selectedCampaign.startDate).toLocaleDateString()}</strong> to <strong>{new Date(selectedCampaign.endDate).toLocaleDateString()}</strong>
                </span>
              </div>

              <div>
                <h4 style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                  Initiative Description
                </h4>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                  {selectedCampaign.description}
                </p>
              </div>

              {/* Linked Tasks specific to this ambassador & campaign */}
              <div>
                <h4 style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>
                  Your Deliverables for this Campaign
                </h4>
                {(() => {
                  const campaignTasks = tasks.filter(t => t.campaignId === selectedCampaign.id);
                  if (campaignTasks.length === 0) {
                    return (
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, padding: '10px 0' }}>
                        No specific deliverable tasks assigned to you for this campaign yet.
                      </p>
                    );
                  }
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {campaignTasks.map(t => (
                        <div key={t.id} style={{
                          padding: '12px 14px', borderRadius: 10,
                          border: '1px solid var(--surface-border)',
                          background: 'var(--bg-secondary)',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        }}>
                          <div>
                            <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>{t.title}</span>
                            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                              <span className={`badge badge-${t.priority.toLowerCase()}`} style={{ fontSize: '0.55rem' }}>{t.priority}</span>
                              <span className={`badge ${t.status === 'Completed' ? 'badge-success' : 'badge-info'}`} style={{ fontSize: '0.55rem' }}>{t.status}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => { setSelectedCampaign(null); setDetail(t); setTaskTab('list'); }}
                            style={{
                              padding: '6px 12px', borderRadius: 8, border: 'none', background: 'rgba(99,102,241,0.1)',
                              color: '#6366f1', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                              display: 'flex', alignItems: 'center', gap: 4
                            }}
                          >
                            <Eye size={12} /> View Task
                          </button>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
