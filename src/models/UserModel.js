import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true },
  workspaces: [{ type: mongoose.Schema.Types.ObjectId, ref: "Workspace" }],
}, { timestamps: true });

export default mongoose.model("User", UserSchema);
