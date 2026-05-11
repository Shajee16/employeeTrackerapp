'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const industries = [
  'IT/Software', 'Healthcare', 'Finance/Banking', 'Education', 'Manufacturing',
  'Retail/E-commerce', 'Real Estate', 'Logistics', 'Hospitality', 'Legal',
  'Media/Entertainment', 'Agriculture', 'Telecom', 'Automotive', 'Other',
];

const companySizes = ['1-50', '51-200', '201-500', '501-1000', '1000+'];

const services = [
  'Employment Verification', 'Criminal Check', 'Education Check',
  'Address Verification', 'Drug Screening', 'Credit Check',
  'Identity Verification', 'Reference Check', 'Web Development',
  'Mobile App', 'SEO', 'Digital Marketing', 'E-commerce', 'CRM',
  'Cloud Solutions', 'Data Analytics', 'IoT Solutions', 'LMS Platform',
];

const sources = ['LinkedIn', 'Website', 'Referral', 'Cold Call', 'Social Media', 'Event', 'Trade Show', 'Google', 'Email Campaign', 'Other'];

const leadStatuses = ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Closed', 'Lost'];

export default function AddLeadPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    source: 'LinkedIn',
    companyName: '', industry: 'IT/Software',
    contactPerson: '', designation: '',
    phone: '', email: '',
    companySize: '1-50',
    servicesInterested: [],
    estMonthlyVolume: '', estDealValue: '',
    status: 'New',
    nextFollowupDate: '',
    notes: '', priority: 'Medium',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.companyName.trim()) e.companyName = 'Required';
    if (!form.contactPerson.trim()) e.contactPerson = 'Required';
    if (!form.phone.trim()) e.phone = 'Required';
    else if (!/^[\+]?[\d\s\-]{8,15}$/.test(form.phone)) e.phone = 'Invalid phone';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    const res = await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) { setErrors({ submit: data.error }); setLoading(false); return; }
    setSuccess(true);
    setTimeout(() => router.push('/dashboard/workspace'), 1500);
  };

  const toggleService = (s) => {
    setForm(f => ({ ...f, servicesInterested: f.servicesInterested.includes(s) ? f.servicesInterested.filter(x => x !== s) : [...f.servicesInterested, s] }));
  };

  if (success) return (
    <div className="animate-fade" style={{ textAlign: 'center', padding: 60 }}>
      <div style={{ fontSize: '3rem', marginBottom: 16 }}>✅</div>
      <h2 style={{ fontWeight: 700, marginBottom: 8 }}>Lead Added Successfully!</h2>
      <p style={{ color: 'var(--text-muted)' }}>Redirecting to workspace...</p>
    </div>
  );

  return (
    <div className="animate-fade" style={{ maxWidth: 680, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => router.back()} className="btn btn-ghost">← Back</button>
      </div>

      {errors.submit && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 14px', color: 'var(--danger)', marginBottom: 16 }}>{errors.submit}</div>}

      <form onSubmit={handleSubmit} className="card" style={{ padding: '28px 28px 24px' }}>
        {/* Title Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'linear-gradient(135deg, #6366f1, #818cf8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
          }}>
            <span style={{ fontSize: '0.95rem' }}>📋</span>
          </div>
          <h3 style={{ fontWeight: 700, fontSize: '1.15rem', margin: 0 }}>Lead Entry Form</h3>
        </div>
        <p style={{ color: 'var(--primary-light)', fontSize: '0.76rem', fontWeight: 500, marginBottom: 22, marginLeft: 46 }}>
          Each lead is tracked and reviewed by your manager
        </p>

        {/* Lead Source */}
        <div className="form-group">
          <label className="form-label">Lead Source</label>
          <select value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}>
            {sources.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Company Name + Industry */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Company Name *</label>
            <input
              placeholder="e.g. TCS, Infosys"
              value={form.companyName}
              onChange={e => setForm({ ...form, companyName: e.target.value })}
              style={errors.companyName ? { borderColor: 'var(--danger)' } : {}}
            />
            {errors.companyName && <p className="form-error">{errors.companyName}</p>}
          </div>
          <div className="form-group">
            <label className="form-label">Industry</label>
            <select value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })}>
              {industries.map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
        </div>

        {/* Contact Person + Designation */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Contact Person *</label>
            <input
              placeholder="Name"
              value={form.contactPerson}
              onChange={e => setForm({ ...form, contactPerson: e.target.value })}
              style={errors.contactPerson ? { borderColor: 'var(--danger)' } : {}}
            />
            {errors.contactPerson && <p className="form-error">{errors.contactPerson}</p>}
          </div>
          <div className="form-group">
            <label className="form-label">Designation</label>
            <input
              placeholder="HR Manager, TA Lead..."
              value={form.designation}
              onChange={e => setForm({ ...form, designation: e.target.value })}
            />
          </div>
        </div>

        {/* Phone + Email */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Phone *</label>
            <input
              type="tel"
              placeholder="+91..."
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
              style={errors.phone ? { borderColor: 'var(--danger)' } : {}}
            />
            {errors.phone && <p className="form-error">{errors.phone}</p>}
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              placeholder="email@company.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              style={errors.email ? { borderColor: 'var(--danger)' } : {}}
            />
            {errors.email && <p className="form-error">{errors.email}</p>}
          </div>
        </div>

        {/* Company Size */}
        <div className="form-group">
          <label className="form-label">Company Size</label>
          <select value={form.companySize} onChange={e => setForm({ ...form, companySize: e.target.value })}>
            {companySizes.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Services Interested In (checkboxes) */}
        <div className="form-group">
          <label className="form-label">Services Interested In</label>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px 12px', marginTop: 4,
          }}>
            {services.map(s => (
              <label key={s} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text)',
                padding: '4px 0',
              }}>
                <input
                  type="checkbox"
                  checked={form.servicesInterested.includes(s)}
                  onChange={() => toggleService(s)}
                  style={{
                    width: 16, height: 16, accentColor: 'var(--primary)',
                    cursor: 'pointer', flexShrink: 0,
                  }}
                />
                <span style={{ lineHeight: 1.3 }}>{s}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Est. Monthly Volume + Est. Deal Value */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Est. Monthly Volume</label>
            <input
              placeholder="e.g. 100"
              value={form.estMonthlyVolume}
              onChange={e => setForm({ ...form, estMonthlyVolume: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Est. Deal Value (INR)</label>
            <input
              placeholder="e.g. 50000"
              value={form.estDealValue}
              onChange={e => setForm({ ...form, estDealValue: e.target.value })}
            />
          </div>
        </div>

        {/* Lead Status */}
        <div className="form-group">
          <label className="form-label">Lead Status</label>
          <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
            {leadStatuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Next Follow-up Date */}
        <div className="form-group">
          <label className="form-label">Next Follow-up Date</label>
          <input
            type="date"
            value={form.nextFollowupDate}
            onChange={e => setForm({ ...form, nextFollowupDate: e.target.value })}
          />
        </div>

        {/* Notes */}
        <div className="form-group">
          <label className="form-label">Notes</label>
          <textarea
            placeholder="Additional info..."
            value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })}
            rows={3}
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%', padding: '14px 24px', borderRadius: 12,
            background: 'linear-gradient(135deg, #6366f1, #7c3aed)',
            color: '#fff', fontWeight: 700, fontSize: '0.95rem',
            border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 16px rgba(99, 102, 241, 0.35)',
            transition: 'all 0.2s', marginTop: 4,
            opacity: loading ? 0.6 : 1,
            fontFamily: 'var(--font-family)',
          }}
        >
          {loading ? 'Submitting...' : 'Submit Lead Entry'}
        </button>
      </form>
    </div>
  );
}
