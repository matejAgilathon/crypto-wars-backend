import express from 'express'
import axios from 'axios'
import bcrypt from 'bcrypt'
import cors from 'cors'
import './db-connection.js'
import { Decimal128, MongoClient, ObjectId } from 'mongodb'
import 'dotenv/config'

const app = express()
const PORT = process.env.PORT || 5000
const client = new MongoClient(process.env.DB_CONNECT)

//Middleware
app.use(express.json())
app.use(
    cors({
        origin: 'http://localhost:3000',
    })
)
    
let collection
const mongoConnection = async (databaseName, collectionName) => {
    await client.connect()
    const db = client.db(databaseName)
    collection = db.collection(collectionName)
}
    
//Controllers
app.get('/', async (req, res) => {
    try {
        await mongoConnection('crypto', 'cryptos')
        // query for all the cryptos
        const query = {}
        const options = {
            // sort returned documents in ascending order by name (A->Z)
            sort: { name: 1 },
        }
        const cursor = collection.find(query, options)
        // print a message if no documents were found
        if ((await cursor.count()) === 0) {
            console.log('No documents found!')
        }
        // replace console.dir with your callback to access individual elements
        let list = []
        await cursor.forEach(el => {
            list.push(el)
        })
        res.json(list)
    } finally {
        // await client.close()
    }
})

setInterval(async () => {
    let CoinGeckoUri =
    'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin%2C%20ethereum%2C%20cardano%2C%20dogecoin%2C%20litecoin&order=market_cap_desc&per_page=100&page=1&sparkline=false&price_change_percentage=1h%2C24h%2C7d'
    try {
        let response = await axios.get(CoinGeckoUri)
        await mongoConnection('crypto', 'cryptos')
        await response.data.forEach(async (crypto) => {
            try {
                await collection.updateOne(
                    { id: crypto.id },
                    {
                        $set: {
                            symbol: crypto.symbol,
                            name: crypto.name,
                            image: crypto.image,
                            current_price: crypto.current_price,
                            high_24h: crypto.high_24h,
                            low_24h: crypto.low_24h,
                            price_change_24h: crypto.price_change_24h,
                            price_change_percentage_24h: crypto.price_change_percentage_24h,
                            last_updated: crypto.last_updated,
                        },
                    },
                    { upsert: true }
                )
            } catch (error) {
                console.log(error)
            } finally {
                // client.close()
            }
        })
    } catch (error) {
        console.log(error)
    } finally {
        // await client.close()
    }
}, 10000)


app.post('/user/register', async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10)
        // create a document to be inserted
        const user = {
            name: req.body.name,
            password: hashedPassword,
            email: req.body.email,
        }
        await mongoConnection('crypto', 'users')
        const result = await collection.updateOne(
            { name: user.name },
            {
                $set: {
                    password: hashedPassword,
                    email: user.email,
                    isLoggedIn: true,
                    wallet: {
                        balance: Decimal128.fromString('1000.00'),
                        portfolio: Decimal128.fromString('0.00'),
                        usd: Decimal128.fromString('1000.00'),
                        btc: Decimal128.fromString('0.00'),
                        eth: Decimal128.fromString('0.00'),
                        ada: Decimal128.fromString('0.00'),
                        doge: Decimal128.fromString('0.00'),
                        ltc: Decimal128.fromString('0.00')
                    }
                },
            },
            { upsert: true }
        )
        if (result.upsertedCount === 0) {
            res.json({ msg: 'User Already exists' })
        } else {
            const idString = result.upsertedId.toString()
            const newUser = await collection.findOne({_id: ObjectId(idString)})
            res.json({ msg: 'Welcome to crypto world!', redirect: '/user/profile', newUser })
            console.log(newUser)
        }
        console.log(result)
    } catch (error) {
        res.json({ msg: 'Server Error' })
        console.log(error)
    } finally {
        await client.close()
    }
})

app.post('/user/signin', async (req, res) => {
    try {
        await mongoConnection('crypto', 'users')
        // Query for a user that has the name of req.body.name
        const query = { name: req.body.name }
        const options = {
            // Include only the `name` and `password` fields in the returned document
            projection: { name: 1, isLoggedIn: 1, wallet: 1, password: 1 },
        }
        const user = await collection.findOne(query, options)
        console.log(user)
        // user validation logic with bcrypt
        if (!user) {
            res.status(400).json({ msg: 'User not found' })
        }
        try {
            if (await bcrypt.compare(req.body.password, user.password)) {
                res.json({ msg: 'Success', user:{name: user.name, isloggedIn: user.isLoggedIn, wallet: user.wallet}, redirect: '/user/profile' })
            } else {
                res.send({ msg: 'Not allowed' })
            }
        } catch (error) {
            res.status(500).json({ msg: 'An error occured, try again later' })
            console.log(error)
        }
    } catch (error) {
        res.status(500).json({ msg: 'An error occured, try again later' })
    } finally {
        await client.close()
    }
})

app.post('/user/tradeCrypto', (req, res) => {
    if (req.body.cryptoName === 'btc' && req.body.tradeType === 'buy' ) {
        try {
            (async() => {
                await mongoConnection('crypto', 'users')
                await collection.aggregate([ {$match: {name: req.body.userName}},
                    {$project: {wallet: 
                        {
                            balance: 1, 
                            portfolio: {$add: ['$wallet.portfolio', Decimal128.fromString(req.body.valueInDollars), '$wallet.eth', '$wallet.ada', '$wallet.ltc', '$wallet.doge']},
                            btc: {$add: ['$wallet.btc', Decimal128.fromString(req.body.valueInDollars)]},
                            usd: {$subtract: ['$wallet.usd', Decimal128.fromString(req.body.valueInDollars)]},
                            eth: 1,
                            ada: 1,
                            doge: 1,
                            ltc: 1,
                        }
                    }},
                    {$merge: 'users'}
                ]
                ).toArray()
                const user = await collection.findOne({name: req.body.userName})
                res.json({ msg: 'Success', user:{name: user.name, isloggedIn: user.isLoggedIn, wallet: user.wallet}})
            })()
        } catch (error) {
            console.log(error)
        }
    }
})

app.listen(PORT, () => console.log('app is listening on a port 5000'))
