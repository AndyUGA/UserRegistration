var ObjectID = require("mongodb").ObjectID;
const MongoClient = require("mongodb").MongoClient;
const uri = require("../config/keys").MongoURI;
const client = new MongoClient(uri, { useNewUrlParser: true });
const express = require("express");
const router = express.Router();
const { ensureAuthenticated } = require("../config/auth");
const uuidv4 = require("uuid/v4");

var result;

client.connect(err => {
  const collection = client.db("test").collection("users");

  //Get Welcome page
  router.get("/", (req, res) => res.render("User/Homepage", { layout: "User/Homepage" }));


  //Activate Account
  router.get("/activateAccount/:token", (req, res, next) => {
    const token = req.params.token;
    console.log("token is " + token);
    collection.updateOne({ token: token }, { $set: { isVerified: true } });
    req.flash(
      "success_msg",
      `Your Account has been Activated. Please login`
    );
    res.redirect("/users/login");

  });


  //Returns view for dashboard or profile
  router.get("/:content", ensureAuthenticated, (req, res) => {
    const content = req.params.content;
    console.log("Content is " + content);
    collection.find({}).toArray(function (err, result) {
      let allResults = result;
      if (err) {
        res.send({ error: " An error has occurred" });
      } else {
        const currentID = { _id: ObjectID(req.user._id) };

        for (let i = 0; i < result.length; i++) {
          let dbID = { _id: ObjectID(result[i]._id) };

          if (currentID._id.equals(dbID._id)) {
            result = result[i];
          }
        }

        let name = req.user.name;
        let fullname;
        firstChar = name.charAt(0);
        fullname = firstChar.toUpperCase() + name.substring(1, name.length);

        if (content == "dashboard") {

          res.render("User/dashboard", {
            name: name,
            fullname: fullname,
            email: req.user.email,
            id: req.user._id,
            result: result,
            title: "Dashboard"
          });
        } else if (content == "profile") {
          res.render("User/profile", {
            layout: "User/profile",
            name: name,
            fullname: fullname,
            email: req.user.email,
            id: req.user._id,
            result: result,
            title: "Profile"
          });
        } else if (content == "public") {

          res.render("User/Public", { title: "Public", allResults: allResults });
        }
      }
    });
  });

  //Get notes from selected book title
  router.get("/getBookNotes/:index/:name", ensureAuthenticated, (req, res) => {
    const index = req.params.index;
    const name = req.params.name;

    let bookTitle;
    let author;
    collection.find({}).toArray(function (err, result) {
      if (err) {
        res.send({ error: " An error has occurred" });
      } else {
        const currentID = { _id: ObjectID(req.user._id) };
        for (let i = 0; i < result.length; i++) {
          let dbID = { _id: ObjectID(result[i]._id) };
          if (currentID._id.equals(dbID._id)) {
            result = result[i];
            bookTitle = result.BookTitle[index].Title;
            author = result.BookTitle[index].Author;
          }
        }

        res.render("User/BookNotes", {
          result: result,
          index: index,
          name: name,
          bookTitle: bookTitle,
          title: "Notes",
          author: author
        });
      }
    });

  });

  //Request to create book entry
  router.post("/createBookEntry/:name", ensureAuthenticated, (req, res, next) => {
    const name = req.params.name;

    const title = req.body.title;
    const author = req.body.author;

    collection.updateOne({ name: name }, { $push: { BookTitle: { Title: title, Author: author, Note: [] } } });

    res.redirect("/dashboard");

  });

  //Requst to create note
  router.post("/insertNote/:index/:name/:bookTitle", ensureAuthenticated, (req, res, next) => {
    const name = req.params.name;
    const index = req.params.index;
    const title = req.body.title;
    const bookTitle = req.params.bookTitle;
    const note = { content: req.body.note, created: new Date().toLocaleString("en-US", { timeZone: "America/New_York" }) };


    collection.updateOne({ name: name, "BookTitle.Title": bookTitle }, { $push: { "BookTitle.$.Note": note } });

    res.redirect("/getBookNotes/" + index + "/" + name);

  });

  //Request to update note
  router.post("/updateNote/:noteIndex/:name/:bookTitle/:bookIndex", ensureAuthenticated, (req, res, next) => {
    const name = req.params.name;
    const bookIndex = req.params.bookIndex;
    const noteIndex = req.params.noteIndex;
    const title = req.body.title;
    const bookTitle = req.params.bookTitle;
    const note = { content: req.body.note, created: new Date().toLocaleString("en-US", { timeZone: "America/New_York" }) };


    collection.updateOne({ name: name, "BookTitle.Title": bookTitle }, { $set: { ["BookTitle.$.Note." + noteIndex]: note } });

    res.redirect("/getBookNotes/" + bookIndex + "/" + name);

  });

  //Request to delete book entry
  router.post("/deleteNote/:bookTitle/:name", ensureAuthenticated, (req, res, next) => {
    const name = req.params.name;
    const bookTitle = req.params.bookTitle;

    collection.updateOne({ name: name, "BookTitle.Title": bookTitle }, { $pull: { BookTitle: { Title: bookTitle } } });

    res.redirect("/dashboard");

  });







});

module.exports = router;
