const express = require('express')
const { createServer } = require('http')
const { parse } = require('url')
const { createReadStream } = require('fs')
const vite = require('vite')

const app = express()
const isProduction = process.env.NODE_ENV === 'production'

async function createViteServer() {
  const server = await vite.createServer({
    server: {
      middlewareMode: true
    }
  })

  return server
}

app.use(express.static('public'))

app.get('*', async (req, res) => {
  try {
    const viteServer = await createViteServer()

    const parsedUrl = parse(req.url, true)
    const pathname = parsedUrl.pathname

    if (!isProduction) {
      await viteServer.ssrLoadModule('/src/main.js')
    }

    if (pathname === '/') {
      const template = `
        <html>
          <head>
            <title>Vue 3 App</title>
          </head>
          <body>
            <div id="app"></div>
            <script type="module" src="/src/main.js"></script>
          </body>
        </html>
      `

      const { render } = await viteServer.ssr(template, '/src/main.js')
      res.setHeader('Content-Type', 'text/html')
      res.status(200).end(render)
    } else {
      const filePath = `.${pathname}`
      createReadStream(filePath).pipe(res)
    }

    viteServer.close()

  } catch (e) {
    console.log(e)
    res.status(500).end(e.message)
  }
})

app.listen(3000)

console.log('Server running at http://localhost:3000')
