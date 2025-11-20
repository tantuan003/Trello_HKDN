import Workspace from "../models/Workspace.js";

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
