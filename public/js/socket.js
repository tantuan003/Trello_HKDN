import { io } from "https://cdn.socket.io/4.7.2/socket.io.esm.min.js";
import { SOCKET_URL } from "../js/config.js";
export const socket = io(SOCKET_URL, {
    withCredentials: true // cookie sẽ tự gửi
});

socket.on("connect_error", (err) => {
    console.error("Socket connect error:", err.message);
});
