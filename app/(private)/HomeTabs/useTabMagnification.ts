"use client";
import { useEffect, useRef } from "react";
import { attachTabMagnification } from "./magnificationRuntime";

export function useTabMagnification(disabled: boolean) {
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const list = listRef.current;
    if (list) return attachTabMagnification(list, disabled);
  }, [disabled]);
  return listRef;
}
