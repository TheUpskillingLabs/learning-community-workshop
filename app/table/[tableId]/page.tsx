import Worksheet from "./worksheet";

export default async function TableWorksheetPage({
  params,
}: {
  params: Promise<{ tableId: string }>;
}) {
  const { tableId } = await params;
  return <Worksheet tableId={tableId} />;
}
