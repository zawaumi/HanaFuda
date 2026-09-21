import { ConversationSetup } from "@/features/deck/conversation-setup";

export default async function ConversationSetupPage(props: PageProps<"/connections/[id]/deck/new">) {
  const [{ id }, query] = await Promise.all([props.params, props.searchParams]);
  return <ConversationSetup personId={id} initialSituation={typeof query.situation === "string" ? query.situation : ""} />;
}
