const mongoose = require("mongoose");

// Define the Movie schema
const movieSchema = new mongoose.Schema({
  plot: String,
  rated: String,
  awards: {
    wins: Number,
    nominations: Number,
    text: String,
  },
  imdb: {
    rating: Number,
    votes: Number,
    id: Number,
  },
  countries: [String],
  genres: [String],
  runtime: Number,
  cast: [String],
  title: String,
  year: Number,
  num_mflix_comments: Number,
  fullplot: String,
  released: Date,
  directors: [String],
  type: String,
  poster: String,
  languages: [String],
  lastupdated: Date,
  tomatoes: {
    viewer: {
      rating: Number,
      numReviews: Number,
      meter: Number,
    },
    fresh: Number,
    critic: {
      rating: Number,
      numReviews: Number,
      meter: Number,
    },
    rotten: Number,
    lastUpdated: Date,
  },
});

const Movie = mongoose.model("Movie", movieSchema);

const addNewMovie = async (data) => {
  try {
    const newMovie = new Movie(data);
    await newMovie.save();
    return newMovie;
  } catch (error) {
    throw error;
  }
};

const getAllMovies = async (req,page, perPage, title) => {
  try {
    let query = {};

    if (title) {
      console.log(req.query.title);
      query = { title: { $regex: req.query.title, $options: "i" } }; // Case-insensitive search
    }
    const test = await Movie.find(query)
      .sort({ _id: 1 })
      .skip((page - 1) * perPage)
      .limit(perPage);
    return test;
  } catch (error) {
    throw error;
  }
};

const getMovieById = async (id) => {
  try {
    const movie = await Movie.findById(id);
    return movie;
  } catch (error) {
    throw error;
  }
};

const updateMovieById = async (data, id) => {
  try {
    const updatedMovie = await Movie.findByIdAndUpdate(id, data, { new: true });
    return updatedMovie;
  } catch (error) {
    throw error;
  }
};

const deleteMovieById = async (id) => {
  try {
    const deletedMovie = await Movie.findByIdAndDelete(id);
    return deletedMovie;
  } catch (error) {
    throw error;
  }
};

const initialize = (connectionString) => {
  return mongoose.connect(connectionString);
};

module.exports = {
  Movie,
  initialize,
  addNewMovie,
  getAllMovies,
  getMovieById,
  updateMovieById,
  deleteMovieById,
};
