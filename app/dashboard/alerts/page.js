'use client';
import { useState, useEffect } from 'react';
import { Bell, CheckCircle, AlertTriangle, Info, Zap, Clock } from 'lucide-react';

const SEV_CONFIG = {
  info:     { Icon: Info,          color: '#3b82f6', bg: '#eff6ff' },
  warning:  { Icon: AlertTriangle, color: '#d97706', bg: '#fffbeb' },
  critical: { Icon: Zap,           color: '#ef4444', bg: '#fee2e2' },
};

export default function EmployeeAlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/alerts')
      .then(r => r.json())
      .then(d => { setAlerts(d.alerts || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const acknowledged = alerts.filter(a => a.acknowledged);
  const pending = alerts.filter(a => !a.acknowledged && a.status === 'active');

  const card = { background: 'var(--surface)', border: '1px solid var(--surface-border)', borderRadius: 16, padding: 24 };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Bell size={24} /> Alert History
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 4 }}>All alerts addressed to you, your team, or all employees.</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total Alerts', value: alerts.length, color: 'var(--primary)' },
          { label: 'Acknowledged', value: acknowledged.length, color: '#16a34a' },
          { label: 'Pending', value: pending.length, color: '#ef4444' },
        ].map(s => (
          <div key={s.label} style={{ ...card, textAlign: 'center', padding: 18 }}>
            <p style={{ fontSize: '1.8rem', fontWeight: 900, color: s.color }}>{s.value}</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 2 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Loading alerts...</div>
      ) : alerts.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: 60 }}>
          <Bell size={40} style={{ margin: '0 auto 16px', opacity: 0.3 }} color="var(--text-muted)" />
          <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>No alerts yet</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>You'll see alerts here when an admin issues one.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {alerts.map(alert => {
            const cfg = SEV_CONFIG[alert.severity] || SEV_CONFIG.info;
            const SevIcon = cfg.Icon;
            return (
              <div key={alert.id} style={{ ...card, border: `1px solid ${alert.acknowledged ? 'var(--surface-border)' : cfg.color + '60'}`, opacity: alert.status !== 'active' && !alert.acknowledged ? 0.7 : 1 }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{ width: 42, height: 42, borderRadius: '50%', background: cfg.bg, border: `2px solid ${cfg.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <SevIcon size={20} color={cfg.color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.95rem' }}>{alert.title}</span>
                      <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700, background: cfg.color, color: '#fff' }}>
                        {(alert.severity || 'info').charAt(0).toUpperCase() + (alert.severity || 'info').slice(1)}
                      </span>
                      {alert.acknowledged ? (
                        <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700, background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle size={11} /> Acknowledged
                        </span>
                      ) : alert.status === 'active' ? (
                        <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700, background: '#fef3c7', color: '#92400e' }}>
                          Pending
                        </span>
                      ) : (
                        <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700, background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                          Closed
                        </span>
                      )}
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.6 }}>{alert.message}</p>
                    <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={11} /> {new Date(alert.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {alert.acknowledged && alert.acknowledgedAt && (
                        <span style={{ fontSize: '0.75rem', color: '#16a34a', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle size={11} /> Acknowledged {new Date(alert.acknowledgedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
