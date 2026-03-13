"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  CardHeader,
  TextField,
  Button,
  Avatar,
  Divider,
  InputAdornment,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import {
  Person,
  Email,
  Phone,
  Lock,
  Business,
  Edit,
  Home,
  LocationCity,
  Warning,
} from "@mui/icons-material";
import { useProfile } from "@/features/profile/hooks/useProfile";
import {
  useUpdateDirectoryUser,
  useDeactivateAccount,
} from "@/features/directoryUser";
import { useAuth } from "@/features/auth";
import { useMyVendors } from "@/features/vendors";
import { validateProfileForm, ValidationErrors } from "@/utils/validateProfileForm";
import { colors } from "@/styles/theme";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export default function AccountPage() {
  const [tabValue, setTabValue] = useState(0);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [formErrors, setFormErrors] = useState<ValidationErrors>({});

  const { authenticated, authenticatedLoading } = useAuth();
  const { profile, isLoading, isError, error, refetch } = useProfile();
  
  const { vendors: myVendors, isLoading: isLoadingVendors, isError: isVendorsError, refetch: refetchVendors } = useMyVendors();

  const {
    updateUser,
    isLoading: isSaving,
    error: updateError,
    reset: resetUpdateError,
  } = useUpdateDirectoryUser();

  const {
    deactivate,
    isLoading: isDeactivating,
    error: deactivateError,
  } = useDeactivateAccount();

  useEffect(() => {
    if (profile) {
      setFirstName(profile.user_profile?.first_name || "");
      setLastName(profile.user_profile?.last_name || "");
      setEmail(profile.email || "");
      setPhone(profile.user_profile?.phone || "");
      setAddress(profile.user_profile?.address || "");
      setCity(profile.user_profile?.city || "");
      setState(profile.user_profile?.state || "");
      setZipCode(profile.user_profile?.zip || "");
    }
  }, [profile]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const validateForm = (): boolean => {
    const errors = validateProfileForm({
      firstName,
      lastName,
      phone,
      address,
      city,
      state,
      zipCode,
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCancelProfileEdit = () => {
    if (profile) {
      setFirstName(profile.user_profile?.first_name || "");
      setLastName(profile.user_profile?.last_name || "");
      setEmail(profile.email || "");
      setPhone(profile.user_profile?.phone || "");
      setAddress(profile.user_profile?.address || "");
      setCity(profile.user_profile?.city || "");
      setState(profile.user_profile?.state || "");
      setZipCode(profile.user_profile?.zip || "");
    }
    setFormErrors({});
    setIsEditingProfile(false);
    resetUpdateError();
  };

  const handleSaveProfile = () => {
    if (!validateForm()) return;

    updateUser(
      {
        user_profile: {
          first_name: firstName,
          last_name: lastName,
          phone: phone || null,
          address: address || null,
          city: city || null,
          state: state || null,
          zip: zipCode || null,
        },
      },
      {
        onSuccess: () => {
          setIsEditingProfile(false);
          setFormErrors({});
          refetch();
        },
      },
    );
  };

  const handleCancelPasswordEdit = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setIsEditingPassword(false);
  };

  const handleUpdatePassword = () => {
    // TODO: Implement password update API call
    handleCancelPasswordEdit();
  };

  const handleDeactivateAccount = () => {
    deactivate();
  };

  const getInitials = () => {
    const first = firstName?.charAt(0) || "";
    const last = lastName?.charAt(0) || "";
    return (first + last).toUpperCase() || "?";
  };


  const getAvatarColor = () => {
    const avatarColors = [colors.primaryDark];
    const nameHash = (firstName + lastName).length;
    return avatarColors[nameHash % avatarColors.length];
  };


  const apiErrors = updateError?.response?.data;
  const getFieldError = (field: keyof ValidationErrors): string | undefined => {
    if (formErrors[field]) return formErrors[field];
    if (apiErrors?.user_profile) {
      const profileErrors = apiErrors.user_profile;
      if (field === "firstName" && profileErrors.first_name?.[0])
        return profileErrors.first_name[0];
      if (field === "lastName" && profileErrors.last_name?.[0])
        return profileErrors.last_name[0];
      if (field === "phone" && profileErrors.phone?.[0])
        return profileErrors.phone[0];
      if (field === "address" && profileErrors.address?.[0])
        return profileErrors.address[0];
      if (field === "city" && profileErrors.city?.[0])
        return profileErrors.city[0];
      if (field === "state" && profileErrors.state?.[0])
        return profileErrors.state[0];
      if (field === "zipCode" && profileErrors.zip?.[0])
        return profileErrors.zip[0];
    }
    return undefined;
  };

  if (authenticatedLoading || isLoading) {
    return (
      <Box sx={{ textAlign: "center", py: 8 }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading account settings...</Typography>
      </Box>
    );
  }

  if (!authenticated) {
    return (
      <Box sx={{ textAlign: "center", py: 8 }}>
        <Typography variant="h6" color="text.secondary">
          Please log in to view your account settings
        </Typography>
      </Box>
    );
  }

  if (isError) {
    return (
      <Box sx={{ textAlign: "center", py: 8 }}>
        <Alert severity="error" sx={{ mb: 2, maxWidth: 400, mx: "auto" }}>
          Error loading profile: {error?.message || "Unknown error"}
        </Alert>
        <Button onClick={() => refetch()} variant="outlined">
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Account Settings
        </Typography>
        <Typography color="text.secondary">
          Manage your account settings and preferences
        </Typography>
      </Box>

      <Tabs
        value={tabValue}
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          borderBottom: 1,
          borderColor: "divider",
          "& .MuiTab-root": {
            textTransform: "none",
            fontWeight: 500,
          },
        }}
      >
        <Tab label="Profile" />
        <Tab label="Security" />
        <Tab label="My Agencies" />
      </Tabs>

      {/* Profile Tab */}
      <TabPanel value={tabValue} index={0}>
        <Card>
          <CardHeader
            title="Profile Information"
            subheader="Update your personal information and contact details"
            action={
              !isEditingProfile && (
                <Button
                  variant="outlined"
                  startIcon={<Edit />}
                  onClick={() => setIsEditingProfile(true)}
                >
                  Edit Profile
                </Button>
              )
            }
          />
          <CardContent sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {apiErrors?.error && (
              <Alert severity="error">{apiErrors.error}</Alert>
            )}

            <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
              <Avatar 
                sx={{ 
                  width: 100, 
                  height: 100, 
                  fontSize: "2rem",
                  fontWeight: 700,
                  bgcolor: getAvatarColor(),
                  color: "#ffffff",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
                }}
              >
                {getInitials()}
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight={600}>
                  {firstName} {lastName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {email}
                </Typography>
              </Box>
            </Box>

            <Divider />

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                gap: 2,
              }}
            >
              <TextField
                label="First Name"
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.target.value);
                  setFormErrors((prev) => ({ ...prev, firstName: "" }));
                }}
                fullWidth
                required
                disabled={!isEditingProfile}
                error={!!getFieldError("firstName")}
                helperText={getFieldError("firstName")}
                InputProps={{
                  readOnly: !isEditingProfile,
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person color="action" />
                    </InputAdornment>
                  ),
                }}
                inputProps={{ maxLength: 30 }}
              />
              <TextField
                label="Last Name"
                value={lastName}
                onChange={(e) => {
                  setLastName(e.target.value);
                  setFormErrors((prev) => ({ ...prev, lastName: "" }));
                }}
                fullWidth
                required
                disabled={!isEditingProfile}
                error={!!getFieldError("lastName")}
                helperText={getFieldError("lastName")}
                InputProps={{
                  readOnly: !isEditingProfile,
                }}
                inputProps={{ maxLength: 30 }}
              />
            </Box>

            <TextField
              label="Email Address"
              type="email"
              value={email}
              fullWidth
              disabled
              InputProps={{
                readOnly: true,
                startAdornment: (
                  <InputAdornment position="start">
                    <Email color="action" />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              label="Phone Number"
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setFormErrors((prev) => ({ ...prev, phone: "" }));
              }}
              fullWidth
              disabled={!isEditingProfile}
              error={!!getFieldError("phone")}
              helperText={getFieldError("phone")}
              InputProps={{
                readOnly: !isEditingProfile,
                startAdornment: (
                  <InputAdornment position="start">
                    <Phone color="action" />
                  </InputAdornment>
                ),
              }}
              inputProps={{ maxLength: 16 }}
            />

            <Divider />
            <Typography variant="subtitle1" fontWeight={600}>
              Address
            </Typography>

            <TextField
              label="Street Address"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                setFormErrors((prev) => ({ ...prev, address: "" }));
              }}
              fullWidth
              disabled={!isEditingProfile}
              error={!!getFieldError("address")}
              helperText={getFieldError("address")}
              InputProps={{
                readOnly: !isEditingProfile,
                startAdornment: (
                  <InputAdornment position="start">
                    <Home color="action" />
                  </InputAdornment>
                ),
              }}
              inputProps={{ maxLength: 200 }}
            />

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "2fr 1fr 1fr" },
                gap: 2,
              }}
            >
              <TextField
                label="City"
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  setFormErrors((prev) => ({ ...prev, city: "" }));
                }}
                fullWidth
                disabled={!isEditingProfile}
                error={!!getFieldError("city")}
                helperText={getFieldError("city")}
                InputProps={{
                  readOnly: !isEditingProfile,
                  startAdornment: (
                    <InputAdornment position="start">
                      <LocationCity color="action" />
                    </InputAdornment>
                  ),
                }}
                inputProps={{ maxLength: 50 }}
              />
              <TextField
                label="State"
                value={state}
                onChange={(e) => {
                  setState(e.target.value);
                  setFormErrors((prev) => ({ ...prev, state: "" }));
                }}
                fullWidth
                disabled={!isEditingProfile}
                error={!!getFieldError("state")}
                helperText={getFieldError("state")}
                InputProps={{
                  readOnly: !isEditingProfile,
                }}
                inputProps={{ maxLength: 30 }}
              />
              <TextField
                label="ZIP Code"
                value={zipCode}
                onChange={(e) => {
                  setZipCode(e.target.value);
                  setFormErrors((prev) => ({ ...prev, zipCode: "" }));
                }}
                fullWidth
                disabled={!isEditingProfile}
                placeholder="12345"
                error={!!getFieldError("zipCode")}
                helperText={getFieldError("zipCode")}
                InputProps={{
                  readOnly: !isEditingProfile,
                }}
                inputProps={{ maxLength: 5 }}
              />
            </Box>

            {isEditingProfile && (
              <Box
                sx={{ display: "flex", justifyContent: "flex-end", gap: 2, mt: 2 }}
              >
                <Button variant="outlined" onClick={handleCancelProfileEdit}>
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Danger Zone Card - Only visible in edit mode */}
        {isEditingProfile && (
          <Card
            sx={{
              mt: 3,
              borderColor: "error.main",
              borderWidth: 1,
              borderStyle: "solid",
            }}
          >
            <CardHeader
              title={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Warning color="error" />
                  <Typography variant="h6" color="error">
                    Danger Zone
                  </Typography>
                </Box>
              }
              subheader="Irreversible actions for your account"
            />
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 2,
                }}
              >
                <Box>
                  <Typography fontWeight={600}>Deactivate Account</Typography>
                  <Typography variant="body2" color="text.secondary">
                    This will deactivate your account. You will no longer be able
                    to log in.
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => setShowDeactivateDialog(true)}
                >
                  Deactivate Account
                </Button>
              </Box>

              {deactivateError && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {deactivateError.response?.data?.error ||
                    "Failed to deactivate account. Please try again."}
                </Alert>
              )}
            </CardContent>
          </Card>
        )}
      </TabPanel>

      {/* Security Tab */}
      <TabPanel value={tabValue} index={1}>
        <Card>
          <CardHeader
            title="Password"
            subheader="Update your password to keep your account secure"
            action={
              !isEditingPassword && (
                <Button
                  variant="outlined"
                  startIcon={<Edit />}
                  onClick={() => setIsEditingPassword(true)}
                >
                  Change Password
                </Button>
              )
            }
          />
          {isEditingPassword && (
            <CardContent
              sx={{ display: "flex", flexDirection: "column", gap: 2 }}
            >
              <TextField
                label="Current Password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock color="action" />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                label="New Password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock color="action" />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                label="Confirm New Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                fullWidth
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock color="action" />
                    </InputAdornment>
                  ),
                }}
              />
              <Box
                sx={{ display: "flex", justifyContent: "flex-end", gap: 2, mt: 1 }}
              >
                <Button variant="outlined" onClick={handleCancelPasswordEdit}>
                  Cancel
                </Button>
                <Button variant="contained" onClick={handleUpdatePassword}>
                  Update Password
                </Button>
              </Box>
            </CardContent>
          )}
        </Card>
      </TabPanel>

      {/* My Agencies Tab */}
      <TabPanel value={tabValue} index={2}>
        <Card>
          <CardHeader
            title="My Agencies"
            subheader="Manage your registered care agencies"
          />
          <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {/* Loading State */}
            {isLoadingVendors && (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <CircularProgress size={32} />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Loading your agencies...
                </Typography>
              </Box>
            )}

            {/* Error State */}
            {isVendorsError && !isLoadingVendors && (
              <Alert
                severity="error"
                action={
                  <Button color="inherit" size="small" onClick={() => refetchVendors()}>
                    Retry
                  </Button>
                }
              >
                Failed to load your agencies. Please try again.
              </Alert>
            )}

            {/* Empty State */}
            {!isLoadingVendors && !isVendorsError && myVendors.length === 0 && (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <Business sx={{ fontSize: 48, color: "text.disabled", mb: 1 }} />
                <Typography variant="body1" color="text.secondary">
                  You don&apos;t have any registered agencies yet.
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Claim an existing agency profile or contact support to register a new one.
                </Typography>
              </Box>
            )}

            {/* Agency List */}
            {!isLoadingVendors && !isVendorsError && myVendors.length > 0 && (
              <>
                {myVendors.map((vendor) => (
                  <Box
                    key={vendor.id}
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      p: 2,
                      border: 1,
                      borderColor: "divider",
                      borderRadius: 2,
                      transition: "background-color 0.2s",
                      "&:hover": {
                        bgcolor: "grey.50",
                      },
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 2,
                          bgcolor: vendor.image ? "transparent" : "primary.light",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          overflow: "hidden",
                        }}
                      >
                        {vendor.image ? (
                          <Box
                            component="img"
                            src={vendor.image}
                            alt={vendor.display_name || vendor.legal_name}
                            sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        ) : (
                          <Business color="primary" />
                        )}
                      </Box>
                      <Box>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Typography fontWeight={600}>
                            {vendor.display_name || vendor.legal_name}
                          </Typography>
                          {vendor.verified && (
                            <Box
                              component="span"
                              sx={{
                                bgcolor: "success.main",
                                color: "white",
                                fontSize: "0.65rem",
                                fontWeight: 600,
                                px: 0.75,
                                py: 0.25,
                                borderRadius: 0.5,
                              }}
                            >
                              Verified
                            </Box>
                          )}
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          {vendor.primary_county}
                        </Typography>
                      </Box>
                    </Box>
                    <Button
                      variant="outlined"
                      size="small"
                      href={`/agencies/${vendor.id}/edit`}
                      startIcon={<Edit />}
                    >
                      Edit Profile
                    </Button>
                  </Box>
                ))}
              </>
            )}
          </CardContent>
        </Card>
      </TabPanel>

      {/* Deactivation Confirmation Dialog */}
      <Dialog
        open={showDeactivateDialog}
        onClose={() => setShowDeactivateDialog(false)}
      >
        <DialogTitle>Deactivate Account?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to deactivate your account? This action cannot
            be undone and you will no longer be able to access your account.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeactivateDialog(false)}>Cancel</Button>
          <Button
            onClick={handleDeactivateAccount}
            color="error"
            variant="contained"
            disabled={isDeactivating}
          >
            {isDeactivating ? "Deactivating..." : "Yes, Deactivate"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}