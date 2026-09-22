import { PersonDetail } from "@/features/connections/person-detail";

export default async function PersonDetailPage({
  params,
}: PageProps<"/connections/[id]">) {
  const { id } = await params;
  return <PersonDetail personId={id} />;
}
