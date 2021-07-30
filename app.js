import express from 'express'
import axios from 'axios'
import bcrypt from 'bcrypt'
import './db-connection.js'
import { MongoClient } from 'mongodb'
import 'dotenv/config'

const app = express()
const PORT = process.env.PORT || 5000
const client = new MongoClient(process.env.DB_CONNECT)

//Middleware
app.use(express.json())

//Controllers
app.get('/', async (req, res) => {
    let CoinGeckoUri = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin%2C%20ethereum%2C%20cardano%2C%20dogecoin%2C%20litecoin&order=market_cap_desc&per_page=100&page=1&sparkline=false&price_change_percentage=1h%2C24h%2C7d'
    try {
        const response = await axios.get(CoinGeckoUri)
        res.json(response.data)
    } catch (error) {
        console.log(error)
        res.status(500).json({msg: "An error occured, try again later"})
    }
})

app.post('/user/register', async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10)
        // create a document to be inserted
        const user = { name: req.body.name, password: hashedPassword }
        await client.connect();
        const db = client.db("crypto");
        const collection = db.collection("users");
        const result = await collection.updateOne({name: user.name},{$set:{password: hashedPassword}}, {upsert: true});
        
        if (result.upsertedCount === 0) {
            res.json({msg: 'User Already exists'})
        } else {
            res.json({msg: 'Welcome to crypto world!'})
        }
        console.log(result)
    } catch (error) {
        res.json({msg: "Server Error"})
        console.log(error)
    } finally {
        await client.close();
    }
})

app.post('/user/signin', async (req, res) => {
    const user = users.find(user => user.name === req.body.name)
    if (!user) {
        res.status(400).send("User not found")
    }
    try {
        if(await bcrypt.compare(req.body.password, user.password)) {
            res.send("Success")
        } else {
            res.send("Not allowed")
        }
    } catch (error) {
        res.status(500).json({msg: "An error occured, try again later"})
    }
})


app.listen(PORT, () => console.log('app is listening on a port 3000'))