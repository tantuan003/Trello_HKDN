import Workspace from "../models/Workspace.js";

export const checkOwnerWorkspace = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { workspaceId } = req.params;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    const isOwner = workspace.owner?.toString() === userId;

    if (!isOwner) {
      return res.status(403).json({ message: "Only owner can edit roles" });
    }

    req.workspace = workspace;
    next();

  } catch (err) {
    console.error("checkOwnerWorkspace error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
