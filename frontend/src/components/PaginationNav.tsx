"use client";

import { Box, Button, ButtonGroup, Typography } from "@mui/material";
import {
  KeyboardDoubleArrowLeft,
  KeyboardDoubleArrowRight,
  FirstPage,
  LastPage,
} from "@mui/icons-material";

interface PaginationNavProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pagesPerSet?: number;
}

export function PaginationNav({
  currentPage,
  totalPages,
  onPageChange,
  pagesPerSet = 10,
}: PaginationNavProps) {
  let startPage: number;
  let endPage: number;

  if (totalPages <= pagesPerSet) {
    startPage = 1;
    endPage = totalPages;
  } else {
    const half = Math.floor(pagesPerSet / 2);
    if (currentPage <= half) {
      startPage = 1;
      endPage = pagesPerSet;
    } else if (currentPage > totalPages - half) {
      startPage = totalPages - pagesPerSet + 1;
      endPage = totalPages;
    } else {
      startPage = currentPage - half;
      endPage = startPage + pagesPerSet - 1;
    }
  }

  const pageNumbers: number[] = [];
  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }

  const hasPrevSet = startPage > 1;
  const hasNextSet = endPage < totalPages;

  const goToFirstPage = () => {
    onPageChange(1);
  };

  const goToPrevSet = () => {
    const newPage = Math.max(1, startPage - 1);
    onPageChange(newPage);
  };

  const goToNextSet = () => {
    const newPage = Math.min(totalPages, endPage + 1);
    onPageChange(newPage);
  };

  const goToLastPage = () => {
    onPageChange(totalPages);
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {/* First Page Button */}
        <Button
          variant="outlined"
          size="small"
          onClick={goToFirstPage}
          disabled={currentPage === 1}
          sx={{ minWidth: "auto", px: 1 }}
        >
          <FirstPage />
        </Button>

        {/* Previous Set Button */}
        <Button
          variant="outlined"
          size="small"
          onClick={goToPrevSet}
          disabled={!hasPrevSet}
          sx={{ minWidth: "auto", px: 1 }}
        >
          <KeyboardDoubleArrowLeft />
        </Button>

        {/* Page Number Buttons */}
        <ButtonGroup variant="outlined" size="small">
          {pageNumbers.map((page) => (
            <Button
              key={page}
              onClick={() => onPageChange(page)}
              variant={page === currentPage ? "contained" : "outlined"}
              sx={{ minWidth: 40 }}
            >
              {page}
            </Button>
          ))}
        </ButtonGroup>

        {/* Next Set Button */}
        <Button
          variant="outlined"
          size="small"
          onClick={goToNextSet}
          disabled={!hasNextSet}
          sx={{ minWidth: "auto", px: 1 }}
        >
          <KeyboardDoubleArrowRight />
        </Button>

        {/* Last Page Button */}
        <Button
          variant="outlined"
          size="small"
          onClick={goToLastPage}
          disabled={currentPage === totalPages}
          sx={{ minWidth: "auto", px: 1 }}
        >
          <LastPage />
        </Button>
      </Box>

      {/* Page info */}
      <Typography variant="body2" color="text.secondary">
        Page {currentPage} of {totalPages}
        {totalPages > pagesPerSet && ` (showing ${startPage}-${endPage})`}
      </Typography>
    </Box>
  );
}
