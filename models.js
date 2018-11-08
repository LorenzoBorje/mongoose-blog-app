'use strict';

const mongoose = require('mongoose');

const postSchema = mongoose.Schema({
  title: {type: String, required: true},
  content: {type: String, required: true},
  author: {
    firstName: {type: String, required: true},
    lastName: {type: String, required: true}
  }
});

postSchema.virtual('fullName').get(function() {
  return `${this.author.firstName} ${this.author.lastName}`;
});

postSchema.methods.serialize = function() {
  return {
    id: this._id,
    title: this.title,
    content: this.content,
    author: this.fullName
  };
};

const Posts = mongoose.model("Posts", postSchema);

module.exports = { Posts };