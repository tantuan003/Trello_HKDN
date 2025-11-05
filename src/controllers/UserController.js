import User from "../models/UserModel.js";
import Workspace from "../models/Workspace.js";
import bcrypt from "bcrypt";

export const registerUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Kiểm tra email đã tồn tại chưa
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email đã được sử dụng" });
    }

    // Hash mật khẩu
    const hashedPassword = await bcrypt.hash(password, 10);

    // Tạo user mới
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
    });

    await newUser.save();
    const workspace = new Workspace({
      name: `Workspace của ${username}`,
      owner: newUser._id,
      members: [newUser._id],
    });
    await workspace.save();

    // 3️⃣ Cập nhật user để lưu reference workspace
    newUser.workspaces.push(workspace._id);
    await newUser.save();
    res.status(201).json({ message: "Đăng ký thành công", user: newUser });
  } catch (error) {
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};
