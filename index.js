require("dotenv").config();
const jwt = require("jsonwebtoken");
const session = require("express-session");

const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");

const handlebars = require("handlebars");
const path = require("path");
const https = require("https");
const http = require("http"); // Include the 'http' module
const hbs = require("express-handlebars");
const { allowInsecurePrototypeAccess } = require("@handlebars/allow-prototype-access");
const { initialize } = require("./models/movies").initialize;

const { verifyToken, authenticateToken, secureSecretKey } = require("./middleware/authMiddleware");
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

// Create an HTTP server for local development
const httpServer = http.createServer(app);
const httpPort = process.env.HTTP_PORT || 8001; // Choose a different port for HTTP

httpServer.listen(httpPort, () => {
  console.log(`App listening on HTTP port: ${httpPort}`);
});

// Create an HTTPS server for both local development and deployment on Cyclic
const httpsServer = https.createServer(credentials, app);
httpsServer.listen(port, () => {
  console.log(`App listening on HTTPS port: ${port}`);
});

app.use(express.static(path.join(__dirname, "public")));
app.set("views", path.join(__dirname, "views"));
app.use("/public", express.static("public"));

const { Movie } = require("./models/movies");

const exphbs = hbs.create({
  extname: ".hbs",
  // handlebars: allowInsecurePrototypeAccess(handlebars),

  helpers: {
    jsonPrettyPrint: function (jsonData) {
      // JSON data with formatting
      return JSON.stringify(jsonData, null, 2);
    },
  },
});
app.engine("hbs", exphbs.engine); // register handlebar as template engine
app.set("view engine", "hbs");

app.use(bodyParser.urlencoded({ extended: "true" }));
app.use(bodyParser.json());
app.use(bodyParser.json({ type: "application/vnd.api+json" }));

const db = require("./models/movies");
const { createSecretKey } = require("crypto");

app.use(
  session({
    secret: secureSecretKey,
    resave: false,
    saveUninitialized: true,
  })
);

initialize(database.url)
  .then(() => {
    app.get("/", authenticateToken, (req, res) => {
      // added auth because this is the first page after login
      res.render("partials/home");
    });

    app.get("/api/login", (req, res) => {
      // rendering login screen
      res.render("partials/loginPage");
    });

    app.post("/api/login", (req, res) => {
      // no auth and no key as it's the login
      const { username, password } = req.body;
      if (username === "eswar" && password === "sunny") {
        const token = jwt.sign({ username }, secureSecretKey, {
          expiresIn: "1h",
        });
        req.session.token = token;
        console.log('token', req.session)
        // res.json(token)
        res.redirect("/"); // Redirect to the home page
      } else {
        req.status(401).json({ message: "Invalid Username or Password" });
      }
    });

    app.get("/protected", authenticateToken, (req, res) => {
      // testing route for auth
      res.json({
        message: "You are authorized to access this protected resource.",
      });
    });

    app.get("/api/movies/new", authenticateToken, (req, res) => {
      res.render("partials/newMovie");
    });

    app.post("/api/movies/new", authenticateToken, async (req, res) => {
      // added auth because it can be done through UI
      try {
        const newMovie = req.body;
        delete newMovie._id;
        const result = await db.addNewMovie(newMovie);
        res.status(201).render("partials/success", { newMovie: result });
      } catch (error) {
        console.error(error);
        res.status(500).render("partials/error", {
          message: "Error adding a new movie",
          error,
        });
      }
    });

    app.get("/api/movies/search", authenticateToken, (req, res) => { // all movies hbs from the home page
      res.render("partials/searchMovies");
    });

    app.get("/api/movies", authenticateToken, async (req, res) => { // after getting inputs from the user this will be triggered
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

    app.get("/api/movies/searchMovie", authenticateToken, (req, res) => {// search single movie
      res.render("partials/moviesResults");
    });

    app.get("/api/movies/details", authenticateToken, async (req, res) => { // showing results for a single search movie
      try {
        const movieId = req.query.id;

        if (!movieId) {
          return res.status(400).send("Movie ID is missing");
        }

        const movie = await db.getMovieById(movieId);

        if (!movie) {
          return res.status(404).send("Movie not found");
        }

        res.render("partials/movieDetails", movie);
      } catch (error) {
        console.error(error);
        res.status(500).send("Error retrieving movie");
      }
    });

    app.delete("/api/movies/:id", verifyToken, async (req, res) => {// This route has both authentication and authorization because it's a delete operation
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

    app.put("/api/movies/:id", verifyToken, async (req, res) => {// This route has both authentication and authorization because it's an update operation
      try {
        const id = req.params.id;
        const data = req.body;
        console.log("Received Update Request:", req.params.id, req.body);

        const updatedMovie = await db.updateMovieById(data, id);
        if (updatedMovie) {
          res.status(200).render("partials/success", {
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
