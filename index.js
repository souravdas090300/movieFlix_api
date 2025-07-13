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

// CORS Configuration
const allowedOrigins = ['http://localhost:8080', 'http://testsite.com', 'http://localhost:1234', 'https://my-flix-clients.netlify.app'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const message = 'The CORS policy for this application doesn\'t allow access from origin ' + origin;
      return callback(new Error(message), false);
    }
    return callback(null, true);
  }
}));

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan("common"));
app.use(express.static("public"));

// Authentication
const passport = require("passport");
require("./auth")(app);
require("./passport");

const Movies = Models.Movie;
const Users = Models.User;

// Database Connection
mongoose.connect(process.env.CONNECTION_URI, { 
  useNewUrlParser: true, 
  useUnifiedTopology: true,
  useFindAndModify: false,
  useCreateIndex: true
});

// Routes
app.get("/", (req, res) => {
  res.json({ message: "Welcome to myFlix API! Use /movies for movies or /users for user operations." });
});

// Movie Routes
app.get("/movies", passport.authenticate("jwt", { session: false }), async (req, res) => {
  try {
    const movies = await Movies.find();
    res.status(200).json(movies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/movies/:title", [
  passport.authenticate("jwt", { session: false }),
  check('title', 'Title is required').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  try {
    const movie = await Movies.findOne({ Title: req.params.title });
    if (!movie) return res.status(404).json({ error: "Movie not found" });
    res.status(200).json(movie);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Genre Routes
app.get("/genres", passport.authenticate("jwt", { session: false }), async (req, res) => {
  try {
    const genres = await Movies.aggregate([
      { $group: { _id: "$Genre.Name", description: { $first: "$Genre.Description" } } }
    ]);
    res.status(200).json(genres);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/genres/:name", [
  passport.authenticate("jwt", { session: false }),
  check('name', 'Genre name is required').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  try {
    const movie = await Movies.findOne({ "Genre.Name": req.params.name });
    if (!movie) return res.status(404).json({ error: "Genre not found" });
    res.status(200).json(movie.Genre);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Director Routes
app.get("/directors/:name", [
  passport.authenticate("jwt", { session: false }),
  check('name', 'Director name is required').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  try {
    const movie = await Movies.findOne({ "Director.Name": req.params.name });
    if (!movie) return res.status(404).json({ error: "Director not found" });
    
    res.status(200).json({
      name: movie.Director.Name,
      bio: movie.Director.Bio,
      birth: movie.Director.Birth,
      death: movie.Director.Death,
      movies: movie.Title
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// User Routes
app.get("/users", passport.authenticate("jwt", { session: false }), async (req, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ error: "Forbidden: Admin access required" });

  try {
    const users = await Users.find();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/users', [
  check('Username', 'Username is required (min 5 chars)').isLength({ min: 5 }),
  check('Username', 'Username must be alphanumeric').isAlphanumeric(),
  check('Password', 'Password is required').not().isEmpty(),
  check('Email', 'Invalid email').isEmail()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  try {
    const hashedPassword = await bcrypt.hash(req.body.Password, 10);
    const user = await Users.create({
      Username: req.body.Username,
      Password: hashedPassword,
      Email: req.body.Email,
      Birthday: req.body.Birthday
    });
    res.status(201).json(user);
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ error: "Username already exists" });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

app.put("/users/:Username", [
  passport.authenticate("jwt", { session: false }),
  check('Username', 'Username is required (min 5 chars)').isLength({ min: 5 }),
  check('Username', 'Username must be alphanumeric').isAlphanumeric(),
  check('Password', 'Password is required').not().isEmpty(),
  check('Email', 'Invalid email').isEmail()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
  if (req.user.Username !== req.params.Username && !req.user.isAdmin) {
    return res.status(403).json({ error: "Forbidden: Cannot update other users" });
  }

  try {
    const hashedPassword = await bcrypt.hash(req.body.Password, 10);
    const updatedUser = await Users.findOneAndUpdate(
      { Username: req.params.Username },
      {
        Username: req.body.Username,
        Password: hashedPassword,
        Email: req.body.Email,
        Birthday: req.body.Birthday
      },
      { new: true }
    );
    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Favorite Movies Routes
app.post("/users/:username/movies/:movieId", [
  passport.authenticate("jwt", { session: false }),
  check('username', 'Username is required').notEmpty(),
  check('movieId', 'Invalid movie ID').isMongoId()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
  if (req.user.Username !== req.params.username && !req.user.isAdmin) {
    return res.status(403).json({ error: "Forbidden: Cannot modify other users' favorites" });
  }

  try {
    const updatedUser = await Users.findOneAndUpdate(
      { Username: req.params.username },
      { $addToSet: { FavoriteMovies: req.params.movieId } },
      { new: true }
    );
    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/users/:username/movies/:movieId", [
  passport.authenticate("jwt", { session: false }),
  check('username', 'Username is required').notEmpty(),
  check('movieId', 'Invalid movie ID').isMongoId()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
  if (req.user.Username !== req.params.username && !req.user.isAdmin) {
    return res.status(403).json({ error: "Forbidden: Cannot modify other users' favorites" });
  }

  try {
    const updatedUser = await Users.findOneAndUpdate(
      { Username: req.params.username },
      { $pull: { FavoriteMovies: req.params.movieId } },
      { new: true }
    );
    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete User
app.delete("/users/:username", [
  passport.authenticate("jwt", { session: false }),
  check('username', 'Username is required').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
  if (req.user.Username !== req.params.username && !req.user.isAdmin) {
    return res.status(403).json({ error: "Forbidden: Cannot delete other users" });
  }

  try {
    await Users.findOneAndDelete({ Username: req.params.username });
    res.status(200).json({ message: `${req.params.username} was deleted` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Error Handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

// Server
const port = process.env.PORT || 8080;
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});