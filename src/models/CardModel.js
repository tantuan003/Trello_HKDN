import mongoose from "mongoose";

const cardSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: "" },
  list: { type: mongoose.Schema.Types.ObjectId, ref: "List", required: true },
  assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // ai được assign
  labels: [{ type: String }],  // nhãn màu
  dueDate: { type: Date },
  comments: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    text: String,
    createdAt: { type: Date, default: Date.now }
  }],
  attachments: [{ type: String }], // đường dẫn file
}, { timestamps: true });

export default mongoose.model("Card", cardSchema);
