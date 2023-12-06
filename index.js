const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const hbs = require("express-handlebars");
const { initialize } = require("./models/movies");
var database = require("./config/database");

const app = express();
const port = process.env.PORT || 8000;

app.use(express.static(path.join(__dirname, "public"))); // to access static files
app.set("views", path.join(__dirname, "views"));
app.use("/public", express.static("public"));

const exphbs = hbs.create({
  extname: ".hbs",
  helpers: {
    jsonPrettyPrint: function (jsonData) {
      //JSON data with formatting
      return JSON.stringify(jsonData, null, 2);
    },
  },
});
app.engine("hbs", exphbs.engine); // register handlebar as templet engine
app.set("view engine", "hbs");

app.use(bodyParser.urlencoded({ extended: "true" }));
app.use(bodyParser.json());
app.use(bodyParser.json({ type: "application/vnd.api+json" }));

const db = require("./models/movies");

initialize(database.url)
  .then(() => {
    app.get("/", (req, res) => {
      res.render("partials/home");
    });

    app.post("/api/movies/new", async (req, res) => {
      try {
        const newMovie = req.body;
        delete newMovie._id;
        const result = await db.addNewMovie(newMovie);
        res.status(201).render("partials/success", { newMovie: result });
      } catch (error) {
        console.error(error);
        res.status(500).render("partials/error", { message: "Error adding a new movie", error});
      }
    });

    app.get("/api/movies/new", (req, res) => {
      res.render("partials/newMovie"); 
    });

    app.get("/api/movies", async (req, res) => {
      try {
        const { page, perPage, title } = req.query;
        const movies = await db.getAllMovies(
          parseInt(page),
          parseInt(perPage),
          title
        );
        res.render("partials/moviesResults", { movies });
      } catch (error) {
        console.error(error);
        res.status(500).send("Error retrieving movies data");
      }
    });

    app.delete("/api/movies/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const deletedMovie = await db.deleteMovieById(id);
        if (deletedMovie) {
          res.status(200).send("Movie deleted Successfully" );
        } else {
          res.status(404).send("Movie not found");
        }
      } catch (error) {
        console.error(error);
        res.status(500).render("partials/error", { message: "Error deleting movie", error });
      }
    });

    app.put("/api/movies/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const data = req.body;
        const updatedMovie = await db.updateMovieById(data, id);
        if (updatedMovie) {
          res.status(200).render("partials/success", { message: "Movie Updated Successfully" ,newMovie : updatedMovie });
        } else {
          res.status(404).render("partials/error", { message: "Movie not found" });
        }
      } catch (error) {
        console.error(error);
        res.status(500).render("partials/error", { message: "Error updating movie", error });
      }
    });

    app.listen(port, () => {
      console.log(`App listening on portsss: ${port}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
  });