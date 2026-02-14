require("dotenv").config();

const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

/* ---------------- MOOD ROUTE ---------------- */

app.post("/api/mood", async (req, res) => {
  const { mood } = req.body;

  if (!mood) {
    return res.status(400).json({ error: "Mood required" });
  }

  try {
    // 1️⃣ Get genres from AI
    const aiResponse = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "mistralai/mistral-7b-instruct",
        messages: [
          {
            role: "user",
            content: `Convert this mood into exactly 3 movie genres. Only return comma separated genres. Mood: ${mood}`
          }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const genreText = aiResponse.data.choices[0].message.content;
    const genreNames = genreText.split(",").map(g => g.trim());

    // 2️⃣ Get TMDB genres
    const genreResponse = await axios.get(
      `https://api.themoviedb.org/3/genre/movie/list?api_key=${process.env.TMDB_API_KEY}`
    );

    const tmdbGenres = genreResponse.data.genres;

    const genreIds = tmdbGenres
      .filter(g =>
        genreNames.some(name =>
          g.name.toLowerCase().includes(name.toLowerCase())
        )
      )
      .map(g => g.id);

    // 3️⃣ Fetch movies
    const movieResponse = await axios.get(
      `https://api.themoviedb.org/3/discover/movie?api_key=${process.env.TMDB_API_KEY}&with_genres=${genreIds.join(",")}`
    );

    res.json({
      mood,
      genres: genreNames,
      movies: movieResponse.data.results.slice(0, 10)
    });

  } catch (error) {
    console.log(error.response?.data || error.message);
    res.status(500).json({ error: "Something failed" });
  }
});

/* ---------------- MOVIE DETAILS ROUTE ---------------- */

app.get("/api/movie/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const response = await axios.get(
      `https://api.themoviedb.org/3/movie/${id}?api_key=${process.env.TMDB_API_KEY}`
    );

    res.json(response.data);
  } catch (error) {
    console.log(error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch movie details" });
  }
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});
