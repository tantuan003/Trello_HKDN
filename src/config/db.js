import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config(); // nạp biến môi trường

const connectDB = async () => {
  try {
    console.log("🔍 MONGO_URI =", process.env.MONGO_URI); // kiểm tra có đọc được không
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

export default connectDB;
