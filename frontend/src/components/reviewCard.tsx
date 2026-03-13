"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Rating,
  Avatar,
  IconButton,
  TextField,
} from "@mui/material";
import { Edit, Delete, FormatQuote } from "@mui/icons-material";
import {
  useDeleteReviewMutation,
  useUpdateReviewMutation,
} from "@/features/reviews/hooks/useReviews";
import type { Review, ReviewInput } from "@/features/reviews/types";

interface ReviewCardProps {
  review: Review;
  vendorId: number;
  isAuthenticated: boolean;
  showDivider?: boolean;
}

export function ReviewCard({
  review,
  vendorId,
  isAuthenticated,
  showDivider = false,
}: ReviewCardProps) {
  const [mounted, setMounted] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<ReviewInput>({
    first_name: review.first_name,
    last_name: review.last_name,
    stars: review.stars,
    description: review.description,
  });

  const { deleteReview, isLoading: isDeleting } = useDeleteReviewMutation(vendorId);
  const { updateReview, isLoading: isUpdating } = useUpdateReviewMutation(vendorId);

  useEffect(() => {
    setMounted(true);
  }, []);

  const formatReviewDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleEditClick = () => {
    setIsEditing(true);
    setEditFormData({
      first_name: review.first_name,
      last_name: review.last_name,
      stars: review.stars,
      description: review.description,
    });
  };

  const handleEditCancel = () => {
    setIsEditing(false);
  };

  const handleEditSave = () => {
    updateReview(
      { reviewId: review.id, review: editFormData },
      {
        onSuccess: () => {
          setIsEditing(false);
        },
      }
    );
  };

  const handleDeleteClick = () => {
    if (confirm("Are you sure you want to delete this review?")) {
      deleteReview(review.id);
    }
  };

  if (isEditing) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          p: 2,
          bgcolor: "grey.50",
          borderRadius: 1,
        }}
      >
        <Box sx={{ display: "flex", gap: 2 }}>
          <TextField
            size="small"
            placeholder="First name"
            value={editFormData.first_name}
            onChange={(e) =>
              setEditFormData({ ...editFormData, first_name: e.target.value })
            }
            sx={{ flex: 1 }}
          />
          <TextField
            size="small"
            placeholder="Last name"
            value={editFormData.last_name}
            onChange={(e) =>
              setEditFormData({ ...editFormData, last_name: e.target.value })
            }
            sx={{ flex: 1 }}
          />
        </Box>
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            Rating
          </Typography>
          <Rating
            value={editFormData.stars}
            onChange={(_, value) =>
              setEditFormData({ ...editFormData, stars: value || 0 })
            }
          />
        </Box>
        <TextField
          multiline
          rows={4}
          placeholder="Your review..."
          value={editFormData.description}
          onChange={(e) =>
            setEditFormData({ ...editFormData, description: e.target.value })
          }
          fullWidth
        />
        <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
          <Button variant="outlined" size="small" onClick={handleEditCancel}>
            Cancel
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={handleEditSave}
            disabled={isUpdating}
          >
            {isUpdating ? "Saving..." : "Save"}
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <>
      <Box sx={{ display: "flex", gap: 2 }}>
        <Avatar
          sx={{
            bgcolor: "primary.main",
            width: 48,
            height: 48,
            fontSize: "1rem",
          }}
        >
          {review.first_name.charAt(0).toUpperCase()}{review.last_name.charAt(0).toUpperCase()}
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 0.5,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="subtitle1" fontWeight={600}>
                {review.first_name} {review.last_name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                • {formatReviewDate(review.created_at)}
              </Typography>
            </Box>
            {mounted && isAuthenticated && (
              <Box sx={{ display: "flex", gap: 0.5 }}>
                <IconButton
                  size="small"
                  onClick={handleEditClick}
                  disabled={isUpdating || isDeleting}
                >
                  <Edit fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={handleDeleteClick}
                  disabled={isDeleting}
                  sx={{ color: "error.main" }}
                >
                  <Delete fontSize="small" />
                </IconButton>
              </Box>
            )}
          </Box>
          <Rating value={review.stars} readOnly size="small" sx={{ mb: 1 }} />
          <Box sx={{ position: "relative", pl: 2 }}>
            <FormatQuote
              sx={{
                position: "absolute",
                left: -4,
                top: -4,
                fontSize: 20,
                color: "grey.300",
                transform: "scaleX(-1)",
              }}
            />
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ lineHeight: 1.7 }}
            >
              {review.description}
            </Typography>
          </Box>
        </Box>
      </Box>
      {showDivider && (
        <Box
          component="hr"
          sx={{
            mt: 3,
            border: "none",
            borderTop: "1px solid",
            borderColor: "divider",
          }}
        />
      )}
    </>
  );
}

