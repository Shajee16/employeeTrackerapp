import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { readData, writeData } from '@/lib/db';
import { sanitizeString } from '@/lib/sanitize';
import { v4 as uuid } from 'uuid';

const validStatuses = ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Closed', 'Lost'];
const validPriorities = ['Low', 'Medium', 'High', 'Critical'];

// Flexible column name mapping — handles common variations employees might use
const COLUMN_MAP = {
  // Company Name
  'company name': 'companyName', 'company': 'companyName', 'companyname': 'companyName',
  'company_name': 'companyName', 'firm': 'companyName', 'organization': 'companyName', 'org': 'companyName',
  // Contact Person
  'contact person': 'contactPerson', 'contact': 'contactPerson', 'contactperson': 'contactPerson',
  'contact_person': 'contactPerson', 'name': 'contactPerson', 'person': 'contactPerson',
  'contact name': 'contactPerson', 'poc': 'contactPerson',
  // Designation
  'designation': 'designation', 'title': 'designation', 'job title': 'designation',
  'position': 'designation', 'role': 'designation', 'job_title': 'designation',
  // Phone
  'phone': 'phone', 'phone number': 'phone', 'mobile': 'phone', 'contact number': 'phone',
  'phone_number': 'phone', 'mobile number': 'phone', 'tel': 'phone', 'telephone': 'phone', 'cell': 'phone',
  // Email
  'email': 'email', 'email address': 'email', 'e-mail': 'email', 'email_address': 'email', 'mail': 'email',
  // Address
  'address': 'address', 'location': 'address', 'city': 'address', 'office address': 'address',
  // Industry
  'industry': 'industry', 'sector': 'industry', 'domain': 'industry', 'vertical': 'industry',
  // Company Size
  'company size': 'companySize', 'companysize': 'companySize', 'company_size': 'companySize',
  'size': 'companySize', 'employees': 'companySize', 'team size': 'companySize',
  // Services Interested
  'services interested': 'servicesInterested', 'services': 'servicesInterested',
  'servicesinterested': 'servicesInterested', 'services_interested': 'servicesInterested',
  'interested services': 'servicesInterested', 'service': 'servicesInterested',
  // Source
  'source': 'source', 'lead source': 'source', 'leadsource': 'source', 'lead_source': 'source',
  'channel': 'source', 'how found': 'source',
  // Est Monthly Volume
  'est monthly volume': 'estMonthlyVolume', 'monthly volume': 'estMonthlyVolume',
  'estmonthlyvolume': 'estMonthlyVolume', 'est_monthly_volume': 'estMonthlyVolume',
  'volume': 'estMonthlyVolume',
  // Est Deal Value
  'est deal value': 'estDealValue', 'deal value': 'estDealValue', 'estdealvalue': 'estDealValue',
  'est_deal_value': 'estDealValue', 'value': 'estDealValue', 'deal': 'estDealValue',
  'deal value (inr)': 'estDealValue', 'deal value inr': 'estDealValue',
  // Status
  'status': 'status', 'lead status': 'status', 'leadstatus': 'status', 'lead_status': 'status',
  // Priority
  'priority': 'priority', 'lead priority': 'priority', 'urgency': 'priority',
  // Notes
  'notes': 'notes', 'note': 'notes', 'remarks': 'notes', 'comment': 'notes', 'comments': 'notes',
  'description': 'notes',
  // Next Follow-up Date
  'next followup date': 'nextFollowupDate', 'next follow-up date': 'nextFollowupDate',
  'followup date': 'nextFollowupDate', 'follow-up date': 'nextFollowupDate',
  'nextfollowupdate': 'nextFollowupDate', 'next_followup_date': 'nextFollowupDate',
  'next follow up': 'nextFollowupDate',
};

function mapColumnName(raw) {
  const cleaned = raw.trim().toLowerCase().replace(/[*#]/g, '');
  return COLUMN_MAP[cleaned] || null;
}

function normalizeStatus(val) {
  if (!val) return 'New';
  const lower = val.trim().toLowerCase();
  const found = validStatuses.find(s => s.toLowerCase() === lower);
  return found || 'New';
}

function normalizePriority(val) {
  if (!val) return 'Medium';
  const lower = val.trim().toLowerCase();
  const found = validPriorities.find(p => p.toLowerCase() === lower);
  return found || 'Medium';
}

function parseServices(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(s => String(s).trim()).filter(Boolean);
  return String(val).split(/[,;|]+/).map(s => s.trim()).filter(Boolean);
}

export async function POST(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { rows, headers } = body;
  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'No data rows found in the file' }, { status: 400 });
  }
  if (!headers || !Array.isArray(headers)) {
    return NextResponse.json({ error: 'No headers found' }, { status: 400 });
  }

  // Map header names to our field names
  const fieldMap = headers.map(h => mapColumnName(String(h)));

  // Ensure we have at least company name and contact person
  if (!fieldMap.includes('companyName')) {
    return NextResponse.json({
      error: 'Missing required column: "Company Name". Your file must have a column named "Company Name" (or "Company", "Organization").',
    }, { status: 400 });
  }
  if (!fieldMap.includes('contactPerson')) {
    return NextResponse.json({
      error: 'Missing required column: "Contact Person". Your file must have a column named "Contact Person" (or "Contact", "Name", "POC").',
    }, { status: 400 });
  }

  const leads = await readData('leads');
  const existingKeys = new Set(
    leads.filter(l => l.userId === session.id).map(l => `${(l.email || '').toLowerCase()}|${(l.phone || '').replace(/\s/g, '')}`)
  );

  const results = [];
  const newLeads = [];
  const seenInBatch = new Set();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // +2 because row 1 = header, data starts at 2

    // Build lead object from row
    const leadData = {};
    for (let j = 0; j < row.length; j++) {
      const field = fieldMap[j];
      if (field) {
        leadData[field] = row[j] != null ? String(row[j]).trim() : '';
      }
    }

    // Skip entirely empty rows
    const hasData = Object.values(leadData).some(v => v && v.trim());
    if (!hasData) continue;

    // Validate required fields
    if (!leadData.companyName || !leadData.companyName.trim()) {
      results.push({ row: rowNum, status: 'error', reason: 'Company Name is empty' });
      continue;
    }
    if (!leadData.contactPerson || !leadData.contactPerson.trim()) {
      results.push({ row: rowNum, status: 'error', reason: 'Contact Person is empty' });
      continue;
    }

    // Duplicate check — against existing leads and current batch
    const dedupKey = `${(leadData.email || '').toLowerCase()}|${(leadData.phone || '').replace(/\s/g, '')}`;
    if (leadData.email || leadData.phone) {
      if (existingKeys.has(dedupKey)) {
        results.push({ row: rowNum, status: 'skipped', reason: `Duplicate — lead with this email/phone already exists`, company: leadData.companyName });
        continue;
      }
      if (seenInBatch.has(dedupKey)) {
        results.push({ row: rowNum, status: 'skipped', reason: `Duplicate within this file`, company: leadData.companyName });
        continue;
      }
      seenInBatch.add(dedupKey);
    }

    const newLead = {
      id: uuid(),
      userId: session.id,
      companyName: sanitizeString(leadData.companyName, 200),
      contactPerson: sanitizeString(leadData.contactPerson, 100),
      designation: sanitizeString(leadData.designation || '', 100),
      phone: sanitizeString(leadData.phone || '', 20),
      email: sanitizeString(leadData.email || '', 254),
      address: sanitizeString(leadData.address || '', 500),
      industry: sanitizeString(leadData.industry || '', 100),
      companySize: sanitizeString(leadData.companySize || '', 20),
      servicesInterested: parseServices(leadData.servicesInterested),
      source: sanitizeString(leadData.source || '', 100),
      estMonthlyVolume: sanitizeString(leadData.estMonthlyVolume || '', 50),
      estDealValue: sanitizeString(leadData.estDealValue || '', 50),
      notes: sanitizeString(leadData.notes || '', 2000),
      priority: normalizePriority(leadData.priority),
      status: normalizeStatus(leadData.status),
      nextFollowupDate: sanitizeString(leadData.nextFollowupDate || '', 20),
      activities: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    newLeads.push(newLead);
    results.push({ row: rowNum, status: 'success', company: newLead.companyName });
  }

  if (newLeads.length > 0) {
    leads.push(...newLeads);
    await writeData('leads', leads);
  }

  return NextResponse.json({
    totalProcessed: results.length,
    successCount: results.filter(r => r.status === 'success').length,
    errorCount: results.filter(r => r.status === 'error').length,
    skippedCount: results.filter(r => r.status === 'skipped').length,
    results,
  });
}
