"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Box,
  Typography,
  Container,
  Button,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  Snackbar,
  Alert,
} from "@mui/material";
import {
  Add,
  Visibility,
  NotificationsActive,
  Edit,
  Publish,
  Person,
  Business,
  SupportAgent,
} from "@mui/icons-material";
import { colors } from "@/styles/theme";
import { useCareRequests } from "@/features/careRequests";
import type { CareRequest, CareRequestStatus } from "@/features/careRequests";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useRouter } from "next/navigation";

type RoleView = "requestor" | "vendor" | "social_worker";

const statusConfig: Record<CareRequestStatus, { label: string; color: string; bg: string }> = {
  pending: { label: "Pending", color: colors.textMuted, bg: "#f3f4f6" },
  open: { label: "Open", color: colors.primaryDark, bg: colors.primarySoft },
  closed: { label: "Closed", color: "#6b7280", bg: colors.closed },
  urgent: { label: "Urgent", color: "#ffffff", bg: colors.coral },
  needs_assistance: { label: "Needs Assistance", color: "#854d0e", bg: "#fef9c3" },
};

function StatusChip({ status }: { status: CareRequestStatus }) {
  const config = statusConfig[status];
  return (
    <Chip
      label={config.label}
      size="small"
      sx={{
        bgcolor: config.bg,
        color: config.color,
        fontWeight: 600,
        fontSize: "0.75rem",
      }}
    />
  );
}

function PrivatePayBadge() {
  return (
    <Chip
      label="Private Pay"
      size="small"
      variant="outlined"
      sx={{
        borderColor: colors.coral,
        color: colors.coral,
        fontWeight: 600,
        fontSize: "0.7rem",
      }}
    />
  );
}

function CareRequestCard({
  request,
  role,
  onNotify,
  onPost,
}: {
  request: CareRequest;
  role: RoleView;
  onNotify?: (id: number) => void;
  onPost?: (id: number) => void;
}) {
  return (
    <Box
      sx={{
        borderRadius: "16px",
        bgcolor: colors.surface,
        border: `2px solid ${colors.borderLight}`,
        overflow: "hidden",
        transition: "all 0.25s ease",
        "&:hover": {
          borderColor: colors.primary,
          boxShadow: "0 8px 24px rgba(64, 108, 122, 0.12)",
          transform: "translateY(-2px)",
        },
      }}
    >
      <Box
        sx={{
          height: 6,
          bgcolor: statusConfig[request.status].bg,
          borderBottom:
            request.status === "urgent"
              ? `2px solid ${colors.coral}`
              : `2px solid ${colors.borderLight}`,
        }}
      />

      <Box sx={{ p: 2.5 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1.5 }}>
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: "1rem", color: colors.text }}>
              {request.client_name}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 0.75, flexShrink: 0 }}>
            <StatusChip status={request.status} />
            {request.is_private_pay && <PrivatePayBadge />}
          </Box>
        </Box>

        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mb: 1.5 }}>
          {request.services.map((service) => (
            <Chip
              key={service}
              label={service}
              size="small"
              sx={{
                bgcolor: colors.primarySoft,
                color: colors.primaryDark,
                fontSize: "0.7rem",
                fontWeight: 500,
                height: 24,
              }}
            />
          ))}
        </Box>

        {request.notes && (
          <Typography
            sx={{
              fontSize: "0.85rem",
              color: colors.textMuted,
              mb: 1.5,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {request.notes}
          </Typography>
        )}

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography sx={{ fontSize: "0.75rem", color: colors.textMuted }}>
            {new Date(request.created_at).toLocaleDateString()}
            {request.notified_vendors.length > 0 &&
              ` · ${request.notified_vendors.length} vendor${request.notified_vendors.length !== 1 ? "s" : ""} interested`}
          </Typography>

          <Box sx={{ display: "flex", gap: 1 }}>
            {role === "requestor" && (
              <Button
                component={Link}
                href={`/care-requests/${request.id}`}
                size="small"
                startIcon={<Visibility sx={{ fontSize: 16 }} />}
                sx={{
                  textTransform: "none",
                  fontSize: "0.8rem",
                  color: colors.primaryDark,
                  bgcolor: colors.primarySoft,
                  "&:hover": { bgcolor: colors.primaryMuted },
                }}
              >
                View
              </Button>
            )}

            {role === "vendor" && (request.status === "open" || request.status === "urgent") && (
              <Button
                size="small"
                startIcon={<NotificationsActive sx={{ fontSize: 16 }} />}
                onClick={() => onNotify?.(request.id)}
                sx={{
                  textTransform: "none",
                  fontSize: "0.8rem",
                  color: "#ffffff",
                  bgcolor: colors.coral,
                  "&:hover": { bgcolor: "#d66a35" },
                }}
              >
                Notify
              </Button>
            )}

            {role === "social_worker" && request.status === "needs_assistance" && (
              <>
                <Button
                  component={Link}
                  href={`/care-requests/${request.id}`}
                  size="small"
                  startIcon={<Edit sx={{ fontSize: 16 }} />}
                  sx={{
                    textTransform: "none",
                    fontSize: "0.8rem",
                    color: colors.primaryDark,
                    bgcolor: colors.primarySoft,
                    "&:hover": { bgcolor: colors.primaryMuted },
                  }}
                >
                  Edit
                </Button>
                <Button
                  size="small"
                  startIcon={<Publish sx={{ fontSize: 16 }} />}
                  onClick={() => onPost?.(request.id)}
                  sx={{
                    textTransform: "none",
                    fontSize: "0.8rem",
                    color: "#ffffff",
                    bgcolor: colors.primaryDark,
                    "&:hover": { bgcolor: "#345a66" },
                  }}
                >
                  Post
                </Button>
              </>
            )}

            {role === "social_worker" && request.status !== "needs_assistance" && (
              <Button
                component={Link}
                href={`/care-requests/${request.id}`}
                size="small"
                startIcon={<Visibility sx={{ fontSize: 16 }} />}
                sx={{
                  textTransform: "none",
                  fontSize: "0.8rem",
                  color: colors.primaryDark,
                  bgcolor: colors.primarySoft,
                  "&:hover": { bgcolor: colors.primaryMuted },
                }}
              >
                View
              </Button>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

function getFilteredRequests(role: RoleView, requests: CareRequest[]): CareRequest[] {
  switch (role) {
    case "requestor":
      return requests;
    case "vendor":
      return requests.filter((r) => r.status === "open" || r.status === "urgent");
    case "social_worker":
      return requests.filter((r) => r.status === "needs_assistance");
    default:
      return requests;
  }
}

export default function CareRequestsDashboard() {
  const [role, setRole] = useState<RoleView>("requestor");
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({
    open: false,
    message: "",
  });
  const isLoggedIn = useAuthStore((state) => state.isAuthenticated);
  const router = useRouter();
  const { requests: apiRequests, isLoading } = useCareRequests(undefined, isLoggedIn);
  const requests = getFilteredRequests(role, apiRequests);

  const requireAuth = (action: () => void) => {
    if (!isLoggedIn) {
      router.push("/login?from=/care-requests");
      return;
    }
    action();
  };

  const handleNotify = (id: number) => {
    requireAuth(() => {
      setSnackbar({ open: true, message: `Notified on Care Request #${id} (mock)` });
    });
  };

  const handlePost = (id: number) => {
    requireAuth(() => {
      setSnackbar({ open: true, message: `Care Request #${id} posted as Open (mock)` });
    });
  };

  const roleDescriptions: Record<RoleView, string> = {
    requestor: "View and manage your care requests",
    vendor: "Browse open care requests and express interest",
    social_worker: "Assist requestors and manage pending requests",
  };

  return (
    <Box sx={{ minHeight: "100vh", background: colors.pageGradient }}>
      <Box
        sx={{
          pt: { xs: 8, md: 12 },
          pb: { xs: 10, md: 14 },
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ textAlign: "center", position: "relative", zIndex: 1 }}>
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
              Care Requests
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
              {roleDescriptions[role]}
            </Typography>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ mt: -6, pb: 6, position: "relative", zIndex: 1 }}>
        {!isLoggedIn && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              bgcolor: colors.primarySoft,
              border: `2px solid ${colors.primary}`,
              borderRadius: "14px",
              px: 3,
              py: 2,
              mb: 3,
            }}
          >
            <Typography sx={{ fontWeight: 600, color: colors.primaryDark, fontSize: "0.95rem" }}>
              Sign in to submit care requests, express interest, or manage your requests.
            </Typography>
            <Button
              component={Link}
              href="/login?from=/care-requests"
              sx={{
                bgcolor: colors.primaryDark,
                color: "#ffffff",
                textTransform: "none",
                fontWeight: 600,
                borderRadius: "10px",
                px: 3,
                flexShrink: 0,
                "&:hover": { bgcolor: "#345a66" },
              }}
            >
              Sign In
            </Button>
          </Box>
        )}

        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            justifyContent: "space-between",
            alignItems: { xs: "stretch", md: "center" },
            gap: 2,
            mb: 3,
          }}
        >
          <ToggleButtonGroup
            value={role}
            exclusive
            onChange={(_, newRole) => {
              if (newRole !== null) setRole(newRole);
            }}
            size="small"
            sx={{
              bgcolor: colors.surface,
              borderRadius: "12px",
              border: `2px solid ${colors.borderLight}`,
              "& .MuiToggleButton-root": {
                textTransform: "none",
                fontWeight: 600,
                fontSize: "0.85rem",
                px: 2,
                py: 1,
                border: "none",
                borderRadius: "10px !important",
                color: colors.textMuted,
                "&.Mui-selected": {
                  bgcolor: colors.primarySoft,
                  color: colors.primaryDark,
                  "&:hover": { bgcolor: colors.primaryMuted },
                },
                "&:hover": { bgcolor: colors.surfaceHover },
              },
            }}
          >
            <ToggleButton value="requestor">
              <Person sx={{ fontSize: 18, mr: 0.75 }} />
              Requestor
            </ToggleButton>
            <ToggleButton value="vendor">
              <Business sx={{ fontSize: 18, mr: 0.75 }} />
              Vendor
            </ToggleButton>
            {isLoggedIn && (
              <ToggleButton value="social_worker">
                <SupportAgent sx={{ fontSize: 18, mr: 0.75 }} />
                Social Worker
              </ToggleButton>
            )}
          </ToggleButtonGroup>

          {role === "requestor" && (
            <Button
              component={Link}
              href={isLoggedIn ? "/care-requests/new" : "/login?from=/care-requests/new"}
              startIcon={<Add />}
              sx={{
                bgcolor: colors.coral,
                color: "white",
                px: 3,
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
              New Care Request
            </Button>
          )}
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: colors.text }}>
            {isLoading
              ? "Loading..."
              : `${requests.length} ${requests.length === 1 ? "Request" : "Requests"}`}
          </Typography>
        </Box>

        {requests.length === 0 ? (
          <Box
            sx={{
              textAlign: "center",
              py: 10,
              bgcolor: colors.surface,
              borderRadius: "16px",
              border: `2px solid ${colors.borderLight}`,
            }}
          >
            <Typography variant="h6" sx={{ color: colors.text, fontWeight: 600 }}>
              No care requests found
            </Typography>
            <Typography variant="body2" sx={{ color: colors.textMuted, mt: 1 }}>
              {role === "requestor"
                ? "Submit a new care request to get started."
                : "No requests match this view right now."}
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md: "repeat(2, 1fr)",
                xl: "repeat(3, 1fr)",
              },
              gap: 2.5,
            }}
          >
            {requests.map((request) => (
              <CareRequestCard
                key={request.id}
                request={request}
                role={role}
                onNotify={handleNotify}
                onPost={handlePost}
              />
            ))}
          </Box>
        )}
      </Container>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity="success"
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
