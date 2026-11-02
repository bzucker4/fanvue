"use client";

import {
  Button,
  Checkbox,
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  TextArea,
  TextField,
} from "@fanvue/ui";
import { useState } from "react";
import { ERASE_CONFIRMATION } from "@/lib/deletion";
import { eraseWorkspace, requestDeletion } from "@/app/workspace/actions";
import { SubmitButton } from "./submit-button";

export function RequestDeletionForm() {
  return (
    <form action={requestDeletion} className="flex max-w-xl flex-col gap-4">
      <p className="typography-body-default-16px-regular">
        This records a request for the operator. It does not erase the workspace, purchases, or Fanvue tokens.
      </p>
      <TextField name="contact" type="email" label="Contact email" required placeholder="you@example.com" fullWidth />
      <TextArea name="detail" label="Note" minRows={4} placeholder="Optional context for the operator" fullWidth />
      <SubmitButton variant="secondary" size="40">
        Request deletion
      </SubmitButton>
    </form>
  );
}

export function EraseWorkspaceDialog() {
  const [acknowledged, setAcknowledged] = useState(false);
  return (
    <Dialog onOpenChange={() => setAcknowledged(false)}>
      <DialogTrigger asChild>
        <Button type="button" variant="destructive" size="40">
          Erase workspace
        </Button>
      </DialogTrigger>
      <DialogContent size="sm" mobilePresentation="card">
        <DialogHeader>
          <DialogTitle>Erase this workspace?</DialogTitle>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-4">
          <DialogDescription>
            This permanently removes this workspace, imported purchases, duplicate decisions, bundles, and encrypted
            Fanvue tokens from Bundle Audit. It does not delete anything inside Fanvue. You cannot undo it.
          </DialogDescription>
          <Checkbox
            label="I understand this erasure is permanent"
            checked={acknowledged}
            onCheckedChange={(value) => setAcknowledged(value === true)}
          />
        </DialogBody>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </DialogClose>
          <form action={eraseWorkspace}>
            <input type="hidden" name="confirm" value={ERASE_CONFIRMATION} />
            <SubmitButton variant="destructive" size="40" disabled={!acknowledged}>
              Erase workspace
            </SubmitButton>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
