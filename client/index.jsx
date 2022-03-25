import ReactDOM from "react-dom";
import React, { useContext, useEffect, useState } from "react";
import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import { useNavigate } from "react-router";

const ProfileContext = React.createContext({ userinfo: undefined });

function Navbar({ reload }) {
  const navigate = useNavigate();
  const { userinfo } = useContext(ProfileContext);

  async function handleLogout() {
    await fetch("/api/logout");
    reload();
    navigate("/");
  }

  return (
    <div className={"navbar"}>
      <div className={"leftBar"}>
        <Link to={"/"}>Frontpage</Link>
        <Link to={"/movies"}>Movie Database</Link>
        <Link to={"/chat"}>Chat-app</Link>
      </div>
      <div className={"rightBar"}>
        {userinfo && <button onClick={handleLogout}>Log out</button>}
        {!userinfo && (
          <button
            onClick={() => {
              navigate("/login");
            }}
          >
            Log in
          </button>
        )}
      </div>
    </div>
  );
}

function Frontpage() {
  const { userinfo } = useContext(ProfileContext);
  console.log({ userinfo });
  return (
    <>
      {userinfo && (
        <div>
          <div>Hello {userinfo.name}</div>
        </div>
      )}
      {!userinfo && <div>Hello, please log in</div>}
    </>
  );
}

function LoginPage() {
  const { auth_config } = useContext(ProfileContext);

  useEffect(async () => {
    const { discovery_url, client_id, scope } = auth_config;
    const { authorization_endpoint } = await fetchJSON(discovery_url);

    const parameters = {
      response_type: "token",
      response_mode: "fragment",
      redirect_uri: window.location.origin + "/login/callback",
      client_id: client_id,
      scope: scope,
    };
    window.location.href =
      authorization_endpoint + "?" + new URLSearchParams(parameters);
  }, []);
  return (
    <div>
      <div>Loading...</div>
    </div>
  );
}

function useLoading(loadingFunction) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState();
  const [data, setData] = useState();

  async function load() {
    try {
      setLoading(true);
      setData(await loadingFunction());
    } catch (error) {
      setError(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return { loading, data, error, reload: load };
}

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load ${res.status}: ${res.statusText}`);
  }
  return await res.json();
}

function MovieCard({ movie }) {
  const { title, year } = movie;
  return (
    <>
      <h1>{title}</h1>
      <h2>{year}</h2>
    </>
  );
}

function Movies({ changeLogin }) {
  const { loading, error, data } = useLoading(async () =>
    fetchJSON("/api/movies")
  );

  if (loading) {
    return <div>Loading...</div>;
  }
  if (error) {
    return <div>{error.toString()}</div>;
  }
  return (
    <div>
      <button
        onClick={async () => {
          await fetch("/api/logout");
          changeLogin({});
        }}
      >
        Hello
      </button>
      {data.map((movie) => (
        <MovieCard movie={movie} />
      ))}
    </div>
  );
}

function LoginCallback({ reload }) {
  const navigate = useNavigate();
  useEffect(async () => {
    const { access_token } = Object.fromEntries(
      new URLSearchParams(window.location.hash.substring(1))
    );

    const res = await fetch("/api/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ access_token }),
    });
    if (res.ok) {
      reload();
      navigate("/");
    }
  }, []);
  return <div>Please wait</div>;
}

function Profile() {
  const navigate = useNavigate();
  const [loggedOut, setLoggedOut] = useState(false);

  const { loading, data, error } = useLoading(async () => {
    return await fetchJSON("/api/login");
  });

  if (loading) {
    return <div>Loading...</div>;
  }
  if (error) {
    console.log(error);
  }

  return (
    <div>
      <h1>Your profile</h1>
      <h2>{JSON.stringify(data)}</h2>

      <div>{data.userinfo.name}</div>
    </div>
  );
}

function ChatApp() {
  const { userinfo } = useContext(ProfileContext);
  const [ws, setWs] = useState();
  useEffect(() => {
    const ws = new WebSocket("ws://localhost:3000");
    ws.onmessage = (event) => {
      const { author, message } = JSON.parse(event.data);
      setChatLog((prevState) => [...prevState, { author, message }]);
    };

    setWs(ws);
  }, []);

  function handleNewMessage(e) {
    e.preventDefault();
    const chatMessage = { author: userinfo.name, message };
    ws.send(JSON.stringify(chatMessage));
    setMessage("");
  }

  const [message, setMessage] = useState("");
  const [chatLog, setChatLog] = useState([]);
  return (
    <div className={"chatApp"}>
      <div className={"chatHeader"}>Chat application for {userinfo.name}</div>
      <div className={"chatMain"}>
        {chatLog.map((m, index) => {
          return (
            <p key={index}>
              <strong>{m.author}</strong> - {m.message}
            </p>
          );
        })}
      </div>
      <div className={"chatFooter"}>
        <form action="">
          <input
            placeholder={"Write message"}
            onChange={(e) => {
              setMessage(e.target.value);
            }}
            value={message}
          />
          <button onClick={handleNewMessage}>Submit</button>
        </form>
      </div>
    </div>
  );
}

function Application() {
  const [loading, setLoading] = useState(true);
  const [login, setLogin] = useState();
  const navigate = useNavigate();

  async function loadLoginInfo() {
    setLoading(true);
    setLogin(await fetchJSON("/api/login"));
    setLoading(false);
    console.log("used LoadLoginInfo");
  }

  useEffect(loadLoginInfo, []);
  useEffect(() => {
    console.log({ login });
  }, [login]);
  if (loading) {
    return <div>Loading...</div>;
  }
  return (
    <ProfileContext.Provider value={login}>
      <Navbar reload={loadLoginInfo} />
      <Routes className={"app"}>
        <Route path={"/"} element={<Frontpage />} />
        <Route path={"/login"} element={<LoginPage />} />
        <Route
          path={"/login/callback"}
          element={<LoginCallback reload={loadLoginInfo} />}
        />
        <Route path={"/movies"} element={<Movies changeLogin={setLogin} />} />
        <Route path={"/profile"} element={<Profile />} />
        <Route path={"/chat"} element={<ChatApp />} />
      </Routes>
    </ProfileContext.Provider>
  );
}

function Index() {
  return (
    <BrowserRouter>
      <Application />
    </BrowserRouter>
  );
}

ReactDOM.render(<Index />, document.getElementById("app"));
