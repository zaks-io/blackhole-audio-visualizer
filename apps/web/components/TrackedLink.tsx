"use client";

import Link from "next/link";
import { track } from "@vercel/analytics";
import { ComponentProps } from "react";

export function TrackedLink({
  event,
  onClick,
  ...props
}: ComponentProps<typeof Link> & { event: string }) {
  return (
    <Link
      onClick={(e) => {
        track(event);
        onClick?.(e);
      }}
      {...props}
    />
  );
}

export function TrackedAnchor({
  event,
  onClick,
  ...props
}: ComponentProps<"a"> & { event: string }) {
  return (
    <a
      onClick={(e) => {
        track(event);
        onClick?.(e);
      }}
      {...props}
    />
  );
}
