import Workspace from "../models/Workspace.js";
import User from "../models/UserModel.js";

// 1. Lấy tất cả workspace của user đang login
export const getUserWorkspaces = async (req, res) => {
  try {
    const user = req.user;

    const workspaces = await Workspace.find({
      _id: { $in: user.workspaces }
    }).select("_id name visibility");

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
      .populate("owner", "username email avatar ")
      .populate("members.user", "username email avatar");

    if (!workspace) {
      return res.status(404).json({ message: "Workspace không tồn tại" });
    }

    const seen = new Set();
    const allMembers = [];

    // Owner
    if (workspace.owner && !seen.has(workspace.owner._id.toString())) {
      allMembers.push({
        _id: workspace.owner._id,
        username: workspace.owner.username,
        email: workspace.owner.email,
        avatar: workspace.owner.avatar,
        role: "Owner"
      });
      seen.add(workspace.owner._id.toString());
    }

    // Members
    workspace.members.forEach(m => {
      if (!m.user) return; // tránh crash nếu user bị xóa
      if (!seen.has(m.user._id.toString())) {
        allMembers.push({
          _id: m.user._id,
          username: m.user.username,
          email: m.user.email,
          avatar: m.user.avatar,
          role: m.role || "Member"
        });
        seen.add(m.user._id.toString());
      }
    });


    res.json({
      success: true,
      data: allMembers
    });


  } catch (err) {
    console.error("ERROR getWorkspaceMembers:", err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// 3. Mời user vào workspace theo email
export const inviteUserByEmail = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { email, role } = req.body;

    if (!workspaceId) return res.status(400).json({ message: "workspaceId thiếu" });
    if (!email) return res.status(400).json({ message: "Email thiếu" });

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) return res.status(404).json({ message: "Workspace không tồn tại" });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ message: "User không tồn tại" });

    // Kiểm tra user đã có trong workspace chưa
    const isMember = workspace.members.some(
      m => m.user && m.user.toString() === user._id.toString()
    );
    if (isMember) return res.status(400).json({ message: "User đã có trong workspace" });

    // 🔹 Thêm user đúng schema
    workspace.members.push({
      user: user._id,
      role: role || "member",
      joinedAt: new Date()
    });

    await workspace.save();

    res.json({ message: `Đã mời ${user.username} vào workspace với vai trò ${role || "member"}` });

  } catch (err) {
    console.error("ERROR inviteUserByEmail:", err);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};


// 4. Cập nhật tên workspace
export const updateWorkspaceName = async (req, res) => {
  try {
    const userId = req.user._id;
    const { name } = req.body;
    const { workspaceId } = req.params;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Name cannot be empty" });
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ success: false, message: "Workspace not found" });
    }

    // Kiểm tra quyền user
    const members = Array.isArray(workspace.members) ? workspace.members : [];
    const isMember = members.some(m => m && m.toString() === userId.toString());
    const isOwner = workspace.ownerId && workspace.ownerId.toString() === userId.toString();

    if (!isOwner && !isMember) {
      return res.status(403).json({ success: false, message: "No permission to update this workspace" });
    }

    // Cập nhật tên workspace
    workspace.name = name;
    await workspace.save();

    return res.json({ success: true, name });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// 5. Cập nhật trạng thái công khai/riêng tư của workspace
export const updateWorkspaceVisibility = async (req, res) => {
  try {
    const userId = req.user._id;  // user được xác thực từ middleware verifyToken
    const { workspaceId } = req.params;
    const { visibility } = req.body;

    if (!['private', 'public'].includes(visibility)) {
      return res.status(400).json({ success: false, message: "Invalid visibility value" });
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ success: false, message: "Workspace not found" });
    }

    // Kiểm tra quyền: chỉ owner mới được đổi visibility
    if (workspace.owner.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "No permission to update visibility" });
    }

    workspace.visibility = visibility;
    await workspace.save();

    res.json({ success: true, visibility });
  } catch (error) {
    console.error("Error updateWorkspaceVisibility:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


// tạo work mới

export const createWorkspace = async (req, res) => {
  try {
    const { name } = req.body;
    const userId = req.user?.id;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    if (!name) return res.status(400).json({ message: "Workspace name is required" });

    // Tạo workspace mới
    const workspace = new Workspace({
      name,
      owner: userId,
      members: [
        {
          user: userId,
          role: "owner",
          joinedAt: new Date()
        }
      ],
      visibility: "private"
    });

    await workspace.save();

    // Cập nhật user để lưu reference workspace
    const user = await User.findById(userId);
    if (user) {
      user.workspaces.push(workspace._id);
      await user.save();
    }

    res.status(201).json({
      success: true,
      message: "Workspace created successfully",
      data: workspace
    });

  } catch (err) {
    console.error("ERROR createWorkspace:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

