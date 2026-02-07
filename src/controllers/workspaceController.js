import Workspace from "../models/Workspace.js";
import User from "../models/UserModel.js";
import Board from "../models/BoardModel.js";
import Task from "../models/CardModel.js";
import Message from "../models/ListModel.js";

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
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

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

export const getWorkspaceMembers = async (req, res) => {
  try {
    const workspaceId = req.params.workspaceId;
    const userId = req.user.id;

    const workspace = await Workspace.findById(workspaceId)
      .populate("owner", "username email avatar")
      .populate("members.user", "username email avatar");

    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    const seen = new Set();
    const allMembers = [];
    let currentUserRole = null;

    if (workspace.owner) {
      const ownerId = workspace.owner._id.toString();
      if (ownerId === userId) currentUserRole = "owner";

      if (!seen.has(ownerId)) {
        allMembers.push({
          _id: workspace.owner._id,
          username: workspace.owner.username,
          email: workspace.owner.email,
          avatar: workspace.owner.avatar,
          role: "owner",
          memberSubId: null
        });
        seen.add(ownerId);
      }
    }

    workspace.members.forEach(m => {
      if (!m.user) return;
      const memberUserId = m.user._id.toString();
      if (memberUserId === userId) currentUserRole = m.role?.toLowerCase() || "member";

      if (!seen.has(memberUserId)) {
        allMembers.push({
          _id: m.user._id,
          username: m.user.username,
          email: m.user.email,
          avatar: m.user.avatar,
          role: m.role?.toLowerCase() || "member",
          memberSubId: m._id
        });
        seen.add(memberUserId);
      }
    });

    if (!currentUserRole) {
      return res.status(403).json({ message: "You are not part of this workspace" });
    }

    res.json({
      success: true,
      data: {
        currentUserRole,
        members: allMembers
      }
    });
  } catch (err) {
    console.error("ERROR getWorkspaceMembers:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const inviteUserByEmail = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { email, role } = req.body;

    if (!workspaceId) return res.status(400).json({ message: "Missing workspaceId" });
    if (!email) return res.status(400).json({ message: "Missing email" });

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ success: false, message: "Workspace does not exist" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !user._id) {
      return res.status(404).json({ success: false, message: "User does not exist or is invalid" });
    }

    const isMember = workspace.members.some(m => {
      const memberId = m.user?._id ? m.user._id.toString() : m.user?.toString();
      return memberId === user._id.toString();
    });
    if (isMember) {
      return res.status(400).json({ success: false, message: "User is already a member of this workspace" });
    }

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
      message: `Invited ${user.username} to the workspace as ${role || "member"}`,
      invitedUser: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: role || "member"
      }
    });
  } catch (err) {
    console.error("ERROR inviteUserByEmail:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

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

    const isOwner = workspace.owner && workspace.owner.toString() === userId.toString();
    const isMember = workspace.members.some(
      m => m.user && m.user.toString() === userId.toString()
    );

    if (!isOwner && !isMember) {
      return res.status(403).json({ success: false, message: "No permission to update this workspace" });
    }

    workspace.name = name;
    await workspace.save();

    return res.json({ success: true, name });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const updateWorkspaceVisibility = async (req, res) => {
  try {
    const userId = req.user._id;
    const { workspaceId } = req.params;
    const { visibility } = req.body;

    if (!['private', 'public'].includes(visibility)) {
      return res.status(400).json({ success: false, message: "Invalid visibility value" });
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ success: false, message: "Workspace not found" });
    }

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

    const user = await User.findById(userId);
    if (user) {
      user.workspaces.push(workspace._id);
      await user.save();
    }

    res.status(201).json({
      success: true,
      data: workspace
    });

  } catch (err) {
    console.error("ERROR createWorkspace:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

export const updateMemberRole = async (req, res) => {
  try {
    const { workspaceId, memberId } = req.params;
    const { role } = req.body;

    if (!["admin", "member"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const workspace = req.workspace;

    const member = workspace.members.find(
      m => m.user.toString() === memberId
    );

    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }

    member.role = role;
    await workspace.save();

    res.json({ success: true, message: "Role updated successfully" });

  } catch (err) {
    console.error("updateMemberRole error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteWorkspace = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user._id;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ success: false, message: "Workspace does not exist" });
    }

    if (workspace.owner.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "You do not have permission to delete this workspace" });
    }

    await Board.deleteMany({ workspace: workspaceId });
    await Task.deleteMany({ workspace: workspaceId });
    await Message.deleteMany({ workspace: workspaceId });

    await User.updateMany(
      { workspaces: workspaceId },
      { $pull: { workspaces: workspaceId } }
    );

    await Workspace.findByIdAndDelete(workspaceId);

    return res.json({ success: true, message: "Workspace and related data deleted successfully" });
  } catch (err) {
    console.error("ERROR deleteWorkspace:", err);
    res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

export async function removeMember(req, res) {
  try {
    const { workspaceId, memberId } = req.params;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) return res.status(404).json({ message: "Workspace not found" });

    const idx = workspace.members.findIndex(m => m._id.toString() === memberId);
    if (idx === -1) return res.status(404).json({ message: "Member not found" });

    const member = workspace.members[idx];
    if (member.role === "owner") {
      return res.status(403).json({ message: "Cannot remove the owner" });
    }

    workspace.members.splice(idx, 1);
    await workspace.save();

    return res.json({ message: "Member removed successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
}
