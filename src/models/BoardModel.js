import mongoose from "mongoose";

const boardSchema = new mongoose.Schema({
  name: { type: String, required: true },
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  lists: [{ type: mongoose.Schema.Types.ObjectId, ref: "List" }],
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Board", boardSchema);
