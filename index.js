const express = require("express");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const uuid = require("uuid");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Models = require("./models.js");
const cors = require("cors");
const { check, validationResult } = require('express-validator');

let allowedOrigins = [
  'http://localhost:4200',
  'http://localhost:8080', 
  'http://testsite.com', 
  'http://localhost:1234', 
  'https://my-flix-clients.netlify.app',
  'https://my-flix-clients.netlify.app/'
];

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan("common"));
app.use(express.static("public"));

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

// Get movie by title
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

// Get genre by name
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

// Add movie to favorites
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

