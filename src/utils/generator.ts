import {customAlphabet} from "nanoid";

const alphanumericAlphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const generateId = customAlphabet(alphanumericAlphabet, 8);