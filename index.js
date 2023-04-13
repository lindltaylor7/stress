const express = require('express')
const bodyParser = require('body-parser');
const url = require('url');
const axios = require("axios")
const passport = require('passport')
const FacebookStrategy = require('passport-facebook').Strategy
const dotenv = require("dotenv")
const Tesseract = require('tesseract.js')
const Sentiment = require('sentiment')
const { generateRequestUrl, normaliseResponse } = require('google-translate-api-browser')
const https = require('https')
const fs = require('fs')
const db = require('./db');
const { request } = require('http');

dotenv.config();

const app = express()
const PORT = process.env.port || 3000
const facebookGraphUrl = "https://graph.facebook.com"

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))


app.get('/', (req, res) => {
  res.sendFile('index.html', {
      root: __dirname
  })
})

passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_APP_ID,
  clientSecret: process.env.FACEBOOK_APP_SECRET,
  callbackURL: "http://localhost:3000/auth/facebook/callback"
},
function(accessToken, refreshToken, profile, cb) {
  console.log('insert data user in bd')
  db.execute('INSERT INTO users(name, token, fb_id)  VALUES (?, ?, ?)',
  [profile.displayName,accessToken,profile.id])
  .then(res =>{
    return cb(null, false, res)
  })
}
))

app.get('/auth/facebook',
  passport.authenticate('facebook',{ scope: ['public_profile', 'user_posts'] }))

app.get('/auth/facebook/callback', passport.authenticate('facebook', { failureRedirect: '/getPosts' }))

  app.get('/success', (req, res) => {
    res.send('<a href="/getPosts">Continuar</a>')
  })

  app.get('/errorAuth', (req, res) => {
    res.send('Continuar <a href="/getPosts">Seguir</a>')
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

app.get('/meaningCloud', async (req, res) => {
  const formdata = new FormData();
  formdata.append("key", "8b6538d2a4c36a913a99ff41ec10f998");
  formdata.append("txt", "Cada día trae nuevas oportunidades para alcanzar tus sueños.");
  formdata.append("lang", "es");  // 2-letter code, like en es fr ...

  const requestOptions = {
    method: 'POST',
    body: formdata,
    redirect: 'follow'
  };

  try {
    const response = await fetch("https://api.meaningcloud.com/sentiment-2.1", requestOptions);
    const data = await response.json();
    console.log(data);
    res.send(data);
  } catch (error) {
    console.log('error', error);
    res.status(500).send('Error al obtener datos de MeaningCloud');
  }
});

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

  app.get('/users/:username', (req, res) => {
    const parsedUrl = url.parse(req.url, true)
    res.send(req.url)
  })

  app.get("/callback", async (req, res) => {
    const parsedUrl = url.parse(req.url, true)
    const hash = parsedUrl.hash
    //const accessToken = parsedUrl.hash.replace('#access_token=', '')
    console.log(hash)  
    /* console.log('recibiendo token oauth',req.query)
    const code = req.query.access_token
    const clientId = process.env.FACEBOOK_APP_ID
    const clientSecret = process.env.FACEBOOK_APP_SECRET
    const redirectUri = encodeURIComponent(process.env.FACEBOOK_REDIRECT_URI) */
  
    /* try {
      console.log('llamando al graph', code)
      const accessTokenResponse = await axios.get(`https://graph.facebook.com/v16.0/me/posts?fields=description%2Ccaption%2Cfull_picture&access_token=${code}`)
      .then((response)=>{
        console.log(response.data)
        res.json(response.data)
      })

      const accessToken = accessTokenResponse.data.access_token; 
  
      const postsResponse = await axios.get(`${facebookGraphUrl}/me`);
  
      const posts = postsResponse.data.data
  
      res.json({ posts: posts }) 
    } catch (error) {
      console.error(error)
      res.status(500).send("Error al obtener los posts del usuario.")
    } */
  })

  async function meaningCloudProcess(texts){

    const sentimentResults = []

      for(const text of texts){
        const formdata = new FormData();
      formdata.append("key", "8b6538d2a4c36a913a99ff41ec10f998");
      formdata.append("txt", text);
      formdata.append("lang", "es");  // 2-letter code, like en es fr ...
    
      const requestOptions = {
        method: 'POST',
        body: formdata,
        redirect: 'follow'
      };
    
      try {
        const response = await fetch("https://api.meaningcloud.com/sentiment-2.1", requestOptions);
        const data = await response.json();
        console.log(data.score_tag);
        sentimentResults.push(data)
        
      } catch (error) {
        console.log('error', error);
       
      }
    }

    return sentimentResults
    
  }

  async function processPictures(pictures){
    const texts = []
    for (const picture of pictures) {
      const { data: { text } } = await Tesseract.recognize(picture, 'spa')
      texts.push(text)
    }
    return texts
  }

  async function processSentiment(texts){
    var sentiment = new Sentiment()

    const scores = texts.map(text => sentiment.analyze(text).score)

    const totalScore = scores.reduce((acc, cur) => acc + cur, 0)

    const stressParameter = totalScore/texts.length
    
    return stressParameter
  }

  function sixMonthsago(date){
    
  }

  app.get('/getPosts', async(req, res) => {
    try{
      const [data, fields] = await db.query('SELECT * FROM users ORDER BY id DESC LIMIT 1')
      const code = data[0].token
      //Pedimos el ultimo post que se publicó
      const response = await axios.get(`https://graph.facebook.com/v16.0/me/posts?fields=created_time%2Cdescription%2Ccaption%2Cfull_picture&access_token=${code}&limit=1`)
      const lastPost = response.data.data
      const fechaISO = lastPost[0].created_time
      const fechaObj = new Date(fechaISO);
      fechaObj.setMonth(fechaObj.getMonth() - 6);
      const anio = fechaObj.getFullYear();
      const mes = ('0' + (fechaObj.getMonth() + 1)).slice(-2); // agregar cero al mes si es necesario y obtener solo los últimos dos dígitos
      const dia = ('0' + fechaObj.getDate()).slice(-2); // agregar cero al día si es necesario y obtener solo los últimos dos dígitos
      const fechaDesde = anio + '-' + mes + '-' + dia;

      const response2 = await axios.get(`https://graph.facebook.com/v16.0/me/posts?fields=created_time%2Cdescription%2Ccaption%2Cfull_picture&access_token=${code}&since=${fechaDesde}`)
      
      const datePosts = response2.data.data
      const pictures = datePosts.filter(post => post.full_picture != null).map(post => post.full_picture)
      const texts = await processPictures(pictures)
      
      const meaningcloud = await meaningCloudProcess(texts)


      res.send(`El análisis de imágenes arroja las siguientes polaridades ${meaningcloud}`)
    }catch (error){
      console.log(error.response)
      res.status(500).send('Error al procesar las imágenes')
    }
  })
  
  app.listen(PORT, () => {
    console.log(`Aplicación escuchando en el puerto ${PORT}`)
  })