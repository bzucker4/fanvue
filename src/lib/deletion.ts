/** The erase form sends this only after the creator confirms in the dialog. */
export const ERASE_CONFIRMATION = "erase-workspace";

export function erasureConfirmed(value: FormDataEntryValue | null): boolean {
  return value === ERASE_CONFIRMATION;
}
