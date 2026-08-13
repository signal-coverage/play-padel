import { PaymentReturnView } from "./_components/PaymentReturnView";

export default async function PaymentReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ reservationId?: string }>;
}) {
  const { reservationId } = await searchParams;
  return <PaymentReturnView reservationId={reservationId ?? null} />;
}
