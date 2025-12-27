import mongoose, { Schema } from "mongoose";

const ActivitySchema = new Schema(
  {
    boardId: {
      type: Schema.Types.ObjectId,
      ref: "Board",
      required: true
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    action: {
      type: String,
      required: true
      // enum: [...]  // có thể thêm sau
    },

    target: {
      type: {
        type: String,       // board | list | card | member
      },
      id: {
        type: Schema.Types.ObjectId
      },
      title: {
        type: String
      }
    },

    data: {
      oldValue: String,
      newValue: String,
      extra: Schema.Types.Mixed
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

export default mongoose.model("Activity", ActivitySchema);
