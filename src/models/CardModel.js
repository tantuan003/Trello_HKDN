import mongoose from "mongoose";

const cardSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: "" },
  list: { type: mongoose.Schema.Types.ObjectId, ref: "List", required: true },
  assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  labels: [{ type: String }],
  dueDate: { type: Date },
  position: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  comments: [{
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  text: String,
  createdAt: Date
}]
,
   attachments: [
    {
      name: String,
      data: String
    }
  ]
}, { timestamps: true });

export default mongoose.model("Card", cardSchema);
