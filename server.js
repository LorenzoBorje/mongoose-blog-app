'use strict';

const express = require('express');
const morgan = require('morgan');
const mongoose = require('mongoose');

mongoose.Promise = global.Promise;


const { PORT, DATABASE_URL } = require('./config');
const { Posts } = require('./models');

const app = express();
app.use(express.json());

app.use(morgan('common'));

app.get('/blog-posts', (req, res) => {
  Posts.find()
    .then(posts => {
      res.json({
        posts: posts.map(post => post.serialize())
      });
    })
    .catch(err => {
      console.log(err);
      res.status(500).json({message: "Internal server error"});
    }); 
});

app.get('/blog-posts/:id', (req, res) => {
  Posts.findById(req.params.id)
    .then(post => res.json(post.serialize()))
    .catch(err => {
      console.log(err);
      res.status(500).json({message: "Internal server error"});
    });
});

app.post('/blog-posts', (req, res) => {
  
  const requiredFields = ['title', 'content', 'author'];
  requiredFields.forEach(field => {
    if (!(field in req.body)) {
      const message = `Missing ${field} in request body`;
      console.error(message);
      return res.status(400).send(message);
    }
  });
  
  Posts.create({
    title: req.body.title,
    content: req.body.content,
    author: {
      firstName: req.body.author.firstName,
      lastName: req.body.author.lastName
    }
  })
    .then(post => res.status(201).json(post.serialize()))
    .catch(err => {
      console.error(err);
      res.status(500).json({message: "Internal server error"});
    });

});

app.put('/blog-posts/:id', (req, res) => {

  if (!(req.params.id && req.body.id && req.params.id === req.body.id)) {
    const message = 
     `Request path id ${req.params.id} and request body id ${req.body.id} must match`;
    console.error(message);
    return res.status(400).send(message);
  }

  const toUpdate = {}
  const updatableFields = ['title', 'content', 'author'];

  updatableFields.forEach(field => {
    if (field in req.body) {
      toUpdate[field] = req.body[field];
    }
  });
  
  
  Posts
    .findByIdAndUpdate(req.body.id, {$set: toUpdate})
    .then(post => res.status(200).json(post.serialize()))
    .catch(err => {
      console.error(err);
      res.status(500).json({message: 'Internal server error'});
    });  


});

function runServer(databaseUrl, port = PORT) {
  return new Promise((resolve, reject) => {
    mongoose.connect(
      databaseUrl,
      err => {
        if (err) {
          return reject(err);
        }
        server = app
          .listen(port, () => {
            console.log(`Your app is listening on port ${port}`);
            resolve();
          })
          .on("error", err => {
            mongoose.disconnect();
            reject(err);
          });
      }
    );
  });
}

function closeServer() {
  return mongoose.disconnect().then(() => {
    return new Promise((resolve, reject) => {
      console.log("Closing server");
      server.close(err => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
  });
}

if (require.main === module) {
  runServer(DATABASE_URL).catch(err => console.error(err));
}

module.exports = { app, runServer, closeServer };
