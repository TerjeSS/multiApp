import express from "express";
import * as path from "path";
import { MongoClient } from "mongodb";
import { MoviesApi } from "./Movies.js";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import fetch from "node-fetch";
import { WebSocketServer } from "ws";

const app = express();
dotenv.config();
app.use(bodyParser.json());
app.use(cookieParser(process.env.COOKIE_SECRET));

const wsServer = new WebSocketServer({ noServer: true });
const connections = [];

wsServer.on("connect", (socket) => {
  console.log("ws connected");
  connections.push(socket);
  socket.send(JSON.stringify({ author: "server", message: "hi there" }));
  socket.on("message", (data) => {
    const { author, message } = JSON.parse(data);
    for (const connection of connections) {
      connection.send(JSON.stringify({ author, message }));
    }
  });
});

const server = app.listen(3000, () => {
  console.log("listening on http://localhost:" + server.address().port);
  server.on("upgrade", (req, socket, head) => {
    wsServer.handleUpgrade(req, socket, head, (socket) => {
      wsServer.emit("connect", socket, req);
    });
  });
});

//Login-config stored on the server instead of the client
const auth_config = {
  discovery_url: "https://accounts.google.com/.well-known/openid-configuration",
  client_id: process.env.CLIENT_ID,

  scope: "email profile",
};
//Mongo-connection using express-router
const mongoClient = new MongoClient(process.env.MONGO_URL);
mongoClient.connect().then(async () => {
  console.log("connected to db");
  app.use("/api/movies", MoviesApi(mongoClient.db("sample_mflix")));
});
//Middleware to serve static files
app.use(express.static(path.resolve("../client/dist")));

//API for Login / logout functionality. Move to its own router eventually
app.post("/api/login", (req, res) => {
  const { access_token } = req.body;
  res.cookie("access_token", access_token, { signed: true });
  res.sendStatus(200);
});

app.get("/api/login", async (req, res) => {
  const { access_token } = req.signedCookies;
  const discoveryDocument = await fetchJSON(auth_config.discovery_url);
  const { userinfo_endpoint } = discoveryDocument;
  let userinfo = undefined;
  if (access_token) {
    try {
      userinfo = await fetchJSON(userinfo_endpoint, {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });
    } catch (error) {
      console.error({ error });
    }
  }
  res.json({ userinfo, auth_config }).status(200);
});

app.get("/api/logout", (req, res) => {
  res.clearCookie("access_token");
  res.sendStatus(200);
});
//Custom Middleware so React's BrowserRouter works properly
app.use((req, res, next) => {
  if (req.method === "GET" && !req.path.startsWith("/api/")) {
    res.sendFile(path.resolve("../client/dist/index.html"));
  } else {
    next();
  }
});

//Function to fetch, and parse the data as JSON.
async function fetchJSON(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) {
    throw new Error(`Error fetching: ${res.status} : ${res.statusMessage}`);
  }
  return await res.json();
}
