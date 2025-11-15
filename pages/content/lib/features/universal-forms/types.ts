/**
 * Universal Form Filler Types
 */

export type FieldType =
  | 'text'
  | 'email'
  | 'tel'
  | 'number'
  | 'date'
  | 'time'
  | 'datetime-local'
  | 'url'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'textarea'
  | 'file'
  | 'password'
  | 'search'
  | 'color'
  | 'range'
  | 'unknown';

export interface FieldConstraints {
  pattern?: string;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  step?: number;
}

export interface UniversalFormField {
  element: HTMLElement;
  type: FieldType;
  context: string; // What is this field asking?
  options?: string[]; // For select/radio/checkbox
  required: boolean;
  currentValue?: string;
  constraints?: FieldConstraints;
  name?: string;
  id?: string;
  groupName?: string; // For radio buttons (same name = same group)
}

export interface FormFillResult {
  success: boolean;
  field: UniversalFormField;
  answer?: string;
  error?: string;
}
