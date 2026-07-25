import mongoose, { Schema, type InferSchemaType } from "mongoose";

const domainSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    domain: { type: String, required: true, lowercase: true, trim: true },
    mailcowStatus: {
      type: String,
      enum: ["provisioned", "failed"],
      default: "provisioned",
    },
    dnsVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Same ownership-scoping shape as rentlog's boostModel.js: compound unique
// index on the tenant field (userId) + the resource (domain).
domainSchema.index({ userId: 1, domain: 1 }, { unique: true });

export type Domain = InferSchemaType<typeof domainSchema>;

export const DomainModel = mongoose.models.Domain ?? mongoose.model("Domain", domainSchema);
