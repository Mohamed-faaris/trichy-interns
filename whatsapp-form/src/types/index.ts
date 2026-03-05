export interface FormData {
  name: string;
  number: string;
  email: string;
}

export interface FormDocument extends FormData {
  createdAt: Date;
}
