import { API_BASE } from "../js/config.js";

const loginForm = document.getElementById('loginForm');
const loginButton = document.getElementById('login');

loginButton.addEventListener('click', async (e) => {
  e.preventDefault();

  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  // Kiểm tra rỗng
  if (!email || !password) {
    Toastify({
      text: "Vui lòng nhập đầy đủ email và mật khẩu!",
      duration: 2000,
      gravity: "top",
      position: "right",
      backgroundColor: "#FF9800",
      close: true
    }).showToast();
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/v1/User/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include'
    });

    const result = await response.json();

    if (response.ok) {
      Toastify({
        text: "Đăng nhập thành công!",
        duration: 2000,
        gravity: "top",
        position: "right",
        close: true,
        backgroundColor: "linear-gradient(to right, #00b09b, #96c93d)"
      }).showToast();

      if (result.token) {
        localStorage.setItem('token', result.token);
      }

      // Chuyển hướng sau khi hiển thị thông báo một chút
      setTimeout(() => {
        window.location.href = '/home.html';
      }, 1000);
    } else {
      Toastify({
        text: result.message || "Đăng nhập thất bại!",
        duration: 2000,
        gravity: "top",
        position: "right",
        backgroundColor: "#F44336",
        close: true
      }).showToast();
    }
  } catch (err) {
    console.error(err);
    Toastify({
      text: "Lỗi kết nối đến server!",
      duration: 2000,
      gravity: "top",
      position: "right",
      backgroundColor: "#9C27B0",
      close: true
    }).showToast();
  }
});
