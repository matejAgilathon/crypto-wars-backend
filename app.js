import express from 'express'
import axios from 'axios'
import bcrypt from 'bcrypt'
import './db-connection.js'

const app = express()
const PORT = process.env.PORT || 5000


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

const users = []

app.post('/register', async (req, res) => {
    const hashedPassword = await bcrypt.hash(req.body.password, 10)
    const user = { name : req.body.name, password: hashedPassword }
    users.push(user)
    console.log(users)
})
app.post('/user/register', async (req, res) => {
    const hashedPassword = await bcrypt.hash(req.body.password, 10)
    const user = { name : req.body.name, password: hashedPassword }
    users.push(user)
    console.log(users)
})
app.post('/user/signin', async (req, res) => {
    const hashedPassword = await bcrypt.hash(req.body.password, 10)
    const user = { name : req.body.name, password: hashedPassword }
    users.push(user)
    console.log(users)
})


app.listen(PORT, () => console.log('app is listening on a port 3000'))
