export function initProfile() {
  const uploadInput = document.getElementById("upload-photo");
  const profileImg = document.getElementById("profile-img");
  const defaultInitial = document.getElementById("default-initial");
  const dropdownMenu = document.getElementById("dropdown-menu");
  const uploadBtn = document.getElementById("upload-avatar");
  const deleteBtn = document.getElementById("delete-avatar");
  const profilePhoto = document.getElementById("profile-photo");
  const usernameInput = document.getElementById("username");
  const currentPasswordInput = document.getElementById("current-password");
  const newPasswordInput = document.getElementById("new-password");
  const retypePasswordInput = document.getElementById("retype-password");
  const retypeWarning = document.getElementById("retype-warning");
  const saveBtn = document.getElementById("save-all");

  let originalAvatar = "";

  // Avatar & Initial
  function updateInitial() {
    const username = usernameInput.value.trim();
    defaultInitial.textContent = username ? username[0].toUpperCase() : "?";
  }

  updateInitial();
  usernameInput.addEventListener("input", updateInitial);

  profilePhoto.addEventListener("click", e => {
    e.stopPropagation();
    dropdownMenu.classList.toggle("show");
  });

  document.addEventListener("click", e => {
    if (!profilePhoto.contains(e.target)) dropdownMenu.classList.remove("show");
  });

  uploadBtn.addEventListener("click", () => uploadInput.click());

  uploadInput.addEventListener("change", e => {
    const file = e.target.files?.[0];
    if (file) {
      profileImg.src = URL.createObjectURL(file);
      profileImg.style.display = "block";
      defaultInitial.style.display = "none";
      dropdownMenu.classList.remove("show");
    }
  });

  deleteBtn.addEventListener("click", () => {
    if (originalAvatar) {
      profileImg.src = originalAvatar;
      profileImg.style.display = "block";
      defaultInitial.style.display = "none";
    } else {
      profileImg.src = "";
      profileImg.style.display = "none";
      defaultInitial.style.display = "block";
    }
    uploadInput.value = "";
    dropdownMenu.classList.remove("show");
  });

  // Load user data
  (async () => {
    try {
      const res = await fetch("/v1/User/me", { credentials: "include" });
      const user = await res.json();
      usernameInput.value = user.username || "";
      document.getElementById("email").value = user.email || "";
      if (user.avatar) {
        originalAvatar = user.avatar;
        profileImg.src = user.avatar;
        profileImg.style.display = "block";
        defaultInitial.style.display = "none";
      }
      updateInitial();
    } catch (err) {
      console.error(err);
    }
  })();

  // Password match
  function checkRetypeMatch() {
    if (retypePasswordInput.value && retypePasswordInput.value !== newPasswordInput.value) {
      retypeWarning.style.display = "block";
    } else {
      retypeWarning.style.display = "none";
    }
  }

  newPasswordInput.addEventListener("input", checkRetypeMatch);
  retypePasswordInput.addEventListener("input", checkRetypeMatch);

  // Save all
  saveBtn.addEventListener("click", async () => {
    const username = usernameInput.value.trim();
    const file = uploadInput.files[0];
    const currentPassword = currentPasswordInput.value.trim();
    const newPassword = newPasswordInput.value.trim();
    const retypePassword = retypePasswordInput.value.trim();

    // Password check
    if (newPassword || retypePassword || currentPassword) {
      if (!currentPassword || !newPassword || !retypePassword) {
        alert("Vui lòng nhập đầy đủ mật khẩu để đổi");
        return;
      }
      if (newPassword !== retypePassword) {
        alert("Mật khẩu mới và nhập lại không khớp");
        return;
      }

      try {
        const res = await fetch("/v1/User/change-password", {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ oldPassword: currentPassword, newPassword })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Change password failed");
        alert("Đổi mật khẩu thành công!");
        currentPasswordInput.value = "";
        newPasswordInput.value = "";
        retypePasswordInput.value = "";
        retypeWarning.style.display = "none";
      } catch (err) {
        alert("Change password error: " + err.message);
        return;
      }
    }

    // Update username/avatar
    if (username || file) {
      const formData = new FormData();
      if (username) formData.append("username", username);
      if (file) formData.append("avatar", file);

      try {
        const res = await fetch("/v1/User/me", {
          method: "PUT",
          credentials: "include",
          body: formData
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Update profile failed");
        alert("Cập nhật thông tin thành công!");
        if (data.user?.avatar) {
          profileImg.src = data.user.avatar;
          profileImg.style.display = "block";
          defaultInitial.style.display = "none";
          originalAvatar = data.user.avatar;
        }
      } catch (err) {
        alert("Update profile error: " + err.message);
      }
    }
  });
}
