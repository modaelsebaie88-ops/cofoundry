export const POST_SELECT =
  "id, community_id, type, title, body, is_pinned, accepted_comment_id, comment_count, reaction_count, created_at, author:profiles!community_posts_author_id_fkey(id, full_name, avatar_url, headline, is_verified, is_demo), poll_options(id, label, position, vote_count)"
