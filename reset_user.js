const { MongoClient } = require('mongodb');

async function run() {
  const uri = "mongodb://DonyUser:Litera%402016@ac-4ndgql6-shard-00-00.ckemsuq.mongodb.net:27017,ac-4ndgql6-shard-00-01.ckemsuq.mongodb.net:27017,ac-4ndgql6-shard-00-02.ckemsuq.mongodb.net:27017/cluso?ssl=true&authSource=admin&retryWrites=true&w=majority&appName=Cluster0";
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('cluso');
    
    const email = "ahmadshajee0@gmail.com";

    // Find the user by email
    const user = await db.collection('users').findOne({ email: email });
    if (!user) {
      console.log(`User with email ${email} not found.`);
      return;
    }

    console.log(`Found user: ${user.name} (ID: ${user.id})`);

    // Delete verification record
    const deleteResult = await db.collection('digilocker_verifications').deleteOne({ userId: user.id });
    console.log(`Deleted verification records: ${deleteResult.deletedCount}`);

    // Unset verified flags
    const updateResult = await db.collection('users').updateOne(
      { id: user.id },
      { $unset: { digilockerVerified: "", digilockerVerifiedAt: "" } }
    );
    console.log(`Updated user document modified count: ${updateResult.modifiedCount}`);
    
    console.log("Reset complete!");

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.close();
  }
}

run();
