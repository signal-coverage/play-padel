import { PlayersDirectory } from "./_components/PlayersDirectory";

export default function PlayersPage() {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-4 p-4 md:p-6">
      <h1 className="text-xl font-semibold tracking-tight">Players</h1>
      <PlayersDirectory />
    </div>
  );
}
