const express = require('express')
const router = express.Router()

router.get('/', (req, res) =>{
    res.send('Hola mundo')
})

router.get('/post', (req, res) =>{
    res.send('Pag de posts')
})

module.exports = router