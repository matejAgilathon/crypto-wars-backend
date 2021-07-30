import 'dotenv/config'

import { MongoClient } from "mongodb";
// Connection URI
const uri = process.env.DB_CONNECT;
// Create a new MongoClient
const client = new MongoClient(uri);
let db
async function run() {
  try {
    // Connect the client to the server
    await client.connect();
    // Establish and verify connection
    db = await client.db("crypto").command({ ping: 1 });
    console.log("Connected successfully to server");
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}

run().catch(console.dir);