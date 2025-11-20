import { io } from "https://cdn.socket.io/4.7.2/socket.io.esm.min.js";
export const socket = io("http://localhost:8127", {
    withCredentials: true,
    autoConnect: true
});
