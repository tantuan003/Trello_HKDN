import { API_BASE } from "../js/config.js";

const form = document.getElementById("registerForm");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  // Kiểm tra confirm password
  if (password !== confirmPassword) {
    Toastify({
      text: "Mật khẩu xác nhận không khớp!",
      duration: 2000,
      gravity: "top",
      position: "right",
      close: true,
      style: { background: "#FF9800" }
    }).showToast();
    return;
  }

  const data = { username, email, password };

  try {
    const res = await fetch(`${API_BASE}/v1/User/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    const result = await res.json();

    if (res.ok && result.success) {
      Toastify({
        text: "Đăng ký thành công!",
        duration: 2000,
        gravity: "top",
        position: "right",
        close: true,
        style: { background: "linear-gradient(to right, #00b09b, #96c93d)" }
      }).showToast();

      setTimeout(() => {
        window.location.href = "/Login.html";
      }, 2000);

    } else {
      Toastify({
        text: result.message || "Đăng ký thất bại!",
        duration: 2000,
        gravity: "top",
        position: "right",
        close: true,
        style: { background: "#F44336" }
      }).showToast();
    }
  } catch (err) {
    console.error(err);
    Toastify({
      text: "Lỗi kết nối đến server!",
      duration: 2000,
      gravity: "top",
      position: "right",
      close: true,
      style: { background: "#9C27B0" }
    }).showToast();
  }
});
