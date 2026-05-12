import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { sanitizeString, sanitizeInput } from '@/lib/sanitize';
import { readData } from '@/lib/db';
import { v4 as uuid } from 'uuid';

// GET /api/alerts — get active alerts for this employee
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const db = await getDb();
  const users = await readData('users');
  const emp = users.find(u => u.id === session.id);
  const dept = emp?.department || '';

  // Find alerts targeting this employee specifically, their dept, or all
  const alerts = await db.collection('alerts').find({
    status: 'active',
    $or: [
      { targetType: 'all' },
      { targetType: 'department', targetDepartment: dept },
      { targetType: 'employee', targetEmployeeId: session.id },
    ],
  }).sort({ createdAt: -1 }).toArray();

  // Fetch this employee's acknowledgements
  const acks = await db.collection('alert_acknowledgements')
    .find({ employeeId: session.id })
    .toArray();
  const ackedIds = new Set(acks.map(a => a.alertId));

  const result = alerts.map(({ _id, ...a }) => ({
    ...a,
    acknowledged: ackedIds.has(a.id),
  }));

  return NextResponse.json({ alerts: result });
}

// POST /api/alerts — employee acknowledges an alert
export async function POST(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  let body;
  try { body = sanitizeInput(await req.json()); }
  catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }); }

  if (!body.alertId) return NextResponse.json({ error: 'alertId required' }, { status: 400 });

  const db = await getDb();

  // Check alert exists and is active
  const alert = await db.collection('alerts').findOne({ id: sanitizeString(body.alertId, 50) });
  if (!alert || alert.status !== 'active') {
    return NextResponse.json({ error: 'Alert not found or no longer active' }, { status: 404 });
  }

  // Validate comment if required
  if (alert.requireComment && (!body.comment || !String(body.comment).trim())) {
    return NextResponse.json({ error: 'A comment is required to acknowledge this alert' }, { status: 400 });
  }

  // Check if already acknowledged
  const existing = await db.collection('alert_acknowledgements').findOne({
    alertId: body.alertId,
    employeeId: session.id,
  });
  if (existing) return NextResponse.json({ success: true, alreadyAcked: true });

  await db.collection('alert_acknowledgements').insertOne({
    id: uuid(),
    alertId: sanitizeString(body.alertId, 50),
    employeeId: session.id,
    employeeName: session.name || '',
    employeeEmail: session.email || '',
    comment: sanitizeString(body.comment || '', 1000),
    acknowledgedAt: new Date().toISOString(),
  });

  return NextResponse.json({ success: true });
}
