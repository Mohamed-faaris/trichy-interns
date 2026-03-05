import mongoose, { Schema, Document } from 'mongoose';

export interface ISession extends Document {
  key: string;
  data: string;
  updatedAt: Date;
}

const SessionSchema = new Schema<ISession>({
  key: { type: String, required: true, unique: true },
  data: { type: String, required: true },
  updatedAt: { type: Date, default: Date.now },
});

export const Session = mongoose.model<ISession>('Session', SessionSchema);
