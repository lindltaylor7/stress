const express = require('express')
const axios = require("axios")
const dotenv = require("dotenv")
const Tesseract = require('tesseract.js')
const Sentiment = require('sentiment')
const { generateRequestUrl, normaliseResponse } = require('google-translate-api-browser')
const https = require('https')

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
        'https://www.clara.es/medio/2023/03/24/frases-bonitas-cortas-b_b9053f1e_230324150612_800x800.jpg',
        'spa',
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
        "I am grateful with God"
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
    const scope = "pages_show_list,instagram_basic"
    const authUrl = `https://www.facebook.com/v16.0/dialog/oauth?response_type=token&display=popup&client_id=${clientId}&redirect_uri=${redirectUri}&auth_type=rerequest&scope=${scope}`
    res.redirect(authUrl)
  })

  app.get("/callback", async (req, res) => {
    const code = req.query.code
    const clientId = process.env.FACEBOOK_APP_ID
    const clientSecret = process.env.FACEBOOK_APP_SECRET
    const redirectUri = encodeURIComponent(process.env.FACEBOOK_REDIRECT_URI)
  
    try {
      const accessTokenResponse = await axios.get(`https://graph.facebook.com/100012246961317?metadata=1&access_token=${code}`)
  
      const accessToken = accessTokenResponse.data.access_token;
  
      const postsResponse = await axios.get(`${facebookGraphUrl}/me`);
  
      const posts = postsResponse.data.data
  
      res.json({ posts: posts })
    } catch (error) {
      console.error(error.response.data)
      res.status(500).send("Error al obtener los posts del usuario.")
    }
  })
  
  app.listen(PORT, () => {
    console.log(`Aplicación escuchando en el puerto ${PORT}`)
  })