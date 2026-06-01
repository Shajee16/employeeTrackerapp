import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET(req) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = await getDb();

    // Fetch all campaigns
    const campaigns = await db.collection('campaigns')
      .find({})
      .sort({ startDate: 1 })
      .toArray();

    // Filter campaigns based on ambassador's collegeId
    // Standard sales or other roles can view all campaigns, but ambassadors are filtered by targetColleges
    let filteredCampaigns = campaigns;
    if (session.role === 'Campus Ambassador') {
      const collegeId = session.collegeId;
      filteredCampaigns = campaigns.filter(camp => {
        const targets = camp.targetColleges || [];
        return targets.includes('All') || targets.length === 0 || (collegeId && targets.includes(collegeId));
      });
    }

    return NextResponse.json({ campaigns: filteredCampaigns });
  } catch (err) {
    console.error('Failed to fetch ambassador campaigns:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
