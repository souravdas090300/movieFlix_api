/**
 * One-time migration: fix broken ImagePath values for The Matrix and Schindler's List.
 * Run once with:  node fix-posters.js
 * Requires CONNECTION_URI or MONGODB_URI env var (same as the main app).
 */

const mongoose = require("mongoose");
const Models = require("./models.js");

const Movies = Models.Movie;

const FIXES = [
  {
    title: "The Matrix",
    imagePath:
      "https://upload.wikimedia.org/wikipedia/en/d/db/The_Matrix.png",
  },
  {
    title: "Schindler's List",
    imagePath:
      "https://upload.wikimedia.org/wikipedia/en/3/38/Schindler%27s_List_movie.jpg",
  },
];

async function main() {
  const uri = process.env.CONNECTION_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error(
      "Error: CONNECTION_URI or MONGODB_URI environment variable is required."
    );
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("Connected to MongoDB.\n");

  for (const fix of FIXES) {
    // Case-insensitive match so "the matrix", "The Matrix", etc. all match.
    const result = await Movies.updateMany(
      { Title: { $regex: new RegExp(`^${fix.title}$`, "i") } },
      { $set: { ImagePath: fix.imagePath } }
    );
    console.log(
      `"${fix.title}": ${result.matchedCount} matched, ${result.modifiedCount} updated.`
    );
  }

  await mongoose.disconnect();
  console.log("\nDone. You can now delete this file.");
}

main().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
