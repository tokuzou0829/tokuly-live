import { requireStudioContext } from "@/lib/studio-context";
import {
  getStudioChannelComments,
  getStudioStream,
  getStudioStreamComments,
  type StudioCommentListParams,
} from "@/requests/studio";
import StudioCommentManager from "../components/studio-comment-manager";

export const metadata = { title: "コメント" };

type CommentSearchParams = {
  view?: string;
  query?: string;
  author?: string;
  author_type?: string;
  from?: string;
  to?: string;
  stream_id?: string;
  page?: string;
};

const value = (input: string | undefined, maxLength: number) => {
  const trimmed = input?.trim();
  return trimmed && trimmed.length <= maxLength ? trimmed : undefined;
};

export default async function StudioCommentsPage({
  searchParams,
}: {
  searchParams: CommentSearchParams;
}) {
  const { token, channel } = await requireStudioContext();
  const view = searchParams.view === "flat" ? "flat" : "threaded";
  const page = Math.max(1, Number(searchParams.page) || 1);
  const streamId = Number(searchParams.stream_id);
  const hasStreamFilter = Number.isInteger(streamId) && streamId > 0;
  const params: StudioCommentListParams = {
    view,
    query: value(searchParams.query, 1000),
    author: value(searchParams.author, 255),
    author_type:
      searchParams.author_type === "user" || searchParams.author_type === "channel"
        ? searchParams.author_type
        : undefined,
    from: value(searchParams.from, 64),
    to: value(searchParams.to, 64),
    per_page: 20,
    page,
  };

  const stream = hasStreamFilter ? await getStudioStream(streamId, token) : null;

  const result = hasStreamFilter
    ? await getStudioStreamComments(streamId, token, params)
    : await getStudioChannelComments(channel.id, token, params);

  return (
    <StudioCommentManager
      result={result}
      token={token}
      view={view}
      stream={stream}
      filters={{
        query: params.query ?? "",
        author: params.author ?? "",
        authorType: params.author_type ?? "",
        from: params.from ?? "",
        to: params.to ?? "",
      }}
    />
  );
}
