const express = require("express");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const uuid = require("uuid");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Models = require("./models.js");
const cors = require("cors");
const { check, validationResult } = require('express-validator');

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan("common"));
app.use(express.static("public"));
app.use(cors()); // Enable cors for all routes

const passport = require("passport");
let auth = require("./auth")(app);
require("./passport"); // Import the passport configuration

const Movies = Models.Movie;
const Users = Models.User;

// mongoose.connect
mongoose.connect(process.env.CONNECTION_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// Root route
app.get("/", (req, res) => {
  res.send(
    "Welcome to myFlix API! Use /movies for movies or /users for user operations."
  );
});

// Get all movies
app.get(
  "/movies",
  async (req, res) => {
    try {
      const movies = await Movies.find();
      res.status(200).json(movies);
    } catch (error) {
      console.error(error);
      res.status(500).send("Error: " + error);
    }
  }
);

// Get movie by title
app.get(
  "/movies/:title",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const movie = await Movies.findOne({ Title: req.params.title });
      if (!movie) {
        return res.status(404).send("Movie not found");
      }
      res.status(200).json(movie);
    } catch (error) {
      console.error(error);
      res.status(500).send("Error: " + error);
    }
  }
);

// Get all genres
app.get(
  "/genres",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const genres = await Movies.aggregate([
        {
          $group: {
            _id: "$Genre.Name",
            description: { $first: "$Genre.Description" },
          },
        },
      ]);
      res.status(200).json(genres);
    } catch (error) {
      console.error(error);
      res.status(500).send("Error: " + error);
    }
  }
);

// Get genre by name
app.get(
  "/genres/:name",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const movie = await Movies.findOne({ "Genre.Name": req.params.name });
      if (!movie) {
        return res.status(404).send("Genre not found");
      }
      const genre = movie.Genre;
      res.status(200).json(genre);
    } catch (error) {
      console.error(error);
      res.status(500).send("Error: " + error);
    }
  }
);

// Get director by name
app.get(
  "/directors/:name",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const movie = await Movies.findOne({ "Director.Name": req.params.name });
      if (!movie) {
        return res.status(404).send("Director not found");
      }
      res.status(200).json({
        name: movie.Director.Name,
        bio: movie.Director.Bio,
        birth: movie.Director.Birth,
        death: movie.Director.Death,
        movies: movie.Title,
      });
    } catch (error) {
      console.error(error);
      res.status(500).send("Error: " + error);
    }
  }
);

// Get all unique actors
app.get(
  "/actors",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const actors = await Movies.aggregate([
        { $unwind: "$Actors" },
        { $group: { _id: "$Actors" } },
        { $sort: { _id: 1 } },
      ]);
      const actorNames = actors.map((a) => a._id);
      res.status(200).json(actorNames);
    } catch (error) {
      console.error("Error fetching actors:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Get all unique actress names
app.get(
  "/actresses",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const actresses = await Movies.aggregate([
        { $unwind: "$actresses" },
        {
          $group: {
            _id: "$actresses",
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);
      res.status(200).json({
        actresses: actresses.map((a) => a._id),
      });
    } catch (error) {
      console.error("Error fetching actresses:", error);
      res.status(500).json({
        error: "Failed to fetch actresses",
        details: error.message,
      });
    }
  }
);

// === USER ROUTES ===

// Get all users (should be protected and restricted to admins)
app.get(
  "/users",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const users = await Users.find();
      res.status(200).json(users);
    } catch (error) {
      console.error(error);
      res.status(500).send("Error: " + error);
    }
  }
);

app.post('/users',
  [
    check('Username', 'Username is required').isLength({ min: 5 }),
    check('Username', 'Username contains non alphanumeric characters - not allowed.').isAlphanumeric(),
    check('Password', 'Password is required').not().isEmpty(),
    check('Email', 'Email does not appear to be valid').isEmail()
  ], async (req, res) => {

    let errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    let hashedPassword = Users.hashPassword(req.body.Password);
    await Users.findOne({ Username: req.body.Username })
      .then((user) => {
        if (user) {
          return res.status(400).send(req.body.Username + ' already exists');
        } else {
          Users
            .create({
              Username: req.body.Username,
              Password: hashedPassword,
              Email: req.body.Email,
              Birthday: req.body.Birthday
            })
            .then((user) => { res.status(201).json(user) })
            .catch((error) => {
              console.error(error);
              res.status(500).send('Error: ' + error);
            });
        }
      })
      .catch((error) => {
        console.error(error);
        res.status(500).send('Error: ' + error);
      });
  });

app.put(
  "/users/:Username",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    if (req.user.Username !== req.params.Username) {
      return res.status(400).send("Permission denied");
    }
    await Users.findOneAndUpdate(
      { Username: req.params.Username },
      {
        $set: {
          Username: req.body.Username,
          Password: req.body.Password,
          Email: req.body.Email,
          Birthday: req.body.Birthday,
        },
      },
      { new: true }
    )
      .then((updatedUser) => {
        res.json(updatedUser);
      })
      .catch((err) => {
        console.log(err);
        res.status(500).send("Error: " + err);
      });
  }
);

// Get user by username
app.get(
  "/users/:username",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      if (req.user.Username !== req.params.username && !req.user.isAdmin) {
        return res.status(403).send("Not authorized to view this user");
      }
      const user = await Users.findOne({ Username: req.params.username });
      if (!user) {
        return res.status(404).send("User not found");
      }
      res.status(200).json(user);
    } catch (error) {
      console.error(error);
      res.status(500).send("Error: " + error);
    }
  }
);

// Add movie to favorites
app.post(
  "/users/:username/movies/:movieId",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      if (req.user.Username !== req.params.username) {
        return res
          .status(403)
          .send("Not authorized to update this user's favorites");
      }
      const updatedUser = await Users.findOneAndUpdate(
        { Username: req.params.username },
        { $addToSet: { FavoriteMovies: req.params.movieId } },
        { new: true }
      );
      if (!updatedUser) {
        return res.status(404).send("User not found");
      }
      res.status(200).json(updatedUser);
    } catch (error) {
      console.error(error);
      res.status(500).send("Error: " + error);
    }
  }
);

// Remove movie from favorites
app.delete(
  "/users/:username/movies/:movieId",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      if (req.user.Username !== req.params.username) {
        return res
          .status(403)
          .send("Not authorized to update this user's favorites");
      }
      const updatedUser = await Users.findOneAndUpdate(
        { Username: req.params.username },
        { $pull: { FavoriteMovies: req.params.movieId } },
        { new: true }
      );
      if (!updatedUser) {
        return res.status(404).send("User not found");
      }
      res.status(200).json(updatedUser);
    } catch (error) {
      console.error(error);
      res.status(500).send("Error: " + error);
    }
  }
);

// Delete user
app.delete(
  "/users/:username",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      if (req.user.Username !== req.params.username && !req.user.isAdmin) {
        return res.status(403).send("Not authorized to delete this user");
      }
      const user = await Users.findOneAndDelete({
        Username: req.params.username,
      });
      if (!user) {
        return res.status(404).send("User not found");
      }
      res.status(200).send(req.params.username + " was deleted.");
    } catch (error) {
      console.error(error);
      res.status(500).send("Error: " + error);
    }
  }
);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

// Start server
const port = process.env.PORT || 8080;
app.listen(port, '0.0.0.0', () => {
  console.log('Listening on port ' + port);
});