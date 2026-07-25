import mongoose, { Schema, type InferSchemaType } from "mongoose";

const mailboxSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    domain: { type: String, required: true, lowercase: true, trim: true },
    localPart: { type: String, required: true, lowercase: true, trim: true },
  },
  { timestamps: true }
);

mailboxSchema.index({ domain: 1, localPart: 1 }, { unique: true });
mailboxSchema.index({ userId: 1, domain: 1 });

export type Mailbox = InferSchemaType<typeof mailboxSchema>;

export const MailboxModel = mongoose.models.Mailbox ?? mongoose.model("Mailbox", mailboxSchema);
