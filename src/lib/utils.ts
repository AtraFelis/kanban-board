import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Tailwind 클래스를 조건부로 합치고 충돌은 뒤 값으로 정리한다.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
