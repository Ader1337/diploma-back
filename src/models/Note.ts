import mongoose, { Schema, Document, Model } from 'mongoose';

export interface INote extends Document {
  user: mongoose.Types.ObjectId;
  title?: string;
  content: string;
  tags?: string[];
}

const NoteSchema: Schema<INote> = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, trim: true },
    content: { type: String, required: true, trim: true },
    tags: [{ type: String, trim: true }],
  },
  { timestamps: true }
);

const Note: Model<INote> = mongoose.model<INote>('Note', NoteSchema);
export default Note;