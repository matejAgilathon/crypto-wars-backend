import { createTransport } from 'nodemailer'
import hbs from 'nodemailer-express-handlebars'



const Mailer = ( customTemplate, userEmail, balanceOfCryptos ) => {
    var transporter = createTransport({
        service: 'gmail',
        auth: {
            user: 'matej.pavic92@gmail.com',
            pass: 'nwqncqxlfovgkopw'
        }
    })

    transporter.use('compile',hbs({
        viewEngine:{
            partialsDir:'template path',
            defaultLayout:''
        },
        viewPath:'./views',
        extName:'.handlebars'
    })
    )
    
    var mailOptions = {
        from: 'matej.pavic92@gmail.com',
        to: userEmail,
        subject: 'Sending Email using Node.js',
        template: `${customTemplate}`,
        context: {
            btc: `${balanceOfCryptos.balanceOfBtc}`,
            eth: `${balanceOfCryptos.balanceOfEth}`,
            ada: `${balanceOfCryptos.balanceOfAda}`,
            doge: `${balanceOfCryptos.balanceOfDoge}`,
            ltc: `${balanceOfCryptos.balanceOfLtc}`
        }
    }
    
    transporter.sendMail(mailOptions, function(error, info){
        if (error) {
            console.log(error)
        } else {
            console.log('Email sent: ' + info.response)
        }
    })
}

export default Mailer