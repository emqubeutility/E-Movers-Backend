export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;

export function toPagination({ page = 1, limit = DEFAULT_PAGE_SIZE } = {}) {
  const safeLimit = Math.min(Math.max(limit, 1), MAX_PAGE_SIZE);
  const safePage = Math.max(page, 1);
  return { page: safePage, limit: safeLimit, skip: (safePage - 1) * safeLimit, take: safeLimit };
}

export function toMeta({ page, limit }, total) {
  return { page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) };
}
