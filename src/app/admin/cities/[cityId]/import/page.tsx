import { ImportClient } from "@/components/admin/ImportClient";

type Props = { params: Promise<{ cityId: string }> };

export default async function ImportPage({ params }: Props) {
  const { cityId } = await params;
  return <ImportClient cityId={parseInt(cityId, 10)} />;
}
