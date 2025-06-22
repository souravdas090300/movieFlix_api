const express = require("express"),
  morgan = require("morgan"),
  bodyParser = require("body-parser"),
  uuid = require("uuid"),
  mongoose = require("mongoose"),
  Models = require("./models.js");

const app = express();

app.use(bodyParser.json());
app.use(morgan("common"));
app.use(express.static("public"));

const Movies = Models.Movie;
const Users = Models.User;

// Connect to MongoDB
mongoose.connect("mongodb://localhost:27017/myFlixDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Root route
app.get("/", (req, res) => {
  res.send(
    "Welcome to myFlix API! Use /movies for movies or /users for user operations."
  );
});

// === MOVIE ROUTES ===

// Get all movies
app.get("/movies", async (req, res) => {
  try {
    const movies = await Movies.find();
    res.status(200).json(movies);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error: " + error);
  }
});

// Get movie by title
app.get("/movies/:title", async (req, res) => {
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
});

// Get all genres
app.get("/genres", async (req, res) => {
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
});

// Get genre by name
app.get("/genres/:name", async (req, res) => {
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
});

// Get director by name
app.get("/directors/:name", async (req, res) => {
  try {
    const movie = await Movies.findOne({ "Director.Name": req.params.name });
    if (!movie) {
      return res.status(404).send("Director not found");
    }
    const director = movie.Director;
    res.status(200).json(director);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error: " + error);
  }
});

// Get director by name
app.get("/directors/:name", async (req, res) => {
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
});

// Get all actors
app.get("/actors", async (req, res) => {
  try {
    const actors = await Movies.aggregate([
      { $unwind: "$Actors" },
      { $group: { _id: "$Actors" } },
    ]);
    res.status(200).json(actors.map((a) => a._id));
  } catch (error) {
    console.error(error);
    res.status(500).send("Error: " + error);
  }
});

// Get all actresses
app.get("/actresses", async (req, res) => {
  try {
    const actresses = await Movies.aggregate([
      { $unwind: "$actresses" },
      { $group: { _id: "$actresses" } },
    ]);
    res.status(200).json(actresses.map((a) => a._id));
  } catch (error) {
    console.error(error);
    res.status(500).send("Error: " + error);
  }
});

// === USER ROUTES ===

// Get all users
app.get("/users", async (req, res) => {
  try {
    const users = await Users.find();
    res.status(200).json(users);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error: " + error);
  }
});

// Register new user
app.post("/users", (req, res) => {
  Users.findOne({ Username: req.body.Username })
    .then((user) => {
      if (user) {
        return res.status(400).send(req.body.Username + " already exists");
      } else {
        Users.create({
          Username: req.body.Username,
          Password: req.body.Password,
          Email: req.body.Email,
          Name: req.body.Name,
          FavoriteMovies: req.body.FavoriteMovies || [],
        })
          .then((user) => {
            res.status(201).json(user);
          })
          .catch((error) => {
            console.error(error);
            res.status(500).send("Error: " + error);
          });
      }
    })
    .catch((error) => {
      console.error(error);
      res.status(500).send("Error: " + error);
    });
});

// Get user by username
app.get("/users/:username", async (req, res) => {
  try {
    const user = await Users.findOne({ Username: req.params.username });
    if (!user) {
      return res.status(404).send("User not found");
    }
    res.status(200).json(user);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error: " + error);
  }
});

// Update user info
app.put("/users/:username", async (req, res) => {
  try {
    const updatedUser = await Users.findOneAndUpdate(
      { Username: req.params.username },
      {
        $set: {
          Username: req.body.Username,
          Password: req.body.Password,
          Email: req.body.Email,
          Name: req.body.Name,
          FavoriteMovies: req.body.FavoriteMovies,
        },
      },
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
});

// Add movie to favorites
app.post("/users/:username/movies/:movieId", async (req, res) => {
  try {
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
});

// Remove movie from favorites
app.delete("/users/:username/movies/:movieId", async (req, res) => {
  try {
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
});

// Delete user
app.delete("/users/:username", async (req, res) => {
  try {
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
});

// Start server
app.listen(8080, () => {
  console.log("Your app is listening on port 8080.");
});
