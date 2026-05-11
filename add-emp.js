const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const fs = require('fs');

const envFile = fs.readFileSync('./.env', 'utf-8');
let MONGODB_URI = '';
for (const line of envFile.split(/\r?\n/)) {
  if (line.startsWith('MONGODB_URI=')) {
    MONGODB_URI = line.substring('MONGODB_URI='.length).trim();
    break;
  }
}

async function addEmp() {
  const uri = MONGODB_URI;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('cluso');
    
    const hashedPassword = await bcrypt.hash('customer123', 10);
    
    const user = {
      id: "CLSAL999",
      name: "Customer Test",
      email: "customer@test.com",
      password: hashedPassword,
      role: "Employee",
      department: "Sales",
      designation: "Customer Testing",
      phone: "1234567890",
      status: "active",
      theme: "system",
      joinedAt: new Date().toISOString(),
    };
    
    // Check if user already exists
    const existing = await db.collection('users').findOne({ email: user.email });
    if (existing) {
      console.log('User already exists. Updating...');
      await db.collection('users').updateOne({ email: user.email }, { $set: user });
    } else {
      await db.collection('users').insertOne(user);
      console.log('User created successfully');
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
  }
}

addEmp();
