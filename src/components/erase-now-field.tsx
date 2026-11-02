"use client";

import { Checkbox } from "@fanvue/ui";
import { useState } from "react";

export function EraseNowField() {
  const [eraseNow, setEraseNow] = useState(true);
  return (
    <>
      {eraseNow ? <input type="hidden" name="eraseNow" value="yes" /> : null}
      <Checkbox
        label="Erase this workspace now"
        helperText="Leaving this off records the request and keeps the workspace until you erase it."
        checked={eraseNow}
        onCheckedChange={(value) => setEraseNow(value === true)}
      />
    </>
  );
}
