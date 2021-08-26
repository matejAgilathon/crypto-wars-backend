import jwt from 'jsonwebtoken'

const checkAuth =  (req, res, next) => {
    try {
        console.log('headers',req.headers.authorization)
        console.log('body',req.body)
        const token = req.headers.authorization.split(' ')[1]
        const decode = jwt.verify(token, 'lozincica123')
        req.decodedData = decode
        next()
    } catch (error) {
        return res.status(401).json({
            msg: 'Authentification failed'
        })
    }
}

export default checkAuth