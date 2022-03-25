import { Router } from "express";

export function MoviesApi(mongoDatabase) {
  const router = new Router();

  router.use((req, res, next) => {
    const { access_token } = req.signedCookies;
    if (access_token) {
      next();
    } else {
      res.sendStatus(401);
    }
  });

  router.get("/", async (req, res) => {
    const movies = await mongoDatabase
      .collection("movies")
      .find()
      .map(({ title, year, plot, genre, poster }) => ({
        title,
        year,
        plot,
        genre,
        poster,
      }))
      .limit(400)
      .toArray();
    res.json(movies);
  });
  router.get("/new", (req, res) => {
    res.send("Not ready yet");
  });
  return router;
}
