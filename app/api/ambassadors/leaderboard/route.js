import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/db';

const POINTS = {
  // Content Creator (flat points)
  content_post: 100,
  blog_article: 100,
  video_created: 100,
  advertised_event: 100,

  // Event Host (flat points)
  event_hosted: 500,
  campus_tour: 500,
  workshop: 500,
  booth_managed: 500,

  // Peer Mentor (points per student/inquiry)
  student_mentored: 50,
  qa_session: 50,
  inquiry_response: 50,

  // Lead Generator (points per sign-up/referral)
  lead_signup: 150,
  referral_distributed: 150,
  app_install: 150,
  people_added: 150,
};

export async function GET(req) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = await getDb();

    // 1. Fetch Campus Ambassadors
    const ambassadors = await db.collection('users')
      .find({ role: 'Campus Ambassador' })
      .toArray();

    // 2. Fetch all colleges
    const colleges = await db.collection('colleges')
      .find({})
      .toArray();

    // 3. Fetch all ambassador activities (excluding admin category if any)
    const activities = await db.collection('ambassador_activities')
      .find({})
      .toArray();

    // 4. Calculate scores & badges for each ambassador
    const leaderboardData = ambassadors.map(user => {
      const userActivities = activities.filter(a => a.ambassadorId === user.id);

      let score = 0;
      let contentCreated = 0;
      let eventsHosted = 0;
      let studentsMentored = 0;
      let leadsGenerated = 0;
      let totalActivities = 0;

      userActivities.forEach(act => {
        const type = act.type;
        const count = parseInt(act.metrics?.count || 1, 10);

        if (POINTS[type] !== undefined) {
          totalActivities++;
          if (['content_post', 'blog_article', 'video_created', 'advertised_event'].includes(type)) {
            score += POINTS[type];
            contentCreated++;
          } else if (['event_hosted', 'campus_tour', 'workshop', 'booth_managed'].includes(type)) {
            score += POINTS[type];
            eventsHosted++;
          } else if (['student_mentored', 'qa_session', 'inquiry_response'].includes(type)) {
            score += count * POINTS[type];
            studentsMentored += count;
          } else if (['lead_signup', 'referral_distributed', 'app_install', 'people_added'].includes(type)) {
            score += count * POINTS[type];
            leadsGenerated += count;
          }
        }
      });

      // Badges definitions
      const badges = [
        {
          id: 'content_catalyst',
          label: 'Content Catalyst',
          emoji: '🎨',
          desc: 'Log 5+ Content Creator activities',
          unlocked: contentCreated >= 5,
          current: contentCreated,
          target: 5,
        },
        {
          id: 'campus_pioneer',
          label: 'Campus Pioneer',
          emoji: '🎪',
          desc: 'Host 3+ campus events',
          unlocked: eventsHosted >= 3,
          current: eventsHosted,
          target: 3,
        },
        {
          id: 'student_guide',
          label: 'Student Guide',
          emoji: '💬',
          desc: 'Mentor 10+ prospective students',
          unlocked: studentsMentored >= 10,
          current: studentsMentored,
          target: 10,
        },
        {
          id: 'lead_magnet',
          label: 'Lead Magnet',
          emoji: '🎯',
          desc: 'Generate 10+ new leads',
          unlocked: leadsGenerated >= 10,
          current: leadsGenerated,
          target: 10,
        },
        {
          id: 'super_ambassador',
          label: 'Super Ambassador',
          emoji: '⭐',
          desc: 'Complete 25+ activities overall',
          unlocked: totalActivities >= 25,
          current: totalActivities,
          target: 25,
        },
      ];

      const college = colleges.find(c => c.id === user.collegeId);

      return {
        userId: user.id,
        name: user.name || 'Anonymous Rep',
        email: user.email,
        collegeId: user.collegeId,
        collegeName: college?.name || 'Unknown College',
        score,
        badges,
        stats: {
          contentCreated,
          eventsHosted,
          studentsMentored,
          leadsGenerated,
          totalActivities,
        },
      };
    });

    // 5. Sort by score descending and assign rank
    leaderboardData.sort((a, b) => b.score - a.score);
    const rankedLeaderboard = leaderboardData.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));

    return NextResponse.json({ leaderboard: rankedLeaderboard });
  } catch (err) {
    console.error('Failed to fetch ambassador leaderboard:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
