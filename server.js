'use strict';

const express = require('express');
const morgan = require('morgan');
const mongoose = require('mongoose');

mongoose.Promise = global.Promise;


const { PORT, DATABASE_URL } = require('./config');
const { BlogPosts } = require('./models');
const { Authors } = require('./models');

const app = express();
app.use(express.json());

app.use(morgan('common'));

app.post('/authors', (req, res) => {
  
  const requiredFields = ['firstName', 'lastName', 'userName'];
  requiredFields.forEach(field => {
    if (!(field in req.body)) {
      const message = `Required field ${field} not in request body`
      console.error(message);
      res.status(400).send(message);
    }
  });

  Authors.findOne({userName: req.body.userName})
    .then(author => {
      if (author) {
        const message = `User name already taken`
        console.error(message);
        res.status(400).send(message);
      } else {
        Authors
          .create({
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            userName: req.body.userName
          })
          .then(author => {
            res.status(200).json({
              _id: author.id,
              name: `${author.firstName} ${author.lastName}`,
              userName: author.userName
            });
          })
          .catch(err => {
            console.error(err);
            res.status(500).json({message: 'Internal server error'});
          });
      }
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    });
});

app.put('/authors/:id', (req, res) => {
  if (!(req.params.id && req.body.id && req.params.id === req.body.id)) {
    const message = `Request path id ${req.params.id} and request body id ${req.body.id} must match`;
    console.error(message);
    return res.status(400).send(message);
  }

  const toUpdate = {};
  const updatableFields = ['firstName', 'lastName', 'userName'];

  updatableFields.forEach(field => {
    if (field in req.body) {
      toUpdate[field] = req.body[field];
    }
  });
  Authors
    .findOne({userName: req.body.userName})
    .then(author => {
      if (author) {
        const message = `User name ${req.body.userName} is taken. Try another?`
        console.error(message);
        return res.status(400).send(message);
      } else {
        Authors
          .findByIdAndUpdate(req.body.id, {$set: toUpdate}, {new: true})
          .then(author => {
            res.status(200).json({
              id: author.id,
              name: `${author.firstName} ${author.lastName}`,
              userName: author.userName
            })
          })
      }
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({message: 'Internal server error'});
    });
});

app.delete('/authors/:id', (req, res) => {
  BlogPosts
    .remove({author: req.params.id})
    .then(() => {
      Authors
        .findByIdAndRemove(req.params.id)
        .then(() => {
          res.status(204).end();
      });   
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({message: 'Internal server error'});
    });
});

app.get('/blog-posts', (req, res) => {
  BlogPosts.find()
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
  BlogPosts.findById(req.params.id)
    .then(post => res.json(post.serialize()))
    .catch(err => {
      console.log(err);
      res.status(500).json({message: "Internal server error"});
    });
});

app.post('/blog-posts', (req, res) => {
  
  const requiredFields = ['title', 'content', 'author_id'];
  requiredFields.forEach(field => {
    if (!(field in req.body)) {
      const message = `Missing ${field} in request body`;
      console.error(message);
      return res.status(400).send(message);
    }
  });

  // checks if author_id is valid
  Authors.findById(req.body.author_id)
    .then(author => {
      if (author) {
        BlogPosts.create({
          title: req.body.title,
          content: req.body.content,
          author: req.body.author_id
        })
        .then(post => res.status(201).json({
          id: post.id,
          title: post.title,
          content: post.content,
          author: `${author.firstName} ${author.lastName}`,
          comments: post.comments
        }))
        .catch(err => {
          res.status(500).json({message: "Internal server error"});
        });
      }
    })
    .catch(err => {
      res.status(400).json({message: "Invalid author_id"});
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
  const updatableFields = ['title', 'content'];

  updatableFields.forEach(field => {
    if (field in req.body) {
      toUpdate[field] = req.body[field];
    }
  });
  
  
  BlogPosts
    .findByIdAndUpdate(req.body.id, {$set: toUpdate},  {new: true})
    .then(post => res.status(200).json(post.serialize()))
    .catch(err => {
      console.error(err);
      res.status(500).json({message: 'Internal server error'});
    });  


});


app.delete('/blog-posts/:id', (req, res) => {
  BlogPosts
    .findByIdAndRemove(req.params.id)
    .then(post => res.status(204).end())
    .catch(err => {
      console.error(err);
      res.status(500).json({message: 'Internal server error'});
    })
})

app.use("*", function(req, res) {
  res.status(404).json({ message: "Not Found" });
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
