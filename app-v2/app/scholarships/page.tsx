import Browse from "../opportunities/page";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  return Browse({ searchParams: searchParams.then(params => ({ ...params, kind: "scholarship" })) });
}
