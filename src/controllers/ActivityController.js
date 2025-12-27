// controllers/ActivityController.js
import Activity from "../models/ActivityModel.js";

export const getBoardActivities = async (req, res) => {
  try {
    const { boardId } = req.params;
    const limit = parseInt(req.query.limit) || 20;

    const activities = await Activity.find({ boardId })
      .sort({ createdAt: -1 })        // mới nhất lên đầu
      .limit(limit)
      .populate("userId", "username avatar email")
      .lean();

    res.json(activities);
  } catch (err) {
    console.error("Get activities error:", err);
    res.status(500).json({ message: "Failed to get activities" });
  }
};
