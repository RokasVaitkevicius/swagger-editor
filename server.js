require("dotenv").config()
const session = require("express-session")
const express = require("express")
const app = express()
const passport = require("passport")
const Auth0Strategy = require("passport-auth0")
const bodyParser = require("body-parser")
const fs = require("fs")
const AWS = require("aws-sdk")
const petstore = require("./petstore")
const PORT = process.env.PORT || 3000

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ID,
  secretAccessKey: process.env.AWS_SECRET
})

const sess = {
  secret: "RANDOM SECRETE",
  cookie: { secure: false },
  resave: false,
  saveUninitialized: false,
}

const strategy = new Auth0Strategy(
  {
    domain: process.env.AUTH0_DOMAIN,
    clientID: process.env.AUTH0_CLIENT_ID,
    clientSecret: process.env.AUTH0_CLIENT_SECRET,
    callbackURL:
      process.env.AUTH0_CALLBACK_URL || "http://localhost:3000/callback"
  },
  (accessToken, refreshToken, extraParams, profile, done) => done(null, profile)
)

const secured = () => (req, res, next) => {
  if (req.user) { return next() }
  req.session.returnTo = req.originalUrl
  res.redirect("/login")
}

app.use(session(sess))
app.use(bodyParser.text({ type: "text/plain" }))

passport.use(strategy)

app.use(passport.initialize())
app.use(passport.session())

passport.serializeUser((user, done) => {
  done(null, user)
})

passport.deserializeUser((user, done) => done(null, user))

app.get("/callback", (req, res, next) => {
  passport.authenticate("auth0", (err, user, info) => {
    if (err) { return next(err) }
    if (!user) { return res.redirect("/login") }
    req.logIn(user, function (err) {
      if (err) { return next(err) }
      const returnTo = req.session.returnTo
      delete req.session.returnTo
      res.redirect(returnTo || "/")
    })
  })(req, res, next)
})

app.get("/login", passport.authenticate("auth0", {
  scope: "openid email profile"
}),(req, res) => res.redirect("/swagger"))

app.get("/", secured(), (req, res) => {
  res.sendFile(__dirname + "/index.html")
})

app.get("/test", (req, res) => res.send("Server is running"))

app.post("/specs", secured(), (req, res) => {
  fs.writeFileSync(`${__dirname}/specs/${req.body}`, petstore)
  res.send("All good")
})

app.get("/specs", secured(), async (req, res) => {
  // const s3Files = await s3.listObjectsV2({Bucket: process.env.S3_BUCKET_NAME}).promise()
  // res.send(s3Files.Contents.map(f => f.Key))
  res.send(fs.readdirSync(`${__dirname}/specs`))
})

app.get("/specs/:file", (req, res) => {
  console.log(`${__dirname}/specs/${req.params.file}`)
  try {
    if (fs.existsSync(`${__dirname}/specs/${req.params.file}`)) {
      res.send(fs.readFileSync(`${__dirname}/specs/${req.params.file}`))
    }
  } catch(err) {
    fs.writeFileSync(`${__dirname}/specs/${req.params.file}`, petstore)
  }
})

app.put("/specs/:file", secured(), (req, res) => {
  fs.writeFileSync(`${__dirname}/specs/${req.params.file}`, req.body)

  console.log('PUT')

  res.send("All good")
})


app.delete("/specs/:file", secured(), (req, res) => {
  fs.unlinkSync(`${__dirname}/specs/${req.params.file}`)
  res.send("All good")
})

app.use(express.static(__dirname + "/."))

app.listen(PORT, () => {
    console.log(`Our app is running on port ${ PORT }`)
})
