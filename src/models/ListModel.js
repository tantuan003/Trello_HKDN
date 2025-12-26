import mongoose from "mongoose";

const listSchema = new mongoose.Schema({
  name: { type: String, required: true },
  board: { type: mongoose.Schema.Types.ObjectId, ref: "Board", required: true },
  cards: [{ type: mongoose.Schema.Types.ObjectId, ref: "Card" }], 
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  // chứa nhiều card
},
  { timestamps: true });

export default mongoose.model("List", listSchema);
