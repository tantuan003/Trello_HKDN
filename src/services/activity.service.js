import Activity from "../models/ActivityModel.js";

/**
 * Log activity cho board
 * @param {Object} payload
 * @param {ObjectId} payload.boardId   - bắt buộc
 * @param {ObjectId} payload.userId    - bắt buộc
 * @param {String} payload.action      - bắt buộc
 * @param {Object} payload.target      - optional
 * @param {Object} payload.data        - optional
 */
export const logActivity = async ({
  boardId,
  userId,
  action,
  target = null,
  data = null
}) => {
  // ✅ validate tối thiểu
  if (!boardId || !userId || !action) {
    console.warn("[ActivityLog] Missing required fields", {
      boardId,
      userId,
      action
    });
    return;
  }

  try {
    await Activity.create({
      boardId,
      userId,
      action,
      target,
      data,
      createdAt: new Date()
    });
  } catch (err) {
    // ❗ log lỗi nhưng KHÔNG throw
    console.error("[ActivityLog] Failed to log activity", err);
  }
};
