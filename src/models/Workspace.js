import mongoose from "mongoose";

const workspaceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  boards: {
    type: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Board"
      }
    ],
    default: []
  },

  members: { 
    type: [
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
      }], 
      default: [] 
    },
  visibility: {
    type: String,
    enum: ["private", "public"],
    default: "private"
  },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Workspace", workspaceSchema);
