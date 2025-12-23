import Workspace from "../models/Workspace.js";
import User from "../models/UserModel.js";

// 1. Lấy tất cả workspace của user đang login
export const getUserWorkspaces = async (req, res) => {
  try {
    const userId = req.user._id;

    const workspaces = await Workspace.find({
      $or: [
        { owner: userId },
        { "members.user": userId }
      ]
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
    const userId = req.user.id; // 🔥 user đang đăng nhập (verifyToken)

    const workspace = await Workspace.findById(workspaceId)
      .populate("owner", "username email avatar")
      .populate("members.user", "username email avatar");

    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    const seen = new Set();
    const allMembers = [];
    let currentUserRole = null;

    // Owner
    if (workspace.owner) {
      const ownerId = workspace.owner._id.toString();

      if (ownerId === userId) {
        currentUserRole = "owner";
      }

      if (!seen.has(ownerId)) {
        allMembers.push({
          _id: workspace.owner._id,
          username: workspace.owner.username,
          email: workspace.owner.email,
          avatar: workspace.owner.avatar,
          role: "owner"
        });
        seen.add(ownerId);
      }
    }

    // 👥 Members
    workspace.members.forEach(m => {
      if (!m.user) return;

      const memberId = m.user._id.toString();

      if (memberId === userId) {
        currentUserRole = m.role?.toLowerCase() || "member";
      }

      if (!seen.has(memberId)) {
        allMembers.push({
          _id: m.user._id,
          username: m.user.username,
          email: m.user.email,
          avatar: m.user.avatar,
          role: m.role?.toLowerCase() || "member"
        });
        seen.add(memberId);
      }
    });

    // ❌ Không phải member
    if (!currentUserRole) {
      return res.status(403).json({ message: "Bạn không thuộc workspace này" });
    }

    res.json({
      success: true,
      data: {
        currentUserRole, // 🔥 FRONTEND CẦN
        members: allMembers
      }
    });

  } catch (err) {
    console.error("ERROR getWorkspaceMembers:", err);
    res.status(500).json({ message: "Server error", error: err.message });
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
    if (!workspace) {
      return res.status(404).json({ success: false, message: "Workspace không tồn tại" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !user._id) {
      return res.status(404).json({ success: false, message: "User không tồn tại hoặc không hợp lệ" });
    }

    // ✅ Kiểm tra user đã có trong workspace chưa
    const isMember = workspace.members.some(m => {
      const memberId = m.user?._id ? m.user._id.toString() : m.user?.toString();
      return memberId === user._id.toString();
    });
    if (isMember) {
      return res.status(400).json({ success: false, message: "User đã có trong workspace" });
    }

    // 🔹 Thêm user vào members
    workspace.members.push({
      user: user._id,
      role: role || "member",
      joinedAt: new Date()
    });

    await workspace.save();

    if (!user.workspaces.includes(workspace._id)) { 
      user.workspaces.push(workspace._id); 
      await user.save(); 
    }

    return res.json({
      success: true,
      message: `Đã mời ${user.username} vào workspace với vai trò ${role || "member"}`,
      invitedUser: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: role || "member"
      }
    });
  } catch (err) {
    console.error("ERROR inviteUserByEmail:", err);
    res.status(500).json({ success: false, message: "Lỗi server", error: err.message });
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

// edit role cho workspace owner

export const updateMemberRole = async (req, res) => {
  try {
    const { workspaceId, memberId } = req.params;
    const { role } = req.body;

    if (!["admin", "member"].includes(role)) {
      return res.status(400).json({ message: "Role không hợp lệ" });
    }

    const workspace = req.workspace; // từ middleware checkOwnerWorkspace

    const member = workspace.members.find(
      m => m.user.toString() === memberId
    );

    if (!member) {
      return res.status(404).json({ message: "Member không tồn tại" });
    }

    member.role = role;
    await workspace.save();

    res.json({ success: true, message: "Cập nhật role thành công" });

  } catch (err) {
    console.error("updateMemberRole error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

import Board from "../models/BoardModel.js"; 
import Task from "../models/CardModel.js";  
import Message from "../models/ListModel.js"; 

export const deleteWorkspace = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user._id; // user đang đăng nhập

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ success: false, message: "Workspace không tồn tại" });
    }

    // Chỉ owner mới được xóa
    if (workspace.owner.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Bạn không có quyền xóa workspace này" });
    }

    // Xóa các dữ liệu liên quan
    await Board.deleteMany({ workspace: workspaceId });
    await Task.deleteMany({ workspace: workspaceId });
    await Message.deleteMany({ workspace: workspaceId });

    // Gỡ workspace khỏi tất cả user
    await User.updateMany(
      { workspaces: workspaceId },
      { $pull: { workspaces: workspaceId } }
    );

    // Xóa workspace chính
    await Workspace.findByIdAndDelete(workspaceId);

    return res.json({ success: true, message: "Xóa workspace và dữ liệu liên quan thành công" });
  } catch (err) {
    console.error("ERROR deleteWorkspace:", err);
    res.status(500).json({ success: false, message: "Lỗi server", error: err.message });
  }
};

