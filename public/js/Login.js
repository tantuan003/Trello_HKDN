const loginForm = document.getElementById('loginForm');
const loginButton = document.getElementById('login');

loginButton.addEventListener('click', async (e) => {
  e.preventDefault(); // Ngăn submit mặc định nếu dùng button type submit

  // Lấy dữ liệu từ input
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  // Kiểm tra dữ liệu rỗng
  if (!email || !password) {
    alert("Vui lòng nhập đầy đủ email và mật khẩu");
    return;
  }

  try {
    const response = await fetch('http://localhost:8127/v1/User/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const result = await response.json();
    
    if (response.ok) {
      alert("Đăng nhập thành công!");
      console.log(result);
      // Lưu token nếu server trả về
      if (result.token) {
        localStorage.setItem('token', result.token);
      }
      // Chuyển hướng sau đăng nhập
      window.location.href = '/home.html';
    } else {
      alert(result.message || "Đăng nhập thất bại");
    }
  } catch (err) {
    console.error(err);
    alert("Lỗi kết nối server");
  }
});
document.addEventListener("DOMContentLoaded", () => {
  if (typeof initYetiAnimation === "function") {
    initYetiAnimation(); 
  }
});
