const io = require("socket.io")(3000, {
  cors: {
    origin: true,
  },
});

const userSocketIdMap = new Map();

function newUser(socket) {
  const users = [];

  for (let [username, userID] of userSocketIdMap.entries()) {
    if (userID === socket.id) continue;
    users.push({
      userID,
      username,
    });
  }

  socket.emit("set user", {
    userID: socket.id,
    username: socket.username,
  });

  socket.broadcast.emit("new user", {
    userID: socket.id,
    username: socket.username,
  });

  socket.emit("users", users);
};

function serverLog(msg) {
  console.log(`[Server] ${msg}`);
  console.log(`Connected Users: ${userSocketIdMap.size}`);
};

io.use((socket, next) => {
  const username = socket.handshake.auth.username;
  if (!username || username.length <= 1) {
    return next(new Error("invalid username"));
  } else if (!socket.username && userSocketIdMap.has(username)) {
    console.log("username taken");
    return next(new Error("username taken"));
  } else {
    userSocketIdMap.set(username, socket.id);
    socket.username = username;
    serverLog(`New client: ${username}`);
    next();
  }
});

io.on("connection", socket => {
  newUser(socket);

  socket.on("disconnect", reason => {
    userSocketIdMap.delete(socket.username)
    serverLog(`${socket.username} left: ${reason}`);
    socket.broadcast.emit("remove user", socket.id);
  });

  socket.on("request sound", ({victims, soundID}) => {
    console.log(`[Action] ${socket.username} requested: ${soundID}`);
    victims.forEach(victim => {
      io.to(victim).emit("play sound", {sender: socket.username, soundID});
    });
  });
});
