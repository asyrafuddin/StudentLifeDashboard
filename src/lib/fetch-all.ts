/**
 * Supabase (PostgREST) returns at most 1,000 rows per request by default, and
 * it does so silently: no error, just a shorter list. For data that grows over
 * years (study sessions, assignments…) that would make totals quietly wrong.
 *
 * fetchAllRows asks for one page at a time until a page comes back short.
 * The query must have a stable order (e.g. ...order('id')) so pages don't
 * overlap or skip rows.
 */

/** Rows per request. Matches Supabase's default maximum. */
export const PAGE_SIZE = 1000

type PageResult<T> = { data: T[] | null; error: unknown }

export async function fetchAllRows<T>(
  getPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
  pageSize = PAGE_SIZE,
): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await getPage(from, from + pageSize - 1)
    if (error) throw error
    const page = data ?? []
    rows.push(...page)
    if (page.length < pageSize) return rows
  }
}
