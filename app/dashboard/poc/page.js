'use client';
import { useState, useEffect } from 'react';
import { Users, UserPlus, FileText, ClipboardCheck, Sparkles, Send, CheckCircle2, XCircle, Clock } from 'lucide-react';

export default function PocDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Onboard form state
  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentPhone, setStudentPhone] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchData = async () => {
    try {
      const res = await fetch('/api/ambassadors');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOnboardSubmit = async (e) => {
    e.preventDefault();
    if (!studentName || !studentEmail) return;

    setFormSubmitting(true);
    setFormError('');
    setFormSuccess(false);

    try {
      const res = await fetch('/api/ambassadors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'onboard',
          studentName,
          studentEmail,
          studentPhone,
        }),
      });
      const resJson = await res.json();
      if (res.ok) {
        setFormSuccess(true);
        setStudentName('');
        setStudentEmail('');
        setStudentPhone('');
        fetchData();
      } else {
        setFormError(resJson.error || 'Failed to submit onboarding request');
      }
    } catch {
      setFormError('Network error. Please try again.');
    } finally {
      setFormSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 80, fontSize: '0.9rem' }}>
        <div style={{ width: 36, height: 36, border: '3px solid var(--surface-border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        Loading College Workspace...
      </div>
    );
  }

  const team = data?.team || [];
  const requests = data?.requests || [];
  const activities = data?.activities || [];

  const statCards = [
    { icon: Users, label: 'Active Team Size', value: team.length, color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)' },
    { icon: UserPlus, label: 'Pending Approvals', value: requests.filter(r => r.status === 'pending').length, color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
    { icon: ClipboardCheck, label: 'Activities Logged', value: activities.length, color: '#10b981', bg: 'rgba(16,185,129,0.08)' },
  ];

  return (
    <div className="animate-fade">
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, var(--primary), #8b5cf6)',
        borderRadius: 20, padding: '36px 40px', color: '#fff', marginBottom: 28,
        boxShadow: 'var(--shadow-lg)'
      }}>
        <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, opacity: 0.85 }}>College Representative Workspace</span>
        <h2 style={{ fontSize: '1.9rem', fontWeight: 800, marginTop: 6, letterSpacing: '-0.02em' }}>Chapter Leadership Dashboard</h2>
        <p style={{ fontSize: '0.88rem', opacity: 0.9, marginTop: 4 }}>Manage and expand your student ambassador network and oversee campaign executions.</p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
        {statCards.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 22 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={22} color={s.color} />
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>{s.label}</span>
                <p style={{ fontSize: '1.6rem', fontWeight: 800, color: s.color, lineHeight: 1.1, marginTop: 4 }}>{s.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Core split layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 24, alignItems: 'start' }} className="grid-split-tablet">
        {/* LEFT COLUMN: Request form + Team Roster */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Onboard form */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <UserPlus size={18} color="var(--primary)" />
              Onboard a New Ambassador
            </h3>
            
            <form onSubmit={handleOnboardSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Student Name *</label>
                  <input 
                    type="text" 
                    value={studentName} 
                    onChange={e => setStudentName(e.target.value)} 
                    placeholder="Rahul Sharma" 
                    required 
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Student Email *</label>
                  <input 
                    type="email" 
                    value={studentEmail} 
                    onChange={e => setStudentEmail(e.target.value)} 
                    placeholder="student@college.edu" 
                    required 
                  />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Contact Number (Optional)</label>
                <input 
                  type="text" 
                  value={studentPhone} 
                  onChange={e => setStudentPhone(e.target.value)} 
                  placeholder="+91 XXXXX XXXXX" 
                />
              </div>

              {formError && (
                <div style={{ fontSize: '0.8rem', color: '#ef4444', background: 'rgba(239,68,68,0.06)', padding: '10px 14px', borderRadius: 8 }}>
                  ⚠️ {formError}
                </div>
              )}
              {formSuccess && (
                <div style={{ fontSize: '0.8rem', color: '#10b981', background: 'rgba(16,185,129,0.06)', padding: '10px 14px', borderRadius: 8 }}>
                  ✅ Onboarding request registered! Waiting for system admin approval.
                </div>
              )}

              <button 
                type="submit" 
                disabled={formSubmitting} 
                className="btn btn-primary" 
                style={{ width: '100%', marginTop: 6, gap: 8 }}
              >
                <Send size={15} />
                {formSubmitting ? 'Registering Request...' : 'Submit Request for Approval'}
              </button>
            </form>
          </div>

          {/* Team roster */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Users size={18} color="#8b5cf6" />
              Active Team Representatives ({team.length})
            </h3>

            {team.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No active representatives found under this chapter yet. Request onboarding above!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {team.map(member => (
                  <div key={member.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '0.8rem' }}>
                        {member.name?.charAt(0)}
                      </div>
                      <div>
                        <p style={{ fontSize: '0.88rem', fontWeight: 600 }}>{member.name}</p>
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{member.email}</p>
                      </div>
                    </div>
                    <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>Active</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Activities Feed + Queue */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Onboarding queue */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Clock size={18} color="#f59e0b" />
              Onboarding History & Queue ({requests.length})
            </h3>
            
            {requests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No onboarding requests submitted yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 300, overflowY: 'auto' }}>
                {requests.slice().reverse().map(r => (
                  <div key={r.id} style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 10, borderLeft: `3px solid ${r.status === 'approved' ? '#10b981' : r.status === 'rejected' ? '#ef4444' : '#f59e0b'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{r.studentName}</span>
                      <span style={{ 
                        fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
                        color: r.status === 'approved' ? '#10b981' : r.status === 'rejected' ? '#ef4444' : '#d97706' 
                      }}>
                        {r.status}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{r.studentEmail}</p>
                    {r.adminRemarks && (
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 4, background: 'var(--surface)', padding: '4px 8px', borderRadius: 4 }}>
                        Remarks: {r.adminRemarks}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activities log feed */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Sparkles size={18} color="#10b981" />
              Recent College Activities Log ({activities.length})
            </h3>

            {activities.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                💡 No activities logged yet. Approved campus ambassadors can submit logs inside their workspace.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 420, overflowY: 'auto' }}>
                {activities.map(act => (
                  <div key={act.id || act._id} style={{ padding: 14, background: 'var(--bg-secondary)', borderRadius: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary)' }}>
                        {act.ambassadorName}
                      </span>
                      <span className="badge badge-info" style={{ fontSize: '0.65rem', textTransform: 'uppercase' }}>
                        {act.type?.replace('_', ' ')}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text)', lineHeight: 1.4 }}>{act.description}</p>
                    
                    {/* Metrics detail if present */}
                    {act.metrics && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8, fontSize: '0.72rem', color: 'var(--text-secondary)', background: 'var(--surface)', padding: '5px 8px', borderRadius: 6 }}>
                        {act.metrics.count > 0 && <span>🔢 Count: <strong>{act.metrics.count}</strong></span>}
                        {act.metrics.eventName && <span>🏷️ Event: <strong>{act.metrics.eventName}</strong></span>}
                      </div>
                    )}

                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', marginTop: 8, textAlign: 'right' }}>
                      {new Date(act.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
