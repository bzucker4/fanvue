"use client";

import { Button, type ButtonProps } from "@fanvue/ui";
import { useFormStatus } from "react-dom";

export function SubmitButton({ children, loading, disabled, ...props }: ButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" {...props} loading={pending || loading} disabled={disabled || pending}>
      {children}
    </Button>
  );
}
