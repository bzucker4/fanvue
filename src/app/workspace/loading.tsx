import { Loader } from "@fanvue/ui";

export default function WorkspaceLoading() {
  return (
    <main className="mx-auto w-full max-w-[1120px] px-4 py-10">
      <Loader show center minHeight={240} ariaLabel="Loading workspace" />
    </main>
  );
}
