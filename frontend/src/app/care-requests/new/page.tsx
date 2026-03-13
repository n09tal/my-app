"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Typography,
  Container,
  Card,
  CardContent,
  CardHeader,
  Button,
  TextField,
  Autocomplete,
  Chip,
  Switch,
  FormControlLabel,
  Snackbar,
  Alert,
} from "@mui/material";
import { ArrowBack, Send } from "@mui/icons-material";
import Link from "next/link";
import { colors } from "@/styles/theme";
import { useCreateCareRequest } from "@/features/careRequests";
import { useServices } from "@/features/vendors";

export default function NewCareRequestPage() {
  const router = useRouter();
  const [clientName, setClientName] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [isUrgent, setIsUrgent] = useState(false);
  const [needsAssistance, setNeedsAssistance] = useState(false);
  const [notes, setNotes] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { createCareRequestAsync, isLoading } = useCreateCareRequest();
  const { services: allServices } = useServices();

  const serviceNames = allServices
    .map((s) => s.name)
    .filter((name) => !/automation/i.test(name));

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!clientName.trim()) newErrors.client = "Please enter a client/family member";
    if (selectedServices.length === 0) newErrors.services = "Please select at least one service";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      await createCareRequestAsync({
        client_name: clientName.trim(),
        services: selectedServices,
        is_urgent: isUrgent,
        needs_assistance: needsAssistance,
        notes: notes.trim(),
        source: "consumer",
      });
      setShowSuccess(true);
      setTimeout(() => {
        router.push("/care-requests");
      }, 1000);
    } catch {
      setShowError("Failed to submit care request. Please try again.");
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", background: colors.pageGradient }}>
      <Box sx={{ pt: { xs: 8, md: 12 }, pb: { xs: 10, md: 14 } }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: "center" }}>
            <Typography
              variant="h2"
              sx={{
                color: colors.text,
                fontWeight: 800,
                fontSize: { xs: "2.5rem", md: "4rem" },
                mb: 2,
                lineHeight: 1.1,
              }}
            >
              New Care Request
            </Typography>
            <Typography
              sx={{
                color: colors.textMuted,
                fontSize: { xs: "1.1rem", md: "1.35rem" },
                maxWidth: 550,
                mx: "auto",
                lineHeight: 1.6,
              }}
            >
              Submit a request for home care services
            </Typography>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ mt: -6, pb: 6, position: "relative", zIndex: 1 }}>
        <Button
          component={Link}
          href="/care-requests"
          startIcon={<ArrowBack />}
          sx={{
            textTransform: "none",
            color: colors.textMuted,
            mb: 2,
            "&:hover": { bgcolor: colors.surfaceHover },
          }}
        >
          Back to Dashboard
        </Button>

        <Card
          sx={{
            borderRadius: "20px",
            border: `2px solid ${colors.borderLight}`,
            boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
          }}
        >
          <CardHeader
            title="Request Details"
            subheader="Fill in the details for your care request"
            sx={{ pb: 0 }}
          />
          <CardContent sx={{ display: "flex", flexDirection: "column", gap: 3, pt: 3 }}>
            <TextField
              label="Client / Family Member"
              value={clientName}
              onChange={(e) => {
                setClientName(e.target.value);
                setErrors((prev) => ({ ...prev, client: "" }));
              }}
              fullWidth
              error={!!errors.client}
              helperText={errors.client}
              placeholder="Enter the person receiving care"
            />

            <Autocomplete
              multiple
              options={serviceNames}
              value={selectedServices}
              onChange={(_, newValue) => {
                setSelectedServices(newValue);
                setErrors((prev) => ({ ...prev, services: "" }));
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Services Needed"
                  placeholder="Select services..."
                  error={!!errors.services}
                  helperText={errors.services}
                />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => {
                  const { key, ...rest } = getTagProps({ index });
                  return (
                    <Chip
                      key={key}
                      label={option}
                      size="small"
                      {...rest}
                      sx={{
                        bgcolor: colors.primarySoft,
                        color: colors.primaryDark,
                        fontWeight: 500,
                        "& .MuiChip-deleteIcon": { color: colors.primaryDark },
                      }}
                    />
                  );
                })
              }
            />

            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                gap: 2,
                p: 2,
                bgcolor: colors.surfaceHover,
                borderRadius: "12px",
                border: `1px solid ${colors.borderLight}`,
              }}
            >
              <FormControlLabel
                control={
                  <Switch
                    checked={isUrgent}
                    onChange={(e) => setIsUrgent(e.target.checked)}
                    sx={{
                      "& .MuiSwitch-switchBase.Mui-checked": { color: colors.coral },
                      "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                        backgroundColor: colors.coral,
                      },
                    }}
                  />
                }
                label={
                  <Box>
                    <Typography sx={{ fontWeight: 600, fontSize: "0.9rem" }}>Urgent</Typography>
                    <Typography sx={{ fontSize: "0.75rem", color: colors.textMuted }}>
                      Triggers immediate vendor notifications
                    </Typography>
                  </Box>
                }
                sx={{ flex: 1, m: 0 }}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={needsAssistance}
                    onChange={(e) => setNeedsAssistance(e.target.checked)}
                    sx={{
                      "& .MuiSwitch-switchBase.Mui-checked": { color: colors.primaryDark },
                      "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                        backgroundColor: colors.primaryDark,
                      },
                    }}
                  />
                }
                label={
                  <Box>
                    <Typography sx={{ fontWeight: 600, fontSize: "0.9rem" }}>
                      Needs Assistance
                    </Typography>
                    <Typography sx={{ fontSize: "0.75rem", color: colors.textMuted }}>
                      Request social worker help before posting
                    </Typography>
                  </Box>
                }
                sx={{ flex: 1, m: 0 }}
              />
            </Box>

            <TextField
              label="Additional Notes"
              multiline
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              fullWidth
              placeholder="Any preferences, scheduling needs, or additional details..."
            />

            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2, mt: 1 }}>
              <Button
                component={Link}
                href="/care-requests"
                sx={{ textTransform: "none", color: colors.textMuted }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                endIcon={<Send />}
                disabled={isLoading}
                sx={{
                  bgcolor: colors.coral,
                  color: "white",
                  px: 4,
                  py: 1,
                  borderRadius: "12px",
                  fontWeight: 600,
                  textTransform: "none",
                  fontSize: "0.95rem",
                  boxShadow: "0 4px 14px rgba(232, 122, 66, 0.35)",
                  "&:hover": {
                    bgcolor: "#d66a35",
                    boxShadow: "0 6px 20px rgba(232, 122, 66, 0.45)",
                  },
                }}
              >
                {isLoading ? "Submitting..." : "Submit Request"}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Container>

      <Snackbar
        open={showSuccess}
        autoHideDuration={3000}
        onClose={() => setShowSuccess(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={() => setShowSuccess(false)} severity="success" variant="filled">
          Care Request submitted successfully! Redirecting...
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!showError}
        autoHideDuration={4000}
        onClose={() => setShowError(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={() => setShowError(null)} severity="error" variant="filled">
          {showError}
        </Alert>
      </Snackbar>
    </Box>
  );
}
