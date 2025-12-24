import User from "../models/UserModel.js";
import Workspace from "../models/Workspace.js";
import bcrypt from "bcrypt";

export const registerUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "Thiếu dữ liệu bắt buộc" });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: "Email đã được sử dụng" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username,
      email: email.toLowerCase(),
      password: hashedPassword,
      workspaces: []
    });

    await newUser.save();

    const workspace = new Workspace({
      name: `Workspace của ${username}`,
      owner: newUser._id,
      members: [
        { user: newUser._id, role: "owner", joinedAt: new Date() }
      ]
    });

    await workspace.save();

    newUser.workspaces.push(workspace._id);
    await newUser.save();

    res.status(201).json({ success: true, message: "Đăng ký thành công", user: newUser });

  } catch (error) {
    console.error("ERROR registerUser:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

