import { TournamentsHub } from "./_components/TournamentsHub";

export default function TournamentsHubPage() {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-4 p-4 md:p-6">
      <h1 className="text-xl font-semibold tracking-tight">Tournaments</h1>
      <TournamentsHub />
    </div>
  );
}
