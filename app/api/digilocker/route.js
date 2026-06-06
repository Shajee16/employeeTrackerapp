import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';

// GET — Fetch the current user's DigiLocker verification status
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = await getDb();
  const record = await db.collection('digilocker_verifications').findOne({ userId: session.id });

  if (!record) {
    return NextResponse.json({ verified: false });
  }

  const { _id, ...data } = record;
  return NextResponse.json({ verified: true, ...data });
}

// POST — Save DigiLocker verification data after the user completes MeriPehchan flow
export async function POST(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const db = await getDb();

  const verificationData = {
    userId: session.id,
    verified: true,
    digilockerid: body.digilockerid || null,
    name: body.name || null,
    dob: body.dob || null,
    gender: body.gender || null,
    aadhaar: body.aadhaar || null,
    mobile: body.mobile || null,
    email: body.email || null,
    documents: body.documents || null,
    icjs: body.icjs || null,
    apaar: body.apaar || null,
    verifiedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await db.collection('digilocker_verifications').updateOne(
    { userId: session.id },
    { $set: verificationData },
    { upsert: true }
  );

  // Also update the user record to flag as digilocker verified
  await db.collection('users').updateOne(
    { id: session.id },
    { $set: { digilockerVerified: true, digilockerVerifiedAt: verificationData.verifiedAt } }
  );

  return NextResponse.json({ success: true, verified: true });
}
