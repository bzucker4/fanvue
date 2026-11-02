"use client";

import { Select, SelectContent, SelectItem } from "@fanvue/ui";
import { useState } from "react";

export function DuplicateUploadFields({ photos }: { photos: { id: string; label: string }[] }) {
  const [left, setLeft] = useState(photos[0]?.id ?? "");
  const [right, setRight] = useState(photos[1]?.id ?? photos[0]?.id ?? "");

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <input type="hidden" name="left" value={left} required />
      <input type="hidden" name="right" value={right} required />
      <Select label="First upload" value={left} onValueChange={setLeft} fullWidth>
        <SelectContent>
          {photos.map((photo) => (
            <SelectItem key={photo.id} value={photo.id}>
              {photo.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select label="Second upload" value={right} onValueChange={setRight} fullWidth>
        <SelectContent>
          {photos.map((photo) => (
            <SelectItem key={photo.id} value={photo.id}>
              {photo.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
