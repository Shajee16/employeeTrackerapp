import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { sanitizeInput, sanitizeString, isOneOf } from '@/lib/sanitize';
import { v4 as uuid } from 'uuid';

export async function GET(req) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const collegeId = session.collegeId;

  try {
    const db = await getDb();

    // ── CASE 1: COLLEGE POINT OF CONTACT (POC) ─────────────────────────────
    if (session.role === 'College POC') {
      if (!collegeId) {
        return NextResponse.json({ error: 'POC is not associated with any college' }, { status: 400 });
      }

      // 1. Fetch onboarding requests
      const requests = await db.collection('ambassador_onboarding_requests')
        .find({ collegeId })
        .toArray();

      // 2. Fetch team members (Campus Ambassadors)
      const ambassadors = await db.collection('users')
        .find({ collegeId, role: 'Campus Ambassador' })
        .toArray();

      // 3. Fetch college activity feed
      const activities = await db.collection('ambassador_activities')
        .find({ collegeId })
        .sort({ createdAt: -1 })
        .toArray();

      // Enrich activities with ambassador names
      const enrichedActivities = activities.map(act => {
        const amb = ambassadors.find(a => a.id === act.ambassadorId || String(a._id) === act.ambassadorId);
        return {
          ...act,
          ambassadorName: amb ? amb.name : 'Unknown Ambassador',
        };
      });

      return NextResponse.json({
        requests,
        team: ambassadors.map(({ password, ...u }) => u),
        activities: enrichedActivities,
      });
    }

    // ── CASE 2: CAMPUS AMBASSADOR ──────────────────────────────────────────
    if (session.role === 'Campus Ambassador') {
      // 1. Fetch personal activity logs
      const activities = await db.collection('ambassador_activities')
        .find({ ambassadorId: session.id })
        .sort({ createdAt: -1 })
        .toArray();

      // 2. Compute stats summary by 4 core roles
      const contentTypes = ['content_post', 'blog_article', 'video_created', 'advertised_event'];
      const eventTypes = ['event_hosted', 'campus_tour', 'workshop', 'booth_managed', 'planned_event', 'executed_event'];
      const mentorTypes = ['student_mentored', 'qa_session', 'inquiry_response'];
      const leadTypes = ['lead_signup', 'referral_distributed', 'app_install', 'people_added'];

      const stats = {
        // Legacy counts
        peopleAdded: activities.filter(a => a.type === 'people_added' || a.type === 'lead_signup').reduce((acc, curr) => acc + (curr.metrics?.count || 0), 0),
        eventsAdvertised: activities.filter(a => a.type === 'advertised_event' || a.type === 'content_post').length,
        eventsPlanned: activities.filter(a => a.type === 'planned_event').length,
        eventsExecuted: activities.filter(a => a.type === 'executed_event' || a.type === 'event_hosted').length,
        // New 4-role stats
        contentCreated: activities.filter(a => contentTypes.includes(a.type)).length,
        eventsHosted: activities.filter(a => eventTypes.includes(a.type)).length,
        studentsMentored: activities.filter(a => mentorTypes.includes(a.type)).reduce((acc, curr) => acc + (curr.metrics?.count || 1), 0),
        leadsGenerated: activities.filter(a => leadTypes.includes(a.type)).reduce((acc, curr) => acc + (curr.metrics?.count || 0), 0),
      };

      // 3. Fetch tasks relevant to this ambassador
      const tasks = await db.collection('tasks')
        .find({
          $or: [
            { userId: session.id },
            { userId: 'Student Ambassador' },
            { scope: 'department', targetDepartment: 'Student Ambassador' },
            { scope: 'college', collegeId: collegeId },
            { collegeId: collegeId }
          ]
        })
        .sort({ deadline: 1 })
        .toArray();

      // 4. Fetch proof-of-work submissions
      const proofs = await db.collection('ambassador_proofs')
        .find({ ambassadorId: session.id })
        .sort({ createdAt: -1 })
        .toArray();

      // Strip base64 data from proof files for list response
      const cleanProofs = proofs.map(p => ({
        ...p,
        proofs: (p.proofs || []).map(f => ({ filename: f.filename, contentType: f.contentType })),
      }));

      return NextResponse.json({
        activities,
        stats,
        tasks,
        workspaceProofs: cleanProofs,
      });
    }

    return NextResponse.json({ error: 'Forbidden: Invalid role' }, { status: 403 });
  } catch (err) {
    console.error('Failed in GET /api/ambassadors:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let rawBody;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Preserve potential base64 proof
  const rawProof = rawBody.proof || null;
  delete rawBody.proof;

  const body = sanitizeInput(rawBody);
  const db = await getDb();

  try {
    // ── SUB-ACTION: ONBOARD REQUEST (College POC) ──────────────────────────
    if (body.action === 'onboard' && session.role === 'College POC') {
      const studentName = sanitizeString(body.studentName, 100);
      const studentEmail = sanitizeString(body.studentEmail, 254).toLowerCase();
      const studentPhone = sanitizeString(body.studentPhone, 20);

      if (!studentName || !studentEmail) {
        return NextResponse.json({ error: 'Student Name and Email are required' }, { status: 400 });
      }

      // Check if student is already in onboarding queue or users
      const existingReq = await db.collection('ambassador_onboarding_requests')
        .findOne({ studentEmail, status: 'pending' });
      if (existingReq) {
        return NextResponse.json({ error: 'A request for this student email is already pending' }, { status: 400 });
      }

      const existingUser = await db.collection('users').findOne({ email: studentEmail });
      if (existingUser) {
        return NextResponse.json({ error: 'A user with this email is already registered' }, { status: 400 });
      }

      const newRequest = {
        id: uuid(),
        collegeId: session.collegeId,
        pocId: session.id,
        studentName,
        studentEmail,
        studentPhone,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      await db.collection('ambassador_onboarding_requests').insertOne(newRequest);
      return NextResponse.json({ success: true, request: newRequest });
    }

    // ── SUB-ACTION: LOG ACTIVITY (Campus Ambassador) ───────────────────────
    if (body.action === 'log_activity' && session.role === 'Campus Ambassador') {
      const type = sanitizeString(body.type, 50); // people_added, advertised_event, planned_event, executed_event
      const description = sanitizeString(body.description || '', 2000);
      const count = parseInt(body.count || 0, 10);
      const eventName = sanitizeString(body.eventName || '', 200);
      const eventDate = sanitizeString(body.eventDate || '', 50);

      if (!isOneOf(type, [
        'people_added', 'advertised_event', 'planned_event', 'executed_event',
        'content_post', 'blog_article', 'video_created',
        'event_hosted', 'campus_tour', 'workshop', 'booth_managed',
        'student_mentored', 'qa_session', 'inquiry_response',
        'lead_signup', 'referral_distributed', 'app_install',
      ])) {
        return NextResponse.json({ error: 'Invalid activity type' }, { status: 400 });
      }

      const activityId = uuid();
      const activityLog = {
        id: activityId,
        ambassadorId: session.id,
        collegeId: session.collegeId,
        type,
        description,
        metrics: {
          count,
          eventName,
          eventDate,
        },
        proofs: [],
        createdAt: new Date().toISOString(),
      };

      // Process base64 proof if provided
      if (rawProof && rawProof.startsWith('data:')) {
        const base64Part = rawProof.split(',')[1] || rawProof;
        const contentType = rawProof.match(/^data:([^;]+)/)?.[1] || 'application/octet-stream';
        const ext = contentType.split('/')[1] || 'bin';
        activityLog.proofs.push({
          filename: `activity_proof_${activityId}.${ext}`,
          contentType,
          base64Data: base64Part,
        });
      }

      await db.collection('ambassador_activities').insertOne(activityLog);
      return NextResponse.json({ success: true, activity: activityLog });
    }

    // ── SUB-ACTION: POST THREAD COMMENT/LOG (Campus Ambassador / POC) ───────
    if (body.action === 'thread_post') {
      const taskId = body.taskId;
      const text = sanitizeString(body.text || '', 2000);
      const isActivityLog = !!body.isActivityLog;

      if (!taskId) {
        return NextResponse.json({ error: 'taskId is required' }, { status: 400 });
      }
      if (!text && !isActivityLog) {
        return NextResponse.json({ error: 'Post content or activity is required' }, { status: 400 });
      }

      // Check if task exists
      const task = await db.collection('tasks').findOne({ id: taskId });
      if (!task) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 });
      }

      let activityId = null;

      // If posting comment is linked with an activity log
      if (isActivityLog && session.role === 'Campus Ambassador') {
        const type = sanitizeString(body.activityType, 50);
        const description = sanitizeString(body.activityDescription || text, 2000);
        const count = parseInt(body.activityCount || 0, 10);
        const eventName = sanitizeString(body.eventName || '', 200);

        if (isOneOf(type, ['people_added', 'advertised_event', 'planned_event', 'executed_event'])) {
          activityId = uuid();
          const activityLog = {
            id: activityId,
            ambassadorId: session.id,
            collegeId: session.collegeId,
            type,
            description,
            taskId, // Linked to this task!
            metrics: {
              count,
              eventName,
            },
            proofs: [],
            createdAt: new Date().toISOString(),
          };

          if (rawProof && rawProof.startsWith('data:')) {
            const base64Part = rawProof.split(',')[1] || rawProof;
            const contentType = rawProof.match(/^data:([^;]+)/)?.[1] || 'application/octet-stream';
            const ext = contentType.split('/')[1] || 'bin';
            activityLog.proofs.push({
              filename: `activity_proof_${activityId}.${ext}`,
              contentType,
              base64Data: base64Part,
            });
          }

          await db.collection('ambassador_activities').insertOne(activityLog);
        }
      }

      const commentId = uuid();
      const newComment = {
        id: commentId,
        text: text || `Logged activity: ${body.activityType || 'Marketing Campaign'}`,
        timestamp: new Date().toISOString(),
        by: session.name || session.email,
        userId: session.id,
        role: session.role,
        activityId, // References logged activity
      };

      // Append to the task thread comments array
      await db.collection('tasks').updateOne(
        { id: taskId },
        { $push: { comments: newComment } }
      );

      return NextResponse.json({ success: true, comment: newComment });
    }

    // ── SUB-ACTION: SUBMIT PROOF OF WORK (Campus Ambassador) ────────────────
    if (body.action === 'submit_proof' && session.role === 'Campus Ambassador') {
      const category = sanitizeString(body.category, 50); // content, event, lead, admin
      if (!isOneOf(category, ['content', 'event', 'lead', 'admin'])) {
        return NextResponse.json({ error: 'Invalid proof category' }, { status: 400 });
      }

      const proofId = uuid();
      const proofEntry = {
        id: proofId,
        ambassadorId: session.id,
        collegeId: session.collegeId,
        category,
        title: sanitizeString(body.title || '', 200),
        description: sanitizeString(body.description || '', 2000),
        status: 'pending', // pending, approved, rejected
        createdAt: new Date().toISOString(),
        proofs: [],
      };

      // Category-specific fields
      if (category === 'content') {
        proofEntry.contentData = {
          postUrl: sanitizeString(body.postUrl || '', 500),
          platform: sanitizeString(body.platform || '', 50),
          views: parseInt(body.views || 0, 10),
          likes: parseInt(body.likes || 0, 10),
          shares: parseInt(body.shares || 0, 10),
          comments: parseInt(body.commentsCount || 0, 10),
        };
      } else if (category === 'event') {
        proofEntry.eventData = {
          eventName: sanitizeString(body.eventName || '', 200),
          eventDate: sanitizeString(body.eventDate || '', 50),
          checkInTime: sanitizeString(body.checkInTime || '', 20),
          checkOutTime: sanitizeString(body.checkOutTime || '', 20),
          attendeeCount: parseInt(body.attendeeCount || 0, 10),
          eventSummary: sanitizeString(body.eventSummary || '', 2000),
        };
      } else if (category === 'lead') {
        proofEntry.leadData = {
          leadName: sanitizeString(body.leadName || '', 100),
          leadEmail: sanitizeString(body.leadEmail || '', 254),
          leadPhone: sanitizeString(body.leadPhone || '', 20),
          leadInterest: sanitizeString(body.leadInterest || '', 200),
          referralCode: sanitizeString(body.referralCode || '', 50),
        };
      } else if (category === 'admin') {
        proofEntry.adminData = {
          claimType: sanitizeString(body.claimType || '', 50), // timesheet, reimbursement
          amount: parseFloat(body.amount || 0),
          currency: sanitizeString(body.currency || 'INR', 10),
          hoursWorked: parseFloat(body.hoursWorked || 0),
          notes: sanitizeString(body.notes || '', 2000),
        };
      }

      // Process base64 proof files (screenshot / receipt / photo)
      const rawFiles = Array.isArray(body.files) ? body.files : (rawProof ? [rawProof] : []);
      for (const file of rawFiles.slice(0, 5)) { // max 5 files
        if (typeof file === 'string' && file.startsWith('data:')) {
          const base64Part = file.split(',')[1] || file;
          const contentType = file.match(/^data:([^;]+)/)?.[1] || 'application/octet-stream';
          const ext = contentType.split('/')[1] || 'bin';
          proofEntry.proofs.push({
            filename: `proof_${proofId}_${proofEntry.proofs.length}.${ext}`,
            contentType,
            base64Data: base64Part,
          });
        }
      }

      // Also handle single proof from rawProof
      if (rawProof && rawProof.startsWith('data:') && rawFiles.length === 0) {
        const base64Part = rawProof.split(',')[1] || rawProof;
        const contentType = rawProof.match(/^data:([^;]+)/)?.[1] || 'application/octet-stream';
        const ext = contentType.split('/')[1] || 'bin';
        proofEntry.proofs.push({
          filename: `proof_${proofId}_0.${ext}`,
          contentType,
          base64Data: base64Part,
        });
      }

      await db.collection('ambassador_proofs').insertOne(proofEntry);
      return NextResponse.json({ success: true, proof: { ...proofEntry, proofs: proofEntry.proofs.map(p => ({ filename: p.filename, contentType: p.contentType })) } });
    }

    return NextResponse.json({ error: 'Action not supported or invalid credentials' }, { status: 400 });
  } catch (err) {
    console.error('Failed in POST /api/ambassadors:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
