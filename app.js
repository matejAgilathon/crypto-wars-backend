import express from 'express'
import axios from 'axios'
import bcrypt from 'bcrypt'
import cors from 'cors'
import './db-connection.js'
import { Decimal128, MongoClient, ObjectId } from 'mongodb'
import 'dotenv/config'
import jwt from 'jsonwebtoken'
import Mailer from './mailer.js'
import checkAuth from './check-auth.js'

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
        Mailer('validation', req.body.email, null)
        await mongoConnection('crypto', 'users')
        const result = await collection.updateOne(
            { name: user.name },
            {
                $set: {
                    password: hashedPassword,
                    email: user.email,
                    isLoggedIn: true,
                    wallet: {
                        usd: Decimal128.fromString('1000.00'),
                        btc: Decimal128.fromString('0.00'),
                        eth: Decimal128.fromString('0.00'),
                        ada: Decimal128.fromString('0.00'),
                        doge: Decimal128.fromString('0.00'),
                        ltc: Decimal128.fromString('0.00'),
                        btcInDollars: Decimal128.fromString('0.00'),
                        ethInDollars: Decimal128.fromString('0.00'),
                        adaInDollars: Decimal128.fromString('0.00'),
                        dogeInDollars: Decimal128.fromString('0.00'),
                        ltcInDollars: Decimal128.fromString('0.00')
                    },
                    btcRef: ObjectId('61094259ddaf80e6dadc0f02'),
                    ethRef: ObjectId('61094259ddaf80e6dadc0f03'),
                    adaRef: ObjectId('61094259ddaf80e6dadc0f04'),
                    dogeRef: ObjectId('61094259ddaf80e6dadc0f05'),
                    ltcRef: ObjectId('61094259ddaf80e6dadc0f06')
                },
            },
            { upsert: true }
        )
        if (result.upsertedCount === 0) {
            res.json({ msg: 'User Already exists' })
        } else {
            const idString = result.upsertedId.toString()
            const newUser = await collection.findOne({_id: ObjectId(idString)})
            const token = jwt.sign(
                {
                    _id: newUser._id,
                    email: newUser.email
                },
                'lozincica123',
                {
                    expiresIn: '1h'
                }
            )

            res.json({ msg: 'Welcome to crypto world!', redirect: '/user/profile', newUser:{token, name: newUser.name, isloggedIn: newUser.isLoggedIn, wallet: newUser.wallet, notificationTime: newUser.notificationTime} })
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
            projection: { _id: 1, name: 1, isLoggedIn: 1, wallet: 1, password: 1, notificationTime: 1, email:1 },
        }
        const user = await collection.findOne(query, options)
        console.log(user)
        const token = jwt.sign(
            {
                _id: user._id,
                email: user.email
            },
            'lozincica123',
            {
                expiresIn: '1h'
            }
        )
        // user validation logic with bcrypt
        if (!user) {
            res.status(400).json({ msg: 'User not found' })
        }
        try {
            if (await bcrypt.compare(req.body.password, user.password)) {
                res.json({ msg: 'Success', user:{token, name: user.name, isloggedIn: user.isLoggedIn, wallet: user.wallet, notificationTime: user.notificationTime}, redirect: '/user/profile' })
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

app.get('/user/validate/:email', (req, res) => {
    try {
        (async() => {
            await mongoConnection('crypto', 'users')
            const result = await collection.updateOne({email: req.params.email}, {$set: {emailValidated: true}})
            result.matchedCount ? res.json({msg: 'User\'s  email successfuly validated'}).status(301).redirect('http://localhost:3000') : res.json({msg: 'User does not exist'})
            console.log(result)
        })()
    } catch (error) {
        console.log('Error while validating email')
    }
})

app.post('/user/tradeCrypto', checkAuth, (req, res) => {
    try {
        (async() => {
            await mongoConnection('crypto', 'users')
            if (req.body.tradeType === 'buy' ) {
                let coin = req.body.cryptoName
                await collection.aggregate([ {$match: {name: req.body.userName}},
                    {
                        $lookup:
                        {
                            from: 'cryptos',
                            localField: `${coin}Ref`,
                            foreignField: '_id',
                            as: `${coin}Data`
                        }
                    },
                    { $unwind: `$${coin}Data`},
                    {$set: {wallet: 
                        {
                            [coin]: {$add: [`$wallet.${coin}`, {$divide:  [Decimal128.fromString(req.body.valueInDollars), `$${coin}Data.current_price`]} ]},
                            usd: {$subtract: ['$wallet.usd', Decimal128.fromString(req.body.valueInDollars)]},
                            [`${coin}InDollars`]: {$add: [ `$wallet.${coin}InDollars`, Decimal128.fromString(req.body.valueInDollars)]}
                        }
                    }},
                    {$set: {wallet: 
                        {
                            portfolio: {$add: ['$wallet.btcInDollars', '$wallet.ethInDollars', '$wallet.adaInDollars', '$wallet.ltcInDollars', '$wallet.dogeInDollars']}
                        }
                    }},
                    {$merge: 'users'}
                ]
                ).toArray()
            } else if (req.body.tradeType === 'sell' ) {
                let coin = req.body.cryptoName
                await collection.aggregate([ {$match: {name: req.body.userName}},
                    {
                        $lookup:
                        {
                            from: 'cryptos',
                            localField: `${coin}Ref`,
                            foreignField: '_id',
                            as: `${coin}Data`
                        }
                    },
                    { $unwind: `$${coin}Data`},
                    {$set: {wallet: 
                        {
                            [coin]: {$subtract: [`$wallet.${coin}`, {$divide:  [Decimal128.fromString(req.body.valueInDollars), `$${coin}Data.current_price`]} ]},
                            usd: {$add: ['$wallet.usd', Decimal128.fromString(req.body.valueInDollars)]},
                            [`${coin}InDollars`]: {$subtract: [ `$wallet.${coin}InDollars`, Decimal128.fromString(req.body.valueInDollars)]}
                        }
                    }},
                    {$merge: 'users'}
                ]
                ).toArray()
            }
            const user = await collection.findOne({name: req.body.userName})
            res.json({ msg: 'Success', user:{name: user.name, isloggedIn: user.isLoggedIn, wallet: user.wallet, notificationTime: user.notificationTime, token:req.headers.authorization.split(' ')[1] }})
        })()
    } catch (error) {
        console.log(error)
    }
})

app.post('/user/notification', (req, res) => {
    try {
        (async() => {
            await mongoConnection('crypto', 'users')
            await collection.updateOne({name: req.body.name}, {$set: {notificationTime: [req.body.hours, req.body.minutes]}})
            res.json({msg: 'Notification time successfully set!'})
        })()
        console.log(req.body)
    } catch (error) {
        console.log(error)
    } finally {
        // client.close()
    }    
})

//  intervals for nodemailer
setInterval(async function(){ // Set interval for checking
    await mongoConnection('crypto', 'cryptos')
    const btcPriceInDollars = await collection.find({symbol: 'btc'}).project({current_price: 1}).toArray()
    const ethPriceInDollars = await collection.find({symbol: 'eth'}).project({current_price: 1}).toArray()
    const adaPriceInDollars = await collection.find({symbol: 'ada'}).project({current_price: 1}).toArray()
    const dogePriceInDollars = await collection.find({symbol: 'doge'}).project({current_price: 1}).toArray()
    const ltcPriceInDollars = await collection.find({symbol: 'ltc'}).project({current_price: 1}).toArray()
    await mongoConnection('crypto', 'users')
    const result = await collection.aggregate([
        {
            $match: { notificationTime: {$exists: true} }
        },
        {
            $project: { _id: 0, email: 1, notificationTime: 1, wallet: 1, emailValidated: 1 }
        }
    ]).toArray()
    var date = new Date() // Create a Date object to find out what time it is
    result.forEach(user => {
        if (user.notificationTime && user.emailValidated) {
            if(date.getHours() === Number(user.notificationTime[0]) && date.getMinutes() === Number(user.notificationTime[1])){ // Check the time
                // Do stuff
                const balanceOfBtc = (parseFloat(user.wallet.btc).toFixed(8) * btcPriceInDollars[0].current_price).toFixed(2)
                const balanceOfEth = (parseFloat(user.wallet.eth).toFixed(8) * ethPriceInDollars[0].current_price).toFixed(2)
                const balanceOfAda = (parseFloat(user.wallet.ada).toFixed(8) * adaPriceInDollars[0].current_price).toFixed(2)
                const balanceOfDoge = (parseFloat(user.wallet.doge).toFixed(8) * dogePriceInDollars[0].current_price).toFixed(2)
                const balanceOfLtc = (parseFloat(user.wallet.ltc).toFixed(8) * ltcPriceInDollars[0].current_price).toFixed(2)

                const balanceOfCryptos = {
                    balanceOfBtc: balanceOfBtc,
                    balanceOfEth: balanceOfEth,
                    balanceOfAda: balanceOfAda,
                    balanceOfDoge: balanceOfDoge,
                    balanceOfLtc: balanceOfLtc
                }
                //send mails
                const userEmail = user.email
                Mailer('cryptos', userEmail, balanceOfCryptos)
            }
        }
    })
}, 60000) // Repeat every 60000 milliseconds (1 minute)

app.listen(PORT, () => console.log('app is listening on a port 5000'))
