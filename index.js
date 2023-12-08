require("dotenv").config();
const jwt = require('jsonwebtoken');

const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");

const path = require("path");
const https = require("https");
const hbs = require("express-handlebars");

const { initialize } = require("./models/movies");
const handlebars = require("handlebars");
const {
  allowInsecurePrototypeAccess,
} = require("@handlebars/allow-prototype-access");

const { verifyToken, authenticateToken } = require("./middleware/authMiddleware");
const database = require("./config/database");
const { generateApiKey } = require("./models/apiKeys");
const apiKey = generateApiKey();

const privateKeyPath = path.join(__dirname, "server.key");
const certificatePath = path.join(__dirname, "server.crt");
const privateKey = fs.readFileSync(privateKeyPath, "utf8");
const certificate = fs.readFileSync(certificatePath, "utf8");
const credentials = { key: privateKey, cert: certificate };

const app = express();
const port = process.env.PORT || 8000;
// console.log(apiKey)

// Create an HTTPS server
const httpsServer = https.createServer(credentials, app);

app.use(express.static(path.join(__dirname, "public"))); // to access static files
app.set("views", path.join(__dirname, "views"));
app.use("/public", express.static("public"));

const { Movie } = require("./models/movies");

const exphbs = hbs.create({
  extname: ".hbs",
  handlebars: allowInsecurePrototypeAccess(handlebars),

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
const { createSecretKey } = require("crypto");

initialize(database.url)
  .then(() => {
    app.get("/", (req, res) => {
      res.render("partials/home");
    });

    app.get("/api/login", (req, res) => {
      res.render("partials/loginPage");
    });

    app.post("/api/login", (req, res) => {
      const { username, password } = req.body;
      if (username === "eswar" && password === "sunny") {
        const token = jwt.sign({ username }, "1234", { expiresIn: "1h" });
        res.json({ token });
      } else {
        req.status(401).json({ message: "Invalid Username or Password" });
      }
    });

    app.get('/protected', authenticateToken, (req, res) => {
      res.json({ message: 'You are authorized to access this protected resource.' });
    });

    app.post("/api/movies/new", verifyToken, async (req, res) => {
      try {
        const newMovie = req.body;
        delete newMovie._id;
        const result = await db.addNewMovie(newMovie);
        res.status(201).render("partials/success", { newMovie: result });
      } catch (error) {
        console.error(error);
        res
          .status(500)
          .render("partials/error", {
            message: "Error adding a new movie",
            error,
          });
      }
    });

    app.get("/api/movies/new", (req, res) => {
      res.render("partials/newMovie");
    });

    app.get("/api/movies/search", (req, res) => {
      res.render("partials/searchMovies");
    });

    app.get("/api/movies", async (req, res) => {
      try {
        const { page, perPage, title } = req.query;
        const movies = await db.getAllMovies(
          req, // Pass the req object here
          parseInt(page),
          parseInt(perPage),
          title
        );

        res.render("partials/allMovies", { movies: movies });
      } catch (error) {
        console.error(error);
        res.status(500).send("Error retrieving movies data");
      }
    });

    app.get("/api/movies/searchMovie", (req, res) => {
      res.render("partials/moviesResults");
    });

    app.get("/api/movies/details/:id", async (req, res) => {
      try {
        const movieId = req.params.id;
        const movie = await db.getMovieById(movieId);
        console.log(movie);

        if (!movie) {
          return res.status(404).send("Movie not found");
        }

        console.log(movie);
        res.render("partials/movieDetails", movie);
      } catch (error) {
        console.error(error);
        res.status(500).send("Error retrieving movie");
      }
    });

    app.delete("/api/movies/:id", verifyToken, async (req, res) => {
      try {
        const id = req.params.id;
        const deletedMovie = await db.deleteMovieById(id);
        if (deletedMovie) {
          res.status(200).send("Movie deleted Successfully");
        } else {
          res.status(404).send("Movie not found");
        }
      } catch (error) {
        console.error(error);
        res
          .status(500)
          .render("partials/error", { message: "Error deleting movie", error });
      }
    });

    app.put("/api/movies/:id", verifyToken, async (req, res) => {
      try {
        const id = req.params.id;
        const data = req.body;
        console.log("Received Update Request:", req.params.id, req.body);

        const updatedMovie = await db.updateMovieById(data, id);
        if (updatedMovie) {
          res
            .status(200)
            .render("partials/success", {
              message: "Movie Updated Successfully",
              newMovie: updatedMovie,
            });
        } else {
          res
            .status(404)
            .render("partials/error", { message: "Movie not found" });
        }
      } catch (error) {
        console.error(error);
        res
          .status(500)
          .render("partials/error", { message: "Error updating movie", error });
      }
    });

    httpsServer.listen(port, () => {
      console.log(`App listening on portsss: ${port}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
  });
