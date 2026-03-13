"use client";

import type React from "react";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Star, StarBorder } from "@mui/icons-material";
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import { useCreateReviewMutation } from "@/features/reviews/hooks/useReviews";
import { useAuthStore } from "@/features/auth/store/authStore";

function ReviewPage() {
  const params = useParams();
  const router = useRouter();
  const vendorId = Number(params.id);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [description, setDescription] = useState("");
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { createReview, isLoading, isError, error, reset } = useCreateReviewMutation(vendorId);

  // Check if error is a duplicate review error
  const isDuplicateError = isError && (
    (error as Error & { response?: { status?: number; data?: { non_field_errors?: string[] } } })?.response?.status === 400 ||
    (error as Error)?.message?.toLowerCase().includes("already reviewed")
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Check authentication before submitting
    if (!isAuthenticated) {
      setShowLoginDialog(true);
      return;
    }

    createReview(
      {
        first_name: firstName,
        last_name: lastName,
        stars: rating,
        description,
      },
      {
        onSuccess: () => {
          router.push(`/agencies/${vendorId}`);
        },
        onError: (err) => {
          // Check if it's a duplicate review error (400 status)
          const axiosError = err as Error & { response?: { status?: number } };
          if (axiosError?.response?.status === 400) {
            setShowDuplicateDialog(true);
          }
        },
      }
    );
  };

  const handleCloseLoginDialog = () => {
    setShowLoginDialog(false);
  };

  const handleCloseDuplicateDialog = () => {
    setShowDuplicateDialog(false);
    reset(); // Reset the mutation state
  };

  const handleGoToAgency = () => {
    router.push(`/agencies/${vendorId}`);
  };

  return (
    <Box sx={{ minHeight: "100vh", background: "linear-gradient(180deg, #87c6c8 0%, #f5f7fa 35%, #f5f7fa 100%)", py: 6 }}>
      <Container maxWidth="sm">
        <Paper elevation={2} sx={{ p: 4, borderRadius: 2 }}>
          <Typography
            variant="h4"
            component="h1"
            sx={{ fontWeight: 700, mb: 1 }}
          >
            Leave a Review
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Share your experience with this home care agency
          </Typography>

          {isError && !isDuplicateError && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {(error as Error)?.message || "Failed to submit review. Please try again."}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                Your Name
              </Typography>
              <Box sx={{ display: "flex", gap: 2 }}>
                <TextField
                  fullWidth
                  placeholder="First name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  variant="outlined"
                  size="small"
                />
                <TextField
                  fullWidth
                  placeholder="Last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  variant="outlined"
                  size="small"
                />
              </Box>
            </Box>

            <Box sx={{ mb: 4 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                Rating
              </Typography>
              <Box sx={{ display: "flex", gap: 1 }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Box
                    key={star}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    sx={{
                      cursor: "pointer",
                      transition: "transform 0.2s",
                      "&:hover": {
                        transform: "scale(1.2)",
                      },
                    }}
                  >
                    {star <= (hoveredRating || rating) ? (
                      <Star sx={{ fontSize: 40, color: "warning.main" }} />
                    ) : (
                      <StarBorder sx={{ fontSize: 40, color: "grey.400" }} />
                    )}
                  </Box>
                ))}
              </Box>
              {rating > 0 && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1 }}
                >
                  {rating} {rating === 1 ? "star" : "stars"}
                </Typography>
              )}
            </Box>

            <Box sx={{ mb: 4 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                Your Review
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={6}
                placeholder="Tell us about your experience with this agency..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                variant="outlined"
              />
            </Box>

            <Box sx={{ display: "flex", gap: 2 }}>
              <Button
                variant="outlined"
                size="large"
                onClick={() => router.back()}
                disabled={isLoading}
                sx={{ flex: 1 }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={rating === 0 || !firstName || !lastName || !description || isLoading}
                sx={{ flex: 1 }}
              >
                {isLoading ? <CircularProgress size={24} /> : "Submit Review"}
              </Button>
            </Box>
          </form>
        </Paper>
      </Container>

      {/* Login Required Dialog */}
      <Dialog open={showLoginDialog} onClose={handleCloseLoginDialog}>
        <DialogTitle>Login Required</DialogTitle>
        <DialogContent>
          <DialogContentText>
            You must be logged in to leave a review. Please log in or create an
            account to continue.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseLoginDialog}>Cancel</Button>
          <Link href="/login" style={{ textDecoration: "none" }}>
            <Button variant="contained">Log In</Button>
          </Link>
        </DialogActions>
      </Dialog>

      {/* Duplicate Review Dialog */}
      <Dialog open={showDuplicateDialog} onClose={handleCloseDuplicateDialog}>
        <DialogTitle>Review Already Submitted</DialogTitle>
        <DialogContent>
          <DialogContentText>
            You have already submitted a review for this agency. Each user can
            only leave one review per agency. You can edit or delete your
            existing review from the agency page.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDuplicateDialog}>Close</Button>
          <Button variant="contained" onClick={handleGoToAgency}>
            View Agency
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default function ReviewsPage() {
  return <ReviewPage />;
}
