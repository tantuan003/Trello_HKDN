document.addEventListener("DOMContentLoaded", async () => {
  await loadNav("profile");

  const uploadInput = document.getElementById("upload-photo");
  const profileImg = document.getElementById("profile-img");
  const cancelBtn = document.getElementById("cancel-photo");
  const defaultInitial = document.getElementById("default-initial");
  const usernameInput = document.getElementById("username");

  function updateInitial() {
    const username = usernameInput.value.trim();
    defaultInitial.textContent = username ? username[0].toUpperCase() : "?";
  }
  updateInitial();
  usernameInput.addEventListener("input", updateInitial);

  uploadInput.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      profileImg.src = url;
      profileImg.style.display = "block";
      defaultInitial.style.display = "none";
      cancelBtn.style.display = "block";
    }
  });

  cancelBtn.addEventListener("click", () => {
    profileImg.src = "";
    profileImg.style.display = "none";
    defaultInitial.style.display = "block";
    cancelBtn.style.display = "none";
    uploadInput.value = "";
  });

  // ---------------- Load user info ----------------
  try {
    const res = await fetch("/v1/User/me", { credentials: "include" });
    const user = await res.json();
    console.log("USER:", user);

    document.getElementById("username").value = user.username || "";
    document.getElementById("email").value = user.email || "";

    if (user.avatar) {
      profileImg.src = user.avatar;
      profileImg.style.display = "block";
      defaultInitial.style.display = "none";
    }

    updateInitial();
  } catch (err) {
    console.error("Không thể tải thông tin người dùng:", err);
  }

  // Upload photo và chỉnh sửa username
  document.querySelector(".profile-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value.trim();
    const email = document.getElementById("email").value;
    const file = uploadInput.files[0];

    try {
      const formData = new FormData();
      if (username) formData.append("username", username);
      formData.append("email", email); 
      if (file) formData.append("avatar", file);

      const res = await fetch("/v1/User/me", {
        method: "PUT",
        credentials: "include",
        body: formData
      });

      const data = await res.json();
      if (res.ok) {
        alert("✅ " + data.message);
        if (data.user && data.user.avatar) {
          profileImg.src = "/" + data.user.avatar;
          profileImg.style.display = "block";
          defaultInitial.style.display = "none";
        }
      } else {
        alert("❌ " + data.message);
      }
    } catch (err) {
      console.error("Lỗi khi gửi dữ liệu:", err);
    }
  });

  // Đổi mật khẩu
  document.querySelector(".btn-change").addEventListener("click", async () => {
    const oldPassword = document.getElementById("old-password").value;
    const newPassword = document.getElementById("new-password").value;

    if (!oldPassword || !newPassword) {
      alert("❌ Vui lòng nhập đầy đủ mật khẩu cũ và mới");
      return;
    }

    try {
      const res = await fetch("/v1/User/change-password", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPassword, newPassword })
      });

      const data = await res.json();
      if (res.ok) {
        alert("✅ " + data.message);
      } else {
        alert("❌ " + data.message);
      }
    } catch (err) {
      console.error("Lỗi khi đổi mật khẩu:", err);
    }
  });

});
