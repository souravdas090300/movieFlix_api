/**
 * @fileoverview myFlix API - A RESTful API for movie information and user management
 * @description This API provides endpoints for managing movies, users, and user favorites.
 * It includes authentication, authorization, and data validation features.
 * @author Sourav Das
 * @version 1.0.0
 */

const express = require("express");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const uuid = require("uuid");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Models = require("./models.js");
const cors = require("cors");
const { check, validationResult } = require('express-validator');

/**
 * List of allowed origins for CORS policy
 * @type {string[]}
 */
let allowedOrigins = [
  'http://localhost:4200',
  'http://localhost:8080', 
  'http://testsite.com', 
  'http://localhost:1234', 
  'https://my-flix-clients.netlify.app',
  'https://my-flix-clients.netlify.app/',
  'https://souravdas090300.github.io',
  'https://souravdas090300.github.io/myFlix-Angular-client'
];

/**
 * Express application instance
 * @type {Express}
 */
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan("common"));
app.use(express.static("public"));

/**
 * Configure CORS (Cross-Origin Resource Sharing)
 * Allows requests only from specified origins
 */
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) { // If a specific origin isn't found on the list of allowed origins
      let message = 'The CORS policy for this application doesn\'t allow access from origin ' + origin;
      return callback(new Error(message), false);
    }
    return callback(null, true);
  }
}));

const passport = require("passport");
let auth = require("./auth")(app);
require("./passport"); // Import the passport configuration

/**
 * Movie model from mongoose schemas
 * @type {mongoose.Model}
 */
const Movies = Models.Movie;

/**
 * User model from mongoose schemas
 * @type {mongoose.Model}
 */
const Users = Models.User;

/**
 * Connect to MongoDB database using mongoose
 * Uses CONNECTION_URI environment variable
 */
mongoose.connect(process.env.CONNECTION_URI);

/**
 * @api {get} / Welcome Message
 * @apiName GetWelcome
 * @apiGroup General
 * @apiDescription Returns a welcome message for the myFlix API
 * 
 * @apiSuccess {String} message Welcome message with usage instructions
 * 
 * @apiSuccessExample {text} Success-Response:
 *     HTTP/1.1 200 OK
 *     Welcome to myFlix API! Use /movies for movies or /users for user operations.
 * 
 * @example
 * // GET /
 * curl -X GET "https://movie-flix.herokuapp.com/"
 */
app.get("/", (req, res) => {
  res.send(
    "Welcome to myFlix API! Use /movies for movies or /users for user operations."
  );
});

/**
 * @api {get} /movies Get All Movies
 * @apiName GetMovies
 * @apiGroup Movies
 * @apiDescription Retrieve a list of all movies in the database
 * @apiPermission authenticated user
 * 
 * @apiHeader {String} Authorization Bearer JWT token
 * 
 * @apiSuccess {Object[]} movies Array of movie objects
 * @apiSuccess {String} movies._id Movie ID
 * @apiSuccess {String} movies.Title Movie title
 * @apiSuccess {String} movies.Description Movie description
 * @apiSuccess {Object} movies.Genre Genre information
 * @apiSuccess {String} movies.Genre.Name Genre name
 * @apiSuccess {String} movies.Genre.Description Genre description
 * @apiSuccess {Object} movies.Director Director information
 * @apiSuccess {String} movies.Director.Name Director name
 * @apiSuccess {String} movies.Director.Bio Director biography
 * @apiSuccess {String[]} movies.Actors Array of actor names
 * @apiSuccess {String} movies.ImagePath Movie poster image URL
 * @apiSuccess {Boolean} movies.Featured Whether movie is featured
 * 
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     [
 *       {
 *         "_id": "507f1f77bcf86cd799439011",
 *         "Title": "The Shawshank Redemption",
 *         "Description": "Two imprisoned men bond over years...",
 *         "Genre": {
 *           "Name": "Drama",
 *           "Description": "Drama genre description"
 *         },
 *         "Director": {
 *           "Name": "Frank Darabont",
 *           "Bio": "Director biography"
 *         },
 *         "Actors": ["Tim Robbins", "Morgan Freeman"],
 *         "ImagePath": "shawshank.png",
 *         "Featured": true
 *       }
 *     ]
 * 
 * @apiError (401) Unauthorized Missing or invalid JWT token
 * @apiError (500) InternalServerError Database error
 * 
 * @apiErrorExample {json} Error-Response:
 *     HTTP/1.1 401 Unauthorized
 *     {
 *       "error": "Unauthorized"
 *     }
 * 
 * @example
 * // GET /movies
 * curl -X GET "https://movie-flix.herokuapp.com/movies" \
 *      -H "Authorization: Bearer your-jwt-token"
 */
app.get(
  "/movies",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const movies = await Movies.find();
      res.status(200).json(movies);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error: " + error });
    }
  }
);

/**
 * @api {get} /movies/:title Get Movie by Title
 * @apiName GetMovieByTitle
 * @apiGroup Movies
 * @apiDescription Retrieve detailed information about a specific movie by its title
 * @apiPermission authenticated user
 * 
 * @apiParam {String} title Movie title (case-sensitive)
 * 
 * @apiHeader {String} Authorization Bearer JWT token
 * 
 * @apiSuccess {Object} movie Movie object
 * @apiSuccess {String} movie._id Movie ID
 * @apiSuccess {String} movie.Title Movie title
 * @apiSuccess {String} movie.Description Movie description
 * @apiSuccess {Object} movie.Genre Genre information
 * @apiSuccess {String} movie.Genre.Name Genre name
 * @apiSuccess {String} movie.Genre.Description Genre description
 * @apiSuccess {Object} movie.Director Director information
 * @apiSuccess {String} movie.Director.Name Director name
 * @apiSuccess {String} movie.Director.Bio Director biography
 * @apiSuccess {String[]} movie.Actors Array of actor names
 * @apiSuccess {String} movie.ImagePath Movie poster image URL
 * @apiSuccess {Boolean} movie.Featured Whether movie is featured
 * 
 * @apiError (400) BadRequest Invalid title parameter
 * @apiError (401) Unauthorized Missing or invalid JWT token
 * @apiError (404) NotFound Movie not found
 * @apiError (422) ValidationError Title validation failed
 * @apiError (500) InternalServerError Database error
 * 
 * @apiErrorExample {json} Movie Not Found:
 *     HTTP/1.1 404 Not Found
 *     {
 *       "error": "Movie not found"
 *     }
 * 
 * @apiErrorExample {json} Validation Error:
 *     HTTP/1.1 422 Unprocessable Entity
 *     {
 *       "errors": [
 *         {
 *           "msg": "Title is required",
 *           "param": "title"
 *         }
 *       ]
 *     }
 * 
 * @example
 * // GET /movies/The Shawshank Redemption
 * curl -X GET "https://movie-flix.herokuapp.com/movies/The%20Shawshank%20Redemption" \
 *      -H "Authorization: Bearer your-jwt-token"
 */
app.get(
  "/movies/:title",
  [
    passport.authenticate("jwt", { session: false }),
    check('title', 'Title is required').notEmpty()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }
    try {
      const movie = await Movies.findOne({ Title: req.params.title });
      if (!movie) {
        return res.status(404).json({ error: "Movie not found" });
      }
      res.status(200).json(movie);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error: " + error });
    }
  }
);

// Get movie by ID
app.get(
  "/movies/id/:id",
  [
    passport.authenticate("jwt", { session: false }),
    check('id', 'Invalid movie ID').isMongoId()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }
    try {
      const movie = await Movies.findById(req.params.id);
      if (!movie) {
        return res.status(404).json({ error: "Movie not found" });
      }
      res.status(200).json(movie);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error: " + error });
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
      res.status(500).json({ error: "Error: " + error });
    }
  }
);

/**
 * @api {get} /genres/:name Get Genre by Name
 * @apiName GetGenreByName
 * @apiGroup Genres
 * @apiDescription Retrieve detailed information about a specific genre
 * @apiPermission authenticated user
 * 
 * @apiParam {String} name Genre name (case-sensitive)
 * 
 * @apiHeader {String} Authorization Bearer JWT token
 * 
 * @apiSuccess {Object} genre Genre information
 * @apiSuccess {String} genre.Name Genre name
 * @apiSuccess {String} genre.Description Genre description
 * 
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "Name": "Drama",
 *       "Description": "Drama is a category of narrative fiction..."
 *     }
 * 
 * @apiError (401) Unauthorized Missing or invalid JWT token
 * @apiError (404) NotFound Genre not found
 * @apiError (422) ValidationError Genre name validation failed
 * @apiError (500) InternalServerError Database error
 * 
 * @apiErrorExample {json} Genre Not Found:
 *     HTTP/1.1 404 Not Found
 *     {
 *       "error": "Genre not found"
 *     }
 * 
 * @example
 * // GET /genres/Drama
 * curl -X GET "https://movie-flix.herokuapp.com/genres/Drama" \
 *      -H "Authorization: Bearer your-jwt-token"
 */
app.get(
  "/genres/:name",
  [
    passport.authenticate("jwt", { session: false }),
    check('name', 'Genre name is required').notEmpty()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }
    try {
      const movie = await Movies.findOne({ "Genre.Name": req.params.name });
      if (!movie) {
        return res.status(404).json({ error: "Genre not found" });
      }
      const genre = movie.Genre;
      res.status(200).json(genre);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error: " + error });
    }
  }
);

// Get director by name
app.get(
  "/directors/:name",
  [
    passport.authenticate("jwt", { session: false }),
    check('name', 'Director name is required').notEmpty()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }
    try {
      const movie = await Movies.findOne({ "Director.Name": req.params.name });
      if (!movie) {
        return res.status(404).json({ error: "Director not found" });
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
      res.status(500).json({ error: "Error: " + error });
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
        { $unwind: "$Actresses" }, // Fixed: should be "Actresses" not "actresses"
        {
          $group: {
            _id: "$Actresses",
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
      res.status(500).json({ error: "Error: " + error });
    }
  }
);

/**
 * @api {post} /users Register New User
 * @apiName RegisterUser
 * @apiGroup Users
 * @apiDescription Register a new user account
 * @apiPermission none
 * 
 * @apiBody {String} Username Username (minimum 5 characters, alphanumeric only)
 * @apiBody {String} Password User password (required)
 * @apiBody {String} Email User email address (must be valid email format)
 * @apiBody {String} [Birthday] User birthday (optional)
 * 
 * @apiSuccess {Object} user Created user object
 * @apiSuccess {String} user._id User ID
 * @apiSuccess {String} user.Username Username
 * @apiSuccess {String} user.Email User email
 * @apiSuccess {String} user.Birthday User birthday
 * @apiSuccess {String[]} user.FavoriteMovies Array of favorite movie IDs (empty for new users)
 * 
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 201 Created
 *     {
 *       "_id": "507f1f77bcf86cd799439011",
 *       "Username": "johndoe",
 *       "Email": "john@example.com",
 *       "Birthday": "1990-01-01",
 *       "FavoriteMovies": []
 *     }
 * 
 * @apiError (400) BadRequest Username already exists
 * @apiError (422) ValidationError Input validation failed
 * @apiError (500) InternalServerError Database error
 * 
 * @apiErrorExample {json} Username Exists:
 *     HTTP/1.1 400 Bad Request
 *     {
 *       "error": "johndoe already exists"
 *     }
 * 
 * @apiErrorExample {json} Validation Error:
 *     HTTP/1.1 422 Unprocessable Entity
 *     {
 *       "errors": [
 *         {
 *           "msg": "Username is required",
 *           "param": "Username"
 *         },
 *         {
 *           "msg": "Email does not appear to be valid",
 *           "param": "Email"
 *         }
 *       ]
 *     }
 * 
 * @example
 * // POST /users
 * curl -X POST "https://movie-flix.herokuapp.com/users" \
 *      -H "Content-Type: application/json" \
 *      -d '{
 *        "Username": "johndoe",
 *        "Password": "securePassword123",
 *        "Email": "john@example.com",
 *        "Birthday": "1990-01-01"
 *      }'
 */
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
          return res.status(400).json({ error: req.body.Username + ' already exists' });
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
              res.status(500).json({ error: 'Error: ' + error });
            });
        }
      })
      .catch((error) => {
        console.error(error);
        res.status(500).json({ error: 'Error: ' + error });
      });
  });

app.put(
  "/users/:Username",
  [
    passport.authenticate("jwt", { session: false }),
    check('Username', 'Username is required').isLength({ min: 5 }),
    check('Username', 'Username contains non alphanumeric characters - not allowed.').isAlphanumeric(),
    check('Password', 'Password is required').not().isEmpty(),
    check('Email', 'Email does not appear to be valid').isEmail()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }
    if (req.user.Username !== req.params.Username) {
      return res.status(400).json({ error: "Permission denied" });
    }

    let hashedPassword = Users.hashPassword(req.body.Password);
    await Users.findOneAndUpdate(
      { Username: req.params.Username },
      {
        $set: {
          Username: req.body.Username,
          Password: hashedPassword,
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
        res.status(500).json({ error: "Error: " + err });
      });
  }
);


// Get user by username
app.get(
  "/users/:username",
  [
    passport.authenticate("jwt", { session: false }),
    check('username', 'Username is required').notEmpty()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }
    try {
      if (req.user.Username !== req.params.username && !req.user.isAdmin) {
        return res.status(403).json({ error: "Not authorized to view this user" });
      }
      const user = await Users.findOne({ Username: req.params.username });
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.status(200).json(user);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error: " + error });
    }
  }
);

// Get user's favorite movies with full movie details
app.get(
  "/users/:username/favorites",
  [
    passport.authenticate("jwt", { session: false }),
    check('username', 'Username is required').notEmpty()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }
    try {
      if (req.user.Username !== req.params.username && !req.user.isAdmin) {
        return res.status(403).json({ error: "Not authorized to view this user's favorites" });
      }
      const user = await Users.findOne({ Username: req.params.username }).populate('FavoriteMovies');
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.status(200).json({
        username: user.Username,
        favoriteMovies: user.FavoriteMovies,
        count: user.FavoriteMovies.length
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error: " + error });
    }
  }
);

/**
 * @api {post} /users/:username/movies/:movieId Add Movie to Favorites
 * @apiName AddToFavorites
 * @apiGroup Users
 * @apiDescription Add a movie to user's list of favorite movies
 * @apiPermission authenticated user (own account only)
 * 
 * @apiParam {String} username Username of the user
 * @apiParam {String} movieId MongoDB ObjectId of the movie to add
 * 
 * @apiHeader {String} Authorization Bearer JWT token
 * 
 * @apiSuccess {Object} user Updated user object
 * @apiSuccess {String} user._id User ID
 * @apiSuccess {String} user.Username Username
 * @apiSuccess {String} user.Email User email
 * @apiSuccess {String[]} user.FavoriteMovies Array of favorite movie IDs
 * 
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "_id": "507f1f77bcf86cd799439011",
 *       "Username": "johndoe",
 *       "Email": "john@example.com",
 *       "FavoriteMovies": ["507f1f77bcf86cd799439012", "507f1f77bcf86cd799439013"]
 *     }
 * 
 * @apiError (401) Unauthorized Missing or invalid JWT token
 * @apiError (403) Forbidden Not authorized to update this user's favorites
 * @apiError (404) NotFound User not found
 * @apiError (422) ValidationError Invalid username or movieId
 * @apiError (500) InternalServerError Database error
 * 
 * @apiErrorExample {json} Authorization Error:
 *     HTTP/1.1 403 Forbidden
 *     {
 *       "error": "Not authorized to update this user's favorites"
 *     }
 * 
 * @example
 * // POST /users/johndoe/movies/507f1f77bcf86cd799439012
 * curl -X POST "https://movie-flix.herokuapp.com/users/johndoe/movies/507f1f77bcf86cd799439012" \
 *      -H "Authorization: Bearer your-jwt-token"
 */
app.post(
  "/users/:username/movies/:movieId",
  [
    passport.authenticate("jwt", { session: false }),
    check('username', 'Username is required').notEmpty(),
    check('movieId', 'Invalid movie ID').isMongoId()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }
    try {
      if (req.user.Username !== req.params.username) {
        return res
          .status(403)
          .json({ error: "Not authorized to update this user's favorites" });
      }
      const updatedUser = await Users.findOneAndUpdate(
        { Username: req.params.username },
        { $addToSet: { FavoriteMovies: req.params.movieId } },
        { new: true }
      );
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }
      res.status(200).json(updatedUser);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error: " + error });
    }
  }
);

// Remove movie from favorites
app.delete(
  "/users/:username/movies/:movieId",
  [
    passport.authenticate("jwt", { session: false }),
    check('username', 'Username is required').notEmpty(),
    check('movieId', 'Invalid movie ID').isMongoId()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }
    try {
      if (req.user.Username !== req.params.username) {
        return res
          .status(403)
          .json({ error: "Not authorized to update this user's favorites" });
      }
      const updatedUser = await Users.findOneAndUpdate(
        { Username: req.params.username },
        { $pull: { FavoriteMovies: req.params.movieId } },
        { new: true }
      );
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }
      res.status(200).json(updatedUser);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error: " + error });
    }
  }
);

// Delete user
app.delete(
  "/users/:username",
  [
    passport.authenticate("jwt", { session: false }),
    check('username', 'Username is required').notEmpty()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }
    try {
      if (req.user.Username !== req.params.username && !req.user.isAdmin) {
        return res.status(403).json({ error: "Not authorized to delete this user" });
      }
      const user = await Users.findOneAndDelete({
        Username: req.params.username,
      });
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.status(200).json({ message: req.params.username + " was deleted." });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error: " + error });
    }
  }
);

// === SEARCH ROUTES ===

// Get featured movies (commonly needed for homepage)
app.get(
  "/movies/featured",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const featuredMovies = await Movies.find({ Featured: true });
      res.status(200).json(featuredMovies);
    } catch (error) {
      console.error("Error fetching featured movies:", error);
      res.status(500).json({ error: "Error: " + error });
    }
  }
);

// Get movies by genre (commonly needed for filtering)
app.get(
  "/movies/genre/:genre",
  [
    passport.authenticate("jwt", { session: false }),
    check('genre', 'Genre is required').notEmpty()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }
    try {
      const movies = await Movies.find({ "Genre.Name": new RegExp(req.params.genre, 'i') });
      res.status(200).json(movies);
    } catch (error) {
      console.error("Error fetching movies by genre:", error);
      res.status(500).json({ error: "Error: " + error });
    }
  }
);

// General search endpoint - searches across multiple fields
app.get(
  "/search",
  [
    passport.authenticate("jwt", { session: false }),
    check('q', 'Search query is required').notEmpty().isLength({ min: 1 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }
    
    try {
      const searchQuery = req.query.q;
      const searchRegex = new RegExp(searchQuery, 'i'); // Case-insensitive search
      
      const movies = await Movies.find({
        $or: [
          { Title: searchRegex },
          { Description: searchRegex },
          { "Genre.Name": searchRegex },
          { "Director.Name": searchRegex },
          { Actors: { $in: [searchRegex] } }
        ]
      });
      
      res.status(200).json({
        query: searchQuery,
        results: movies,
        count: movies.length
      });
    } catch (error) {
      console.error("Error in search:", error);
      res.status(500).json({ error: "Error: " + error });
    }
  }
);

// Search movies by title
app.get(
  "/search/movies",
  [
    passport.authenticate("jwt", { session: false }),
    check('title', 'Title search query is required').notEmpty()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }
    
    try {
      const titleQuery = req.query.title;
      const searchRegex = new RegExp(titleQuery, 'i');
      
      const movies = await Movies.find({ Title: searchRegex });
      
      res.status(200).json({
        query: titleQuery,
        results: movies,
        count: movies.length
      });
    } catch (error) {
      console.error("Error in movie title search:", error);
      res.status(500).json({ error: "Error: " + error });
    }
  }
);

// Search movies by genre
app.get(
  "/search/genres",
  [
    passport.authenticate("jwt", { session: false }),
    check('genre', 'Genre search query is required').notEmpty()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }
    
    try {
      const genreQuery = req.query.genre;
      const searchRegex = new RegExp(genreQuery, 'i');
      
      const movies = await Movies.find({ "Genre.Name": searchRegex });
      
      res.status(200).json({
        query: genreQuery,
        results: movies,
        count: movies.length
      });
    } catch (error) {
      console.error("Error in genre search:", error);
      res.status(500).json({ error: "Error: " + error });
    }
  }
);

// Search movies by director
app.get(
  "/search/directors",
  [
    passport.authenticate("jwt", { session: false }),
    check('director', 'Director search query is required').notEmpty()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }
    
    try {
      const directorQuery = req.query.director;
      const searchRegex = new RegExp(directorQuery, 'i');
      
      const movies = await Movies.find({ "Director.Name": searchRegex });
      
      res.status(200).json({
        query: directorQuery,
        results: movies,
        count: movies.length
      });
    } catch (error) {
      console.error("Error in director search:", error);
      res.status(500).json({ error: "Error: " + error });
    }
  }
);

// Search movies by actor
app.get(
  "/search/actors",
  [
    passport.authenticate("jwt", { session: false }),
    check('actor', 'Actor search query is required').notEmpty()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }
    
    try {
      const actorQuery = req.query.actor;
      const searchRegex = new RegExp(actorQuery, 'i');
      
      const movies = await Movies.find({ Actors: { $in: [searchRegex] } });
      
      res.status(200).json({
        query: actorQuery,
        results: movies,
        count: movies.length
      });
    } catch (error) {
      console.error("Error in actor search:", error);
      res.status(500).json({ error: "Error: " + error });
    }
  }
);

// Advanced search with multiple filters
app.get(
  "/search/advanced",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const { title, genre, director, actor, year } = req.query;
      let searchCriteria = {};
      
      if (title) {
        searchCriteria.Title = new RegExp(title, 'i');
      }
      
      if (genre) {
        searchCriteria["Genre.Name"] = new RegExp(genre, 'i');
      }
      
      if (director) {
        searchCriteria["Director.Name"] = new RegExp(director, 'i');
      }
      
      if (actor) {
        searchCriteria.Actors = { $in: [new RegExp(actor, 'i')] };
      }
      
      if (year) {
        searchCriteria.Year = year;
      }
      
      if (Object.keys(searchCriteria).length === 0) {
        return res.status(400).json({ error: "At least one search parameter is required" });
      }
      
      const movies = await Movies.find(searchCriteria);
      
      res.status(200).json({
        filters: req.query,
        results: movies,
        count: movies.length
      });
    } catch (error) {
      console.error("Error in advanced search:", error);
      res.status(500).json({ error: "Error: " + error });
    }
  }
);

// Auto-suggestions endpoint for search-as-you-type functionality
app.get(
  "/search/suggestions",
  [
    passport.authenticate("jwt", { session: false }),
    check('q', 'Search query is required').notEmpty().isLength({ min: 1, max: 50 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }
    
    try {
      const searchQuery = req.query.q;
      const limit = parseInt(req.query.limit) || 10; // Default to 10 suggestions
      const searchRegex = new RegExp(searchQuery, 'i');
      
      // Get movie title suggestions
      const movieTitles = await Movies.find(
        { Title: searchRegex },
        { Title: 1, _id: 0 }
      ).limit(limit);
      
      // Get genre suggestions
      const genres = await Movies.aggregate([
        { $match: { "Genre.Name": searchRegex } },
        { $group: { _id: "$Genre.Name" } },
        { $limit: 5 },
        { $project: { _id: 0, name: "$_id" } }
      ]);
      
      // Get director suggestions
      const directors = await Movies.aggregate([
        { $match: { "Director.Name": searchRegex } },
        { $group: { _id: "$Director.Name" } },
        { $limit: 5 },
        { $project: { _id: 0, name: "$_id" } }
      ]);
      
      // Get actor suggestions
      const actors = await Movies.aggregate([
        { $unwind: "$Actors" },
        { $match: { "Actors": searchRegex } },
        { $group: { _id: "$Actors" } },
        { $limit: 5 },
        { $project: { _id: 0, name: "$_id" } }
      ]);
      
      res.status(200).json({
        query: searchQuery,
        suggestions: {
          movies: movieTitles.map(m => ({ type: 'movie', value: m.Title })),
          genres: genres.map(g => ({ type: 'genre', value: g.name })),
          directors: directors.map(d => ({ type: 'director', value: d.name })),
          actors: actors.map(a => ({ type: 'actor', value: a.name }))
        }
      });
    } catch (error) {
      console.error("Error in suggestions:", error);
      res.status(500).json({ error: "Error: " + error });
    }
  }
);

// Quick search endpoint optimized for fast results (limited fields)
app.get(
  "/search/quick",
  [
    passport.authenticate("jwt", { session: false }),
    check('q', 'Search query is required').notEmpty().isLength({ min: 1 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }
    
    try {
      const searchQuery = req.query.q;
      const limit = parseInt(req.query.limit) || 20;
      const searchRegex = new RegExp(searchQuery, 'i');
      
      // Return only essential fields for quick display
      const movies = await Movies.find({
        $or: [
          { Title: searchRegex },
          { "Genre.Name": searchRegex },
          { "Director.Name": searchRegex },
          { Actors: { $in: [searchRegex] } }
        ]
      }, {
        Title: 1,
        "Genre.Name": 1,
        "Director.Name": 1,
        Year: 1,
        ImagePath: 1
      }).limit(limit);
      
      res.status(200).json({
        query: searchQuery,
        results: movies,
        count: movies.length,
        isQuickSearch: true
      });
    } catch (error) {
      console.error("Error in quick search:", error);
      res.status(500).json({ error: "Error: " + error });
    }
  }
);

// Search with pagination for better performance
app.get(
  "/search/paginated",
  [
    passport.authenticate("jwt", { session: false }),
    check('q', 'Search query is required').notEmpty()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }
    
    try {
      const searchQuery = req.query.q;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;
      const searchRegex = new RegExp(searchQuery, 'i');
      
      const searchCriteria = {
        $or: [
          { Title: searchRegex },
          { Description: searchRegex },
          { "Genre.Name": searchRegex },
          { "Director.Name": searchRegex },
          { Actors: { $in: [searchRegex] } }
        ]
      };
      
      // Get total count for pagination
      const totalResults = await Movies.countDocuments(searchCriteria);
      const totalPages = Math.ceil(totalResults / limit);
      
      // Get paginated results
      const movies = await Movies.find(searchCriteria)
        .skip(skip)
        .limit(limit);
      
      res.status(200).json({
        query: searchQuery,
        results: movies,
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          totalResults: totalResults,
          resultsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      });
    } catch (error) {
      console.error("Error in paginated search:", error);
      res.status(500).json({ error: "Error: " + error });
    }
  }
);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something broke!" });
});

// Start server
const port = process.env.PORT || 8080;
app.listen(port, '0.0.0.0', () => {
  console.log('Listening on port ' + port);
});


