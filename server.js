require("dotenv").config()
var session = require("express-session")
const express = require("express")
const app = express()
var passport = require("passport")
var Auth0Strategy = require("passport-auth0")
const PORT = process.env.PORT || 3000

var sess = {
  secret: "RANDOM SECRETE",
  cookie: { secure: false },
  resave: false,
  saveUninitialized: false,
}

var strategy = new Auth0Strategy(
  {
    domain: process.env.AUTH0_DOMAIN,
    clientID: process.env.AUTH0_CLIENT_ID,
    clientSecret: process.env.AUTH0_CLIENT_SECRET,
    callbackURL:
      process.env.AUTH0_CALLBACK_URL || "http://localhost:3000/callback"
  },
  function (accessToken, refreshToken, extraParams, profile, done) {
    return done(null, profile)
  }
)

app.use(session(sess))

passport.use(strategy)

app.use(passport.initialize())
app.use(passport.session())

passport.serializeUser((user, done) => {
  done(null, user)
})

passport.deserializeUser((user, done) => {
  done(null, user)
})

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
}),(req, res) => {
  res.redirect("/swagger")
})

app.get("/", (req, res, next)=> {
  if (req.user) { return next() }
  req.session.returnTo = req.originalUrl
  res.redirect("/login")
}, (req, res) => {
  res.sendFile(__dirname + "/index.html")
})

app.get("/test", (req, res) => {
  res.send("Server is running")
})

app.use(express.static(__dirname + "/."))

app.listen(PORT, () => {
    console.log(`Our app is running on port ${ PORT }`)
})
