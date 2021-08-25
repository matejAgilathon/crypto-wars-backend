import 'dotenv/config'

import { MongoClient } from 'mongodb'
// Connection URI

const uri = decodeURI(encodeURI(process.env.DB_CONNECT))
// Create a new MongoClient
const client = new MongoClient(uri)

async function run() {
    try {
    // Connect the client to the server
        await client.connect()
        // Establish and verify connection
        await client.db('crypto').command({ ping: 1 })
        console.log('Connected successfully to server')
    }catch(error) {
        console.log(error)
    } finally {
    // Ensures that the client will close when you finish/error
        await client.close()
    }
}

run().catch(console.dir)