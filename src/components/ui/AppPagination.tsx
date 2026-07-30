"use client";

import { cn } from "@/lib/utils";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/ui/pagination";

interface AppPaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;
}

export function AppPagination({
  page,
  totalPages,
  onPageChange,
  siblingCount = 1,
}: AppPaginationProps) {
  if (totalPages <= 1) return null;

  const generatePages = () => {
    const pages: (number | "...")[] = [];

    const left = Math.max(2, page - siblingCount);
    const right = Math.min(totalPages - 1, page + siblingCount);

    pages.push(1);

    if (left > 2) pages.push("...");

    for (let i = left; i <= right; i++) {
      pages.push(i);
    }

    if (right < totalPages - 1) pages.push("...");

    if (totalPages > 1) pages.push(totalPages);

    return pages;
  };

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (page > 1) onPageChange(page - 1);
            }}
            className={cn(
              "border border-border mr-1.5",
              page === 1 ? "pointer-events-none opacity-50" : "",
            )}
          />
        </PaginationItem>

        {generatePages().map((item, index) =>
          item === "..." ? (
            <PaginationItem key={index}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={item}>
              <PaginationLink
                href="#"
                isActive={item === page}
                onClick={(e) => {
                  e.preventDefault();
                  onPageChange(item);
                }}
                className={
                  item === page
                    ? "bg-linear-to-br from-primary to-accent text-white hover:text-white"
                    : ""
                }
              >
                {item}
              </PaginationLink>
            </PaginationItem>
          ),
        )}

        <PaginationItem>
          <PaginationNext
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (page < totalPages) onPageChange(page + 1);
            }}
            className={cn(
              "border border-border ml-1.5",
              page === totalPages ? "pointer-events-none opacity-50" : "",
            )}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
