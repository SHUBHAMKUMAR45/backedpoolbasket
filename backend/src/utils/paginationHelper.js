import { PAGINATION } from './constants.js';

export const paginate = (query, { page = PAGINATION.DEFAULT_PAGE, limit = PAGINATION.DEFAULT_LIMIT }) => {
  const parsedPage = parseInt(page || PAGINATION.DEFAULT_PAGE, 10);
  let parsedLimit = parseInt(limit || PAGINATION.DEFAULT_LIMIT, 10);

  // Enforce max limit boundaries
  if (parsedLimit > PAGINATION.MAX_LIMIT) {
    parsedLimit = PAGINATION.MAX_LIMIT;
  }

  const skip = (parsedPage - 1) * parsedLimit;
  return query.skip(skip).limit(parsedLimit);
};

export const buildPaginationMeta = (total, page, limit) => {
  const parsedPage = parseInt(page || PAGINATION.DEFAULT_PAGE, 10);
  let parsedLimit = parseInt(limit || PAGINATION.DEFAULT_LIMIT, 10);

  if (parsedLimit > PAGINATION.MAX_LIMIT) {
    parsedLimit = PAGINATION.MAX_LIMIT;
  }

  const pages = Math.ceil(total / parsedLimit);

  return {
    page: parsedPage,
    limit: parsedLimit,
    total,
    pages,
    hasNext: parsedPage < pages,
    hasPrev: parsedPage > 1
  };
};
