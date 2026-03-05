import mongoose, { Schema, Document } from 'mongoose';

export interface IForm extends Document {
  name: string;
  number: string;
  email: string;
  createdAt: Date;
}

const FormSchema = new Schema<IForm>({
  name: { type: String, required: true },
  number: { type: String, required: true },
  email: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const Form = mongoose.model<IForm>('Form', FormSchema);
