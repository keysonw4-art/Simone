"use client";

import { useEffect, useRef } from "react";
import { CountUp } from "countup.js";

type Props = {
  value: number;
  prefix?: string;
  separator?: string;
  decimal?: string;
  duration?: number;
};

export function CountUpNumber({
  value,
  prefix,
  separator = ".",
  decimal = ",",
  duration = 1.5,
}: Props) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const cu = new CountUp(ref.current, value, {
      prefix,
      separator,
      decimal,
      duration,
    });
    if (!cu.error) cu.start();
  }, [value, prefix, separator, decimal, duration]);

  return <span ref={ref}>0</span>;
}
