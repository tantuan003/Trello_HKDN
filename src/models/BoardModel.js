import mongoose from "mongoose";

const boardSchema = new mongoose.Schema({
  name: { type: String, required: true },
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  background: { type: String, default: "gradient-1" },
  visibility: {
    type: String,
    enum: ["private", "workspace", "public"],
    default: "private"
  },
  lists: [{ type: mongoose.Schema.Types.ObjectId, ref: "List" }],
  members: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
      },
      role: {
        type: String,
        enum: ["owner", "admin", "member"],
        default: "member"
      },
      joinedAt: {
        type: Date,
        default: Date.now
      }
    }
  ]
  ,

  // ⭐ thêm vào đây
  lastViewedAt: { type: Date, default: null },

  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Board", boardSchema);
