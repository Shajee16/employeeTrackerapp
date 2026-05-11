import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

// Try to load env
import fs from 'fs';
if (fs.existsSync('.env')) {
  dotenv.config({ path: '.env' });
} else if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
}

const uri = process.env.MONGODB_URI || "mongodb+srv://user:pass@cluster.mongodb.net/"; // will fail if not set, but we assume it's in the env

async function run() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db('cluso');
    const usersCol = db.collection('users');
    
    const users = await usersCol.find({}).toArray();
    
    // Deduplicate by email
    const uniqueUsers = [];
    const seenEmails = new Set();
    const toDelete = [];
    
    for (const u of users) {
      if (seenEmails.has(u.email.toLowerCase())) {
        toDelete.push(u._id);
      } else {
        seenEmails.add(u.email.toLowerCase());
        uniqueUsers.push(u);
      }
    }
    
    if (toDelete.length > 0) {
      await usersCol.deleteMany({ _id: { $in: toDelete } });
      console.log(`Deleted ${toDelete.length} duplicate users.`);
    }
    
    // Reassign IDs
    const deptCounts = {};
    for (const u of uniqueUsers) {
      const dept = u.department || 'Other';
      const abbrev = dept.substring(0, 3).toUpperCase();
      if (!deptCounts[abbrev]) deptCounts[abbrev] = 0;
      deptCounts[abbrev]++;
      
      const newId = `CL${abbrev}${String(deptCounts[abbrev]).padStart(3, '0')}`;
      
      const oldId = u.id;
      if (oldId !== newId) {
        await usersCol.updateOne({ _id: u._id }, { $set: { id: newId } });
        // Update references
        await db.collection('leads').updateMany({ userId: oldId }, { $set: { userId: newId } });
        await db.collection('followups').updateMany({ userId: oldId }, { $set: { userId: newId } });
        await db.collection('attendance').updateMany({ userId: oldId }, { $set: { userId: newId } });
        await db.collection('emails').updateMany({ userId: oldId }, { $set: { userId: newId } });
        await db.collection('timesessions').updateMany({ userId: oldId }, { $set: { userId: newId } });
        console.log(`Updated user ${u.name}: ${oldId} -> ${newId}`);
      }
    }
    
    console.log('Database fixed successfully.');
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}
run();
