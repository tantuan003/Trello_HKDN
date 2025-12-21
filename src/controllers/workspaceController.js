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

// 
export const getWorkspaceById = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ success: false, message: "Workspace not found" });
    }
    res.json(workspace);
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};


// 2. Lấy danh sách thành viên theo workspaceId
export const getWorkspaceMembers = async (req, res) => {
  try {
    const workspaceId = req.params.workspaceId;

    const workspace = await Workspace.findById(workspaceId)
      .populate("owner", "username email avatar")        
      .populate("members", "username email role avatar"); 

    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    const seen = new Set();
    const allMembers = [];

    // Owner
    if (workspace.owner && !seen.has(workspace.owner._id.toString())) {
      allMembers.push({
        _id: workspace.owner._id,
        username: workspace.owner.username,
        email: workspace.owner.email,
        role: "Owner",
        avatar: workspace.owner.avatar || null
      });
      seen.add(workspace.owner._id.toString());
    }

    // Members
    workspace.members.forEach(m => {
      if (!seen.has(m._id.toString())) {
        allMembers.push({
          _id: m._id,
          username: m.username,
          email: m.email,
          role: m.role || "Member",
          avatar: m.avatar || null
        });
        seen.add(m._id.toString());
      }
    });

    res.json(allMembers);

  } catch (err) {
    console.error("ERROR getWorkspaceMembers:", err);
    res.status(500).json({ message: "Server error", error: err.message });
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




