//jshint esversion:6
const express = require("express");
const bodyParser = require("body-parser");
require('dotenv').config()
const mongoose = require("mongoose");
const _ = require("lodash");
// const encrypt = require('mongoose-encryption');
const session = require('express-session')
const findOrCreate = require('mongoose-findorcreate')
const passport = require('passport');
const passportlocalmongoose = require('passport-local-mongoose');
const path = require('path');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
// console.log(process.env.SECRET);
// const md5 = require('md5');
// const bcrypt = require('bcrypt');
// const saltRounds = 10;

const app = express();
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

app.set('view engine', 'ejs');
// app.set('views', path.join(__dirname, 'views'));
// app.set('secrets', path.join(__dirname, '/secrets'))
app.use(session({
  secret:"ourlittlesecret",
  resave:false,
  saveUninitialized:false
}))
app.use(passport.initialize())
app.use(passport.session())
mongoose.connect("mongodb://localhost:27017/userdb")
const userschema =new mongoose.Schema ({
  username:String,
  password:String,
  googleId:String,
  secret:String
})
userschema.plugin(passportlocalmongoose)
userschema.plugin(findOrCreate)
// userschema.plugin(encrypt, { secret: process.env.SECRET , encryptedFields: ['password']})
const User = new mongoose.model("user",userschema)
passport.use(User.createStrategy());
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    // userProfileUrl: "https://googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.displayName }, function (err, user) {
      console.log(profile);
      return cb(err, user);

    });
  }
));
app.get("/",function(req,res){
  res.render("home")
})
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));
app.get('/auth/google/secrets',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });
app.get("/login",function(req,res){
  res.render("login")
})
app.get("/secrets",function(req,res){
  if(req.isAuthenticated()){
    User.find({secret:{$ne:null}},function(err,found){
      if(err){
        console.log(err);
      }else{
        console.log(found);
        res.render("secrets",{usersecrets:found})
      }
    })
    // res.render("secrets")
  }else{
    res.redirect("/login")
  }
})
app.get("/register",function(req,res){
  res.render("register")
})

app.post("/register",function(req,res){
  User.register({username:req.body.username},req.body.password,function(err,user){
    if(err){
      console.log(err);
      res.redirect("/")
    }else{
      passport.authenticate("local")(req,res,function(){
        res.redirect("secrets")
      })
    }
  })

  // bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
    // const newuser = new User ({
    //   email:req.body.username,
    //   password:req.body.password
    // })
    // newuser.save(function(err){
    //   if(err){
    //     res.render(err)
    //   }else{
    //     res.render("secrets")
    //   }
    // })
    // Store hash in your password DB.
});
app.get("/submit",function(req,res){
  if(req.isAuthenticated()){
    res.render("submit")
  }else{
    res.redirect("/login")
  }
  app.post("/submit",function(req,res){
    const submittedsecret =req.body.secret
    console.log(req.user.username);
    User.findOne({username:req.user.username},function(err,found){
      if(err){
        console.log(err);
      }else{
        // console.log(found,submittedsecret);

        found.secret = submittedsecret
        found.save()
        res.redirect("/secrets")
      }
    })
  })

})

app.post("/login",function(req,res){
  const newuser = new User({
    email:req.body.username,
    password:req.body.password

  })
  req.login(newuser,function(err){
    if(err){
      console.log(err);
    }else{
      passport.authenticate("local")(req,res,function(){
        res.redirect("secrets")
      })
    }
  })
//   bcrypt.compare(myPlaintextPassword, hash, function(err, result) {
//     // result == true
// })
  // User.findOne({email:req.body.username},function(err,found){
  //   if(err){
  //     res.render(err);
  //   }else{
  //     bcrypt.compare(req.body.password, found.password, function(err, result) {
  //       if(result == true){
  //         res.render("secrets")
  //       }else{
  //         res.send("wrong password")
  //       }
        // result == true
    // })



    // }
  // })
})
// app.get("/secrets",function(req,res){
//   res.render("secrets")
// })
app.get("/logout",function(req,res){
  req.logout()
  res.redirect("/")
})


app.listen(3000,function(){
  console.log("app is active");
})
