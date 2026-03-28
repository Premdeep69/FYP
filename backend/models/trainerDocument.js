import mongoose from "mongoose";

const trainerDocumentSchema = new mongoose.Schema(
  {
    trainerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number },
    data: { type: String, required: true }, // base64 data URL
  },
  { timestamps: true }
);

trainerDocumentSchema.index({ trainerId: 1 });

export default mongoose.model("TrainerDocument", trainerDocumentSchema);
