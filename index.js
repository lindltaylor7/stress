const express = require('express')
const axios = require("axios")
const dotenv = require("dotenv")
const Tesseract = require('tesseract.js')
const Sentiment = require('sentiment')
const { generateRequestUrl, normaliseResponse } = require('google-translate-api-browser')
const https = require('https')
const fs = require('fs')
const db = require('./db')

dotenv.config();

const app = express()
const PORT = process.env.port || 3000
const facebookGraphUrl = "https://graph.facebook.com"




app.get('/', (req, res) => {
    res.sendFile('index.html', {
        root: __dirname
    })
})



app.get('/tesseract', (req, res) => {
    Tesseract.recognize(
        'https://scontent.fjau1-1.fna.fbcdn.net/v/t39.30808-6/332270143_683491700221876_2955934829591737402_n.jpg?stp=dst-jpg_p720x720&_nc_cat=102&ccb=1-7&_nc_sid=730e14&_nc_eui2=AeFZQyaRBF3W2VQSWqfIixN9dasL3rEb26p1qwvesRvbqtE34YAe_41mEiTR8JY9xgBftK2A85AYUiKi0d8Z8HrS&_nc_ohc=_Qb4Dleg7t0AX-_Ki_B&_nc_ht=scontent.fjau1-1.fna&edm=ACwmWnUEAAAA&oh=00_AfCtCUrdCFAwH1k4su6Ech_SaB-O9AZVEE4HGdzBRP2CVA&oe=64315DC5',
        'eng', //spa:Español
        { logger: m => console.log(m) }
      ).then(({ data: { text } }) => {
        res.send(text)
        console.log(text);
      })
})

app.get('/translate', (req, res) => {
    const url = generateRequestUrl('Cada día trae nuevas oportunidades para alcanzar tus sueños', { to: "en" })
    https.get(url, (resp) => {
        let data = '';
      
        resp.on('data', (chunk) => {
          data += chunk;
        });
      
        resp.on('end', () => {
          console.log(normaliseResponse(JSON.parse(data)));
          res.send(normaliseResponse(JSON.parse(data)))
        });
      }).on("error", (err) => {
        console.log("Error: " + err.message);
      })
})

app.get('/sentiment', (req, res) => {
    var sentiment = new Sentiment()

    const texts = [
        "I am grateful"
    ]

    const scores = texts.map(text => sentiment.analyze(text).score)

    const totalScore = scores.reduce((acc, cur) => acc + cur, 0)

    const stressParameter = totalScore
    
    res.send(`El usuario tiene un indicador de estres de: ${stressParameter}`)
})

app.get('/meaningCloud', (req, res) => {
    const formdata = new FormData();
    formdata.append("key", "8b6538d2a4c36a913a99ff41ec10f998");
    formdata.append("txt", "Cada día trae nuevas oportunidades para alcanzar tus sueños.");
    formdata.append("lang", "es");  // 2-letter code, like en es fr ...

    const requestOptions = {
    method: 'POST',
    body: formdata,
    redirect: 'follow'
    };

    const response = fetch("https://api.meaningcloud.com/sentiment-2.1", requestOptions)
    .then(response => ({
        status: response.status, 
        body: response.json()
    }))
    .then(({ status, body }) => {
        console.log(status, body)
        res.send(body)
    })
    .catch(error => console.log('error', error));
})

app.get("/login", (req, res) => {
    const clientId = process.env.FACEBOOK_APP_ID
    const redirectUri = encodeURIComponent(process.env.FACEBOOK_REDIRECT_URI)
    const scope = "user_birthday,user_likes,user_photos,user_friends,user_posts,email,public_profile,user_gender"
    const authUrl = `https://www.facebook.com/v16.0/dialog/oauth?response_type=token&display=popup&client_id=${clientId}&redirect_uri=${redirectUri}&auth_type=rerequest&scope=${scope}`
    res.redirect(authUrl)

    console.log(req.query)
 
  /* fs.writeFileSync('accessToken.txt', req.query.access_token)
  const data = `access_token=${req.query.access_token}&expires_in=${req.query.expires_in}&data_access_expiration_time=${req.query.data_access_expiration_time}&long_lived_token=${req.query.long_lived_token}`

  fs.writeFileSync('accessToken.txt', data)

  const now = new Date();
const filename = `accessToken_${now.getTime()}.txt`;
fs.writeFileSync(filename, data); */
  })

  app.get("/callback", async (req, res) => {
    var tokenUser = ''

    db.execute('SELECT * FROM users').then(([data, fields])=>{
      console.log(data)
      tokenUser = data[0].token
    })
    .catch(err =>{
      console.loge(err)
    })


    const code = req.query.code
    const clientId = process.env.FACEBOOK_APP_ID
    const clientSecret = process.env.FACEBOOK_APP_SECRET
    const redirectUri = encodeURIComponent(process.env.FACEBOOK_REDIRECT_URI)
  
    try {
      console.log('llamando al graph', tokenUser)
      const accessTokenResponse = await axios.get(`https://graph.facebook.com/v16.0/me/posts?fields=description%2Ccaption%2Cfull_picture&access_token=EAACrfYRFXBkBAGsXEbAlfhbZBXMBjpffbr6VSOZAwURSZCAgShcUha4NvJccYAgIZB6QujDbJYz6D0jzTejhjrLFhV29mgjLYf83QZArwlAiZASFfa3kqUZCexIq25n0fXemRRwHgX7fETs4k5DCZAmZAA6Cm9cFgZB0KZBgmgg47NxgPyXLe6ZCHLsHLGskpH8kbu2ahyBZCayj7UQdYB7c3GC6lWevrwrsMr7hCYUrlVfPuPIHOPuHyL6Nm`)
      .then((response)=>{
        console.log(response.data)
        res.json(response.data)
      })
  
      /* const accessToken = accessTokenResponse.data.access_token; */

  
      /* const postsResponse = await axios.get(`${facebookGraphUrl}/me`);
  
      const posts = postsResponse.data.data
  
      res.json({ posts: posts }) */
    } catch (error) {
      console.error(error.response.data)
      res.status(500).send("Error al obtener los posts del usuario.")
    }
  })
  
  app.listen(PORT, () => {
    console.log(`Aplicación escuchando en el puerto ${PORT}`)
  })