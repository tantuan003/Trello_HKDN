import mongoose from "mongoose";

const workspaceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  visibility: {
    type: String,
    enum: ["private", "public"],
    default: "private"
  },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Workspace", workspaceSchema);
