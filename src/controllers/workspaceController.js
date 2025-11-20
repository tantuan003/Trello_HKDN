import Workspace from "../models/Workspace.js";
import User from "../models/UserModel.js";

// 1. Lấy tất cả workspace của user đang login
export const getUserWorkspaces = async (req, res) => {
  try {
    const user = req.user;

    const workspaces = await Workspace.find({
      _id: { $in: user.workspaces }
    });

    res.json(workspaces);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// 2. Lấy danh sách thành viên theo workspaceId
export const getWorkspaceMembers = async (req, res) => {
  try {
    const workspaceId = req.params.workspaceId;

    const workspace = await Workspace.findById(workspaceId)
      .populate("members");
    if (!workspace) {
      return res.status(404).json({ message: "Workspace không tồn tại" });
    }

    res.json(workspace.members);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// 3. Mời user vào workspace theo email
export const inviteUserByEmail = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { email } = req.body;

    if (!workspaceId) return res.status(400).json({ message: "workspaceId thiếu" });
    if (!email) return res.status(400).json({ message: "Email thiếu" });

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) return res.status(404).json({ message: "Workspace không tồn tại" });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ message: "User không tồn tại" });

    // Kiểm tra user đã có trong workspace chưa
    const isMember = workspace.members.some(m => m.toString() === user._id.toString());
    if (isMember) return res.status(400).json({ message: "User đã có trong workspace" });

    // Thêm user vào workspace
    workspace.members.push(user._id);
    await workspace.save();

    // Thêm workspace vào user nếu chưa có
    const hasWorkspace = user.workspaces.some(w => w.toString() === workspace._id.toString());
    if (!hasWorkspace) {
      user.workspaces.push(workspace._id);
      await user.save();
    }

    res.json({ message: `Đã mời ${user.username} vào workspace` });

  } catch (err) {
    console.error("ERROR inviteUserByEmail:", err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};


