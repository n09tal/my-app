"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  IconButton,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from "@mui/material";
import { Close, CloudUpload, Delete, CheckCircle } from "@mui/icons-material";
import { useClaimVendorMutation } from "@/features/vendors/hooks/useVendors";
import { AxiosError } from "axios";

interface ClaimProfileModalProps {
  open: boolean;
  onClose: () => void;
  agencyName: string;
  agencyId: number;
  onSuccess?: () => void;
}

const ALLOWED_FILE_TYPES = ["pdf", "jpg", "jpeg", "png", "gif", "bmp"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MIN_FILES = 1;
const MAX_FILES = 5;

interface FormErrors {
  claimant_name?: string[];
  claimant_email?: string[];
  claimant_phone?: string[];
  documents?: string[];
  detail?: string;
}

export function ClaimProfileModal({
  open,
  onClose,
  agencyName,
  agencyId,
  onSuccess,
}: ClaimProfileModalProps) {
  const [claimForm, setClaimForm] = useState({
    name: "",
    phone: "",
    email: "",
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [showSuccess, setShowSuccess] = useState(false);

  const { submitClaim, isLoading, reset } = useClaimVendorMutation();

  const validateFiles = (files: File[]): string | null => {
    if (files.length < MIN_FILES) {
      return `At least ${MIN_FILES} document is required.`;
    }
    if (files.length > MAX_FILES) {
      return `Maximum ${MAX_FILES} files allowed.`;
    }
    for (const file of files) {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!ext || !ALLOWED_FILE_TYPES.includes(ext)) {
        return `File ${file.name} has invalid type. Allowed: ${ALLOWED_FILE_TYPES.join(", ")}`;
      }
      if (file.size > MAX_FILE_SIZE) {
        return `File ${file.name} exceeds maximum size of 10MB.`;
      }
    }
    return null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const totalFiles = [...selectedFiles, ...newFiles];
      if (totalFiles.length > MAX_FILES) {
        setFormErrors({
          ...formErrors,
          documents: [`Maximum ${MAX_FILES} files allowed.`],
        });
        return;
      }
      setSelectedFiles(totalFiles);
      setFormErrors({ ...formErrors, documents: undefined });
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const handleSubmit = () => {
    setFormErrors({});

    const errors: FormErrors = {};
    if (!claimForm.name.trim()) {
      errors.claimant_name = ["This field is required."];
    }
    if (!claimForm.email.trim()) {
      errors.claimant_email = ["This field is required."];
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(claimForm.email)) {
      errors.claimant_email = ["Enter a valid email address."];
    }
    if (!claimForm.phone.trim()) {
      errors.claimant_phone = ["This field is required."];
    }

    const fileError = validateFiles(selectedFiles);
    if (fileError) {
      errors.documents = [fileError];
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    submitClaim(
      {
        vendorId: agencyId,
        data: {
          claimant_name: claimForm.name,
          claimant_email: claimForm.email,
          claimant_phone: claimForm.phone,
          documents: selectedFiles,
        },
      },
      {
        onSuccess: () => {
          setShowSuccess(true);
          setTimeout(() => {
            handleClose();
            onSuccess?.();
          }, 2000);
        },
        onError: (error) => {
          const axiosError = error as AxiosError<FormErrors>;
          if (axiosError.response?.status === 409) {
            setFormErrors({
              detail: axiosError.response?.data?.detail as unknown as string,
            });
          } else if (axiosError.response?.data) {
            setFormErrors(axiosError.response.data);
          } else {
            setFormErrors({
              detail: "An unexpected error occurred. Please try again.",
            });
          }
        },
      },
    );
  };

  const handleClose = () => {
    setClaimForm({ name: "", phone: "", email: "" });
    setSelectedFiles([]);
    setFormErrors({});
    setShowSuccess(false);
    reset();
    onClose();
  };

  if (showSuccess) {
    return (
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogContent>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              py: 4,
            }}
          >
            <CheckCircle sx={{ fontSize: 64, color: "success.main", mb: 2 }} />
            <Typography variant="h6" fontWeight={600} align="center">
              Claim Submitted Successfully
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              align="center"
              sx={{ mt: 1 }}
            >
              Your claim has been submitted and is pending review. You will
              receive an email confirmation shortly.
            </Typography>
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ m: 0, p: 2, pr: 6 }}>
        <Typography variant="h6" fontWeight={600}>
          Claim This Profile
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Please provide your information to verify ownership of {agencyName}
        </Typography>
        <IconButton
          aria-label="close"
          onClick={handleClose}
          sx={{
            position: "absolute",
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {formErrors.detail && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {formErrors.detail}
          </Alert>
        )}

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
          <TextField
            label="Full Name"
            placeholder="Enter your full name"
            value={claimForm.name}
            onChange={(e) =>
              setClaimForm({ ...claimForm, name: e.target.value })
            }
            fullWidth
            required
            error={!!formErrors.claimant_name}
            helperText={formErrors.claimant_name?.[0]}
            disabled={isLoading}
          />

          <TextField
            label="Phone Number"
            placeholder="(555) 123-4567"
            value={claimForm.phone}
            onChange={(e) =>
              setClaimForm({ ...claimForm, phone: e.target.value })
            }
            fullWidth
            required
            type="tel"
            error={!!formErrors.claimant_phone}
            helperText={formErrors.claimant_phone?.[0]}
            disabled={isLoading}
          />

          <TextField
            label="Email Address"
            placeholder="you@example.com"
            value={claimForm.email}
            onChange={(e) =>
              setClaimForm({ ...claimForm, email: e.target.value })
            }
            fullWidth
            required
            type="email"
            error={!!formErrors.claimant_email}
            helperText={formErrors.claimant_email?.[0]}
            disabled={isLoading}
          />

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              Supporting Documents *
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Upload 1-5 documents to verify your ownership (e.g., business
              license, ID). Max 10MB per file. Accepted formats: PDF, JPG, PNG,
              GIF, BMP.
            </Typography>
            <Button
              component="label"
              variant="outlined"
              startIcon={<CloudUpload />}
              sx={{ textTransform: "none" }}
              disabled={isLoading || selectedFiles.length >= MAX_FILES}
            >
              Choose Files
              <input
                type="file"
                hidden
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.gif,.bmp"
                onChange={handleFileChange}
              />
            </Button>
            {formErrors.documents && (
              <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                {formErrors.documents[0]}
              </Typography>
            )}
            {selectedFiles.length > 0 && (
              <List dense sx={{ mt: 1 }}>
                {selectedFiles.map((file, index) => (
                  <ListItem key={index} sx={{ pl: 0 }}>
                    <ListItemText
                      primary={file.name}
                      secondary={formatFileSize(file.size)}
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={() => handleRemoveFile(index)}
                        disabled={isLoading}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
              {selectedFiles.length}/{MAX_FILES} files selected
            </Typography>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button
          variant="outlined"
          onClick={handleClose}
          sx={{ textTransform: "none" }}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          sx={{ textTransform: "none" }}
          disabled={isLoading}
        >
          {isLoading ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            "Submit Claim"
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
