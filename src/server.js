import http from "http";
import { Server } from "socket.io";
import express from "express";

const app = express();

app.set("view engine", "pug");
app.set("views", __dirname + "/views");
app.use("/public", express.static(__dirname + "/public"));
app.get("/", (req, res) => res.render("home"));
app.get("/*", (req, res) => res.redirect("home"));

const http_server = http.createServer(app);
const io = new Server(http_server);

io.on("connection", (socket) => {
    socket.on("join_room", (payload) => {
        socket.join(payload.room_name);
        socket.to(payload.room_name).emit("welcome");
    });

    socket.on("offer", ({ offer, room_name }) => {
        socket.to(room_name).emit("offer", { offer, room_name });
    });

    socket.on("answer", ({ answer, room_name }) => {
        socket.to(room_name).emit("answer", { answer });
    });

    socket.on("ice", ({ ice, room_name }) => {
        socket.to(room_name).emit("ice", { ice });
    });
});

http_server.listen(3000, () =>
    console.log("listening on http://localhost:3000")
);
