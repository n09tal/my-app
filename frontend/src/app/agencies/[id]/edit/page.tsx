"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardHeader,
  TextField,
  Button,
  InputAdornment,
  Chip,
  Autocomplete,
  CircularProgress,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Checkbox,
  Menu,
  MenuItem,
  ListItemText,
  IconButton,
  Paper,
} from "@mui/material";
import {
  Business,
  LocationOn,
  Phone,
  Email,
  Language,
  Public,
  AttachMoney,
  MedicalServices,
  CloudUpload,
  ExpandMore,
  Close,
  AccessTime,
  Add,
  Delete,
} from "@mui/icons-material";
import { useVendor, useUpdateVendorMutation, useServices, useFundingSources, useCounties } from "@/features/vendors";
import type { UpdateVendorData, County } from "@/features/vendors";
import {
  parseAvailabilityString,
  formatAvailabilityForSave,
  formatWebsiteUrl,
  type AvailabilityGroup,
} from "@/utils/providerUtils";
import {
  validateVendorForm,
  VendorValidationErrors,
  VENDOR_FIELD_LIMITS,
} from "@/utils/validateVendorForm";

const AVAILABLE_LANGUAGES = [
  "English",
  "Spanish",
  "Mandarin",
  "French",
  "German",
  "Vietnamese",
  "Korean",
  "Tagalog",
  "Arabic",
  "Hindi",
];

const DAYS_OF_WEEK = [
  { key: "M", label: "Mon" },
  { key: "T", label: "Tue" },
  { key: "W", label: "Wed" },
  { key: "R", label: "Thu" },
  { key: "F", label: "Fri" },
  { key: "S", label: "Sat" },
  { key: "U", label: "Sun" },
];

export default function EditAgencyPage() {
  const params = useParams();
  const router = useRouter();
  const agencyId = parseInt(params.id as string);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { vendor, isLoading: isLoadingVendor } = useVendor(agencyId);
  const { updateVendor, isLoading: isUpdating } =
    useUpdateVendorMutation(agencyId);
  
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<VendorValidationErrors>({});

const { services: allServices, isLoading: isLoadingServices } = useServices();
const { fundingSources: allFundingSources, isLoading: isLoadingFundingSources } = useFundingSources();
const { counties: allCounties, isLoading: isLoadingCounties } = useCounties();

  const [name, setName] = useState("");
  const [county, setCounty] = useState("");
  const [selectedCounties, setSelectedCounties] = useState<County[]>([]);
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [languages, setLanguages] = useState<string[]>([]);
  const [selectedServices, setSelectedServices] = useState<{ id: number; name: string }[]>([]);
  const [selectedFundingSources, setSelectedFundingSources] = useState<{ id: number; name: string }[]>([]);
  const [website, setWebsite] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");


  const [availabilityGroups, setAvailabilityGroups] = useState<AvailabilityGroup[]>([
    { id: "1", days: [], startTime: "09:00", endTime: "17:00", is24Hours: false },
  ]);


  const [servicesModalOpen, setServicesModalOpen] = useState(false);
  const [fundingSourceAnchor, setFundingSourceAnchor] = useState<null | HTMLElement>(null);


  useEffect(() => {
    if (vendor) {
      setName(vendor.display_name || vendor.legal_name || "");
      setCounty(vendor.primary_county || "");
      setDescription(vendor.description || "");
      setPhone(vendor.contact_phone || "");
      setEmail(vendor.contact_email || "");
      setLanguages(vendor.languages || []);
      setSelectedServices(vendor.services || []);
      setSelectedFundingSources(vendor.funding_sources || []);
      setSelectedCounties(vendor.counties || []);
      setWebsite(vendor.website || "");
      setLogoPreview(vendor.image || "");

      if (vendor.availability) {
        const parsedGroups = parseAvailabilityString(vendor.availability);
        if (parsedGroups.length > 0) {
          setAvailabilityGroups(parsedGroups);
        }
      }
    }
  }, [vendor]);

  const addAvailabilityGroup = () => {
    setAvailabilityGroups((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        days: [],
        startTime: "09:00",
        endTime: "17:00",
        is24Hours: false,
      },
    ]);
  };

  const removeAvailabilityGroup = (groupId: string) => {
    if (availabilityGroups.length > 1) {
      setAvailabilityGroups((prev) => prev.filter((g) => g.id !== groupId));
    }
  };

  const toggleDay = (groupId: string, dayKey: string) => {
    setAvailabilityGroups((prev) =>
      prev.map((group) => {
        if (group.id === groupId) {
          const newDays = group.days.includes(dayKey)
            ? group.days.filter((d) => d !== dayKey)
            : [...group.days, dayKey];
          return { ...group, days: newDays };
        }
        return group;
      })
    );
  };

  const updateGroupTime = (
    groupId: string,
    field: "startTime" | "endTime",
    value: string
  ) => {
    setAvailabilityGroups((prev) =>
      prev.map((group) => {
        if (group.id === groupId) {
          return { ...group, [field]: value, is24Hours: false };
        }
        return group;
      })
    );
  };

  const toggle24Hours = (groupId: string) => {
    setAvailabilityGroups((prev) =>
      prev.map((group) => {
        if (group.id === groupId) {
          const newIs24Hours = !group.is24Hours;
          return {
            ...group,
            is24Hours: newIs24Hours,
            startTime: newIs24Hours ? "00:00" : "09:00",
            endTime: newIs24Hours ? "23:59" : "17:00",
          };
        }
        return group;
      })
    );
  };


  const handleLogoSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        alert("Please select an image file");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert("Image must be less than 5MB");
        return;
      }
      setLogoFile(file);
      const previewUrl = URL.createObjectURL(file);
      setLogoPreview(previewUrl);
    }
  };


const toggleService = (serviceId: number) => {
  setSelectedServices((prev) => {
    const exists = prev.find((s) => s.id === serviceId);
    if (exists) {
      return prev.filter((s) => s.id !== serviceId);
    } else {
      const service = allServices.find((s) => s.id === serviceId);
      if (service) {
        return [...prev, service];
      }
      return prev;
    }
  });
};

const toggleFundingSource = (sourceId: number) => {
  setSelectedFundingSources((prev) => {
    const exists = prev.find((f) => f.id === sourceId);
    if (exists) {
      return prev.filter((f) => f.id !== sourceId);
    } else {
      const source = allFundingSources.find((f) => f.id === sourceId);
      if (source) {
        return [...prev, source];
      }
      return prev;
    }
  });
};


const validateForm = (): boolean => {
  const availability = formatAvailabilityForSave(availabilityGroups);
  const errors = validateVendorForm({
    displayName: name,
    description,
    contactPhone: phone,
    contactEmail: email,
    website,
    primaryCounty: county,
    availability,
  });
  setValidationErrors(errors);
  return Object.keys(errors).length === 0;
};

const handleSave = async () => {
  if (!validateForm()) {
    setErrorMessage("Please fix the errors before saving");
    setSnackbarOpen(true);
    return;
  }

  const availability = formatAvailabilityForSave(availabilityGroups);

  let imageUrl = logoPreview;
  if (logoFile) {
    imageUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(logoFile);
    });
  }


  const formattedWebsite = formatWebsiteUrl(website);

  const updateData: UpdateVendorData = {
    display_name: name,
    availability,
    primary_county: county,
    description,
    contact_phone: phone,
    contact_email: email,
    languages,
    services: selectedServices.map((s) => s.id),
    funding_sources: selectedFundingSources.map((f) => f.id),
    counties: selectedCounties.map((c) => c.id),
    ...(formattedWebsite && { website: formattedWebsite }),
    image: imageUrl,
  };

  updateVendor(updateData, {
    onSuccess: () => {
      router.push(`/agencies/${agencyId}`);
    },
    onError: (error: unknown) => {
      // Extract error message from Axios error response
      let message = "Failed to save changes. Please try again.";
      
      if (error && typeof error === "object") {
        const axiosError = error as { response?: { data?: { detail?: string; message?: string; [key: string]: unknown } } };
        if (axiosError.response?.data) {
          const data = axiosError.response.data;
          if (data.detail) {
            message = data.detail;
          } else if (data.message) {
            message = data.message;
          } else {
            // Handle field-specific errors (e.g., { "primary_county": ["This field is required."] })
            const fieldErrors = Object.entries(data)
              .filter(([key]) => key !== "detail" && key !== "message")
              .map(([field, errors]) => {
                const fieldName = field.replace(/_/g, " ");
                const errorMsg = Array.isArray(errors) ? errors.join(", ") : String(errors);
                return `${fieldName}: ${errorMsg}`;
              });
            if (fieldErrors.length > 0) {
              message = fieldErrors.join("; ");
            }
          }
        }
      }
      
      setErrorMessage(message);
      setSnackbarOpen(true);
    },
  });
};

  const handleCancel = () => {
    router.back();
  };

  if (isLoadingVendor || isLoadingServices || isLoadingFundingSources || isLoadingCounties) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "50vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Edit Agency Profile
        </Typography>
        <Typography color="text.secondary">
          Update your agency information
        </Typography>
      </Box>

      {/* Error Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity="error"
          variant="filled"
          sx={{ width: "100%" }}
        >
          {errorMessage}
        </Alert>
      </Snackbar>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {/* Basic Information */}
        <Card>
          <CardHeader
            title="Basic Information"
            subheader="Your agency's name and description"
          />
          <CardContent
            sx={{ display: "flex", flexDirection: "column", gap: 3 }}
          >
            <TextField
              label="Display Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              required
              error={!!validationErrors.displayName}
              helperText={validationErrors.displayName || `${name.length}/${VENDOR_FIELD_LIMITS.displayName.max}`}
              inputProps={{ maxLength: VENDOR_FIELD_LIMITS.displayName.max }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Business color="action" />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              multiline
              rows={5}
              error={!!validationErrors.description}
              helperText={validationErrors.description || `${description.length}/${VENDOR_FIELD_LIMITS.description.max} - Full description of your agency, mission, and values`}
              inputProps={{ maxLength: VENDOR_FIELD_LIMITS.description.max }}
            />

            {/* Logo Upload */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
                Agency Logo
              </Typography>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                style={{ display: "none" }}
              />
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                {logoPreview && (
                  <Box
                    component="img"
                    src={logoPreview}
                    alt="Logo preview"
                    sx={{
                      width: 100,
                      height: 100,
                      objectFit: "contain",
                      border: 1,
                      borderColor: "divider",
                      borderRadius: 1,
                    }}
                  />
                )}
                <Button
                  variant="outlined"
                  startIcon={<CloudUpload />}
                  onClick={handleLogoSelect}
                  sx={{ textTransform: "none" }}
                >
                  {logoPreview ? "Change Logo" : "Upload Logo"}
                </Button>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                Accepted formats: JPG, PNG, GIF. Max size: 5MB
              </Typography>
            </Box>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader
            title="Contact Information"
            subheader="How clients can reach you"
          />
          <CardContent sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                gap: 2,
              }}
            >
              <TextField
                label="Phone Number"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                fullWidth
                error={!!validationErrors.contactPhone}
                helperText={validationErrors.contactPhone}
                inputProps={{ maxLength: VENDOR_FIELD_LIMITS.contactPhone.max }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Phone color="action" />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
                error={!!validationErrors.contactEmail}
                helperText={validationErrors.contactEmail}
                inputProps={{ maxLength: VENDOR_FIELD_LIMITS.contactEmail.max }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email color="action" />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            <TextField
              label="Website"
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              fullWidth
              placeholder="https://www.example.com"
              error={!!validationErrors.website}
              helperText={validationErrors.website}
              inputProps={{ maxLength: VENDOR_FIELD_LIMITS.website.max }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Public color="action" />
                  </InputAdornment>
                ),
              }}
            />
          </CardContent>
        </Card>

        {/* Location & Availability */}
        <Card>
          <CardHeader
            title="Location & Availability"
            subheader="Where and when you provide services"
          />
          <CardContent sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <Autocomplete
              options={allCounties}
              value={allCounties.find((c) => c.name === county) || null}
              onChange={(_, newValue) => setCounty(newValue?.name || "")}
              getOptionLabel={(option) => option.name}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Primary County"
                  placeholder="Select primary county..."
                  helperText="Your main county of operation"
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <>
                        <InputAdornment position="start">
                          <LocationOn color="action" />
                        </InputAdornment>
                        {params.InputProps.startAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />

            <Autocomplete
              multiple
              disableCloseOnSelect
              options={allCounties}
              value={selectedCounties}
              onChange={(_, newValue) => setSelectedCounties(newValue)}
              getOptionLabel={(option) => option.name}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    label={option.name}
                    {...getTagProps({ index })}
                    key={option.id}
                    icon={<LocationOn />}
                    color="primary"
                    variant="outlined"
                  />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Additional Counties Served"
                  placeholder="Search counties..."
                  helperText="Other counties where you provide services"
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <>
                        <InputAdornment position="start">
                          <LocationOn color="action" />
                        </InputAdornment>
                        {params.InputProps.startAdornment}
                      </>
                    ),
                  }}
                />
              )}
              renderOption={(props, option, { selected }) => (
                <li {...props} key={option.id}>
                  <Checkbox
                    checked={selected}
                    sx={{ mr: 1 }}
                  />
                  {option.name}
                </li>
              )}
            />

            <Box>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Availability Schedule
                </Typography>
                <Button
                  size="small"
                  startIcon={<Add />}
                  onClick={addAvailabilityGroup}
                  sx={{ textTransform: "none" }}
                >
                  Add Time Slot
                </Button>
              </Box>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {availabilityGroups.map((group, index) => (
                  <Paper
                    key={group.id}
                    variant="outlined"
                    sx={{ p: 2, borderRadius: 2 }}
                  >
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" fontWeight={500}>
                        Time Slot {index + 1}
                      </Typography>
                      {availabilityGroups.length > 1 && (
                        <IconButton
                          size="small"
                          onClick={() => removeAvailabilityGroup(group.id)}
                          sx={{ color: "error.main" }}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      )}
                    </Box>

                    {/* Day Selection */}
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
                        Select Days
                      </Typography>
                      <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                        {DAYS_OF_WEEK.map((day) => (
                          <Chip
                            key={day.key}
                            label={day.key}
                            size="small"
                            onClick={() => toggleDay(group.id, day.key)}
                            color={group.days.includes(day.key) ? "primary" : "default"}
                            variant={group.days.includes(day.key) ? "filled" : "outlined"}
                            sx={{
                              minWidth: 36,
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          />
                        ))}
                      </Box>
                      {group.days.length > 0 && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                          {group.days
                            .map((d) => DAYS_OF_WEEK.find((day) => day.key === d)?.label)
                            .join(", ")}
                        </Typography>
                      )}
                    </Box>

                    {/* Time Selection */}
                    <Box>
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          Hours
                        </Typography>
                        <Button
                          size="small"
                          variant={group.is24Hours ? "contained" : "outlined"}
                          onClick={() => toggle24Hours(group.id)}
                          sx={{
                            textTransform: "none",
                            minWidth: "auto",
                            px: 1.5,
                            py: 0.25,
                            fontSize: "0.75rem",
                          }}
                        >
                          24 Hours
                        </Button>
                      </Box>

                      {!group.is24Hours ? (
                        <Box
                          sx={{
                            display: "grid",
                            gridTemplateColumns: "1fr auto 1fr",
                            gap: 1,
                            alignItems: "center",
                          }}
                        >
                          <TextField
                            type="time"
                            value={group.startTime}
                            onChange={(e) => updateGroupTime(group.id, "startTime", e.target.value)}
                            size="small"
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <AccessTime sx={{ fontSize: 18 }} color="action" />
                                </InputAdornment>
                              ),
                            }}
                          />
                          <Typography color="text.secondary">to</Typography>
                          <TextField
                            type="time"
                            value={group.endTime}
                            onChange={(e) => updateGroupTime(group.id, "endTime", e.target.value)}
                            size="small"
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <AccessTime sx={{ fontSize: 18 }} color="action" />
                                </InputAdornment>
                              ),
                            }}
                          />
                        </Box>
                      ) : (
                        <Box
                          sx={{
                            py: 1.5,
                            px: 2,
                            bgcolor: "primary.50",
                            borderRadius: 1,
                            textAlign: "center",
                          }}
                        >
                          <Typography variant="body2" color="primary.main" fontWeight={500}>
                            Available 24 Hours
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Paper>
                ))}
              </Box>

              {/* Preview of formatted availability */}
              {availabilityGroups.some((g) => g.days.length > 0) && (
                <Box sx={{ mt: 2, p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                    Schedule Preview:
                  </Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {formatAvailabilityForSave(availabilityGroups) || "No days selected"}
                  </Typography>
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>

        {/* Languages */}
        <Card>
          <CardHeader
            title="Languages"
            subheader="Languages your staff can communicate in"
          />
          <CardContent>
            <Autocomplete
              multiple
              options={AVAILABLE_LANGUAGES}
              value={languages}
              onChange={(_, newValue) => setLanguages(newValue)}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    label={option}
                    {...getTagProps({ index })}
                    key={option}
                  />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Languages Spoken"
                  placeholder="Add languages..."
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <>
                        <InputAdornment position="start">
                          <Language color="action" />
                        </InputAdornment>
                        {params.InputProps.startAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
          </CardContent>
        </Card>

        {/* Services - Modal Style like Filters */}
        <Card>
          <CardHeader
            title="Services"
            subheader="Services your agency provides"
          />
          <CardContent>
            <Button
              variant="outlined"
              fullWidth
              onClick={() => setServicesModalOpen(true)}
              sx={{
                justifyContent: "space-between",
                textTransform: "none",
                color: "text.primary",
                borderColor: "divider",
                bgcolor: "background.paper",
                mb: 2,
              }}
              endIcon={<ExpandMore />}
            >
              <span>
                {selectedServices.length > 0
                  ? `${selectedServices.length} service${selectedServices.length > 1 ? "s" : ""} selected`
                  : "Select services"}
              </span>
            </Button>

            {selectedServices.length > 0 && (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {selectedServices.map((service) => (
                  <Chip
                    key={service.id}
                    label={service.name}
                    onDelete={() => toggleService(service.id)}
                    color="primary"
                    variant="outlined"
                    icon={<MedicalServices />}
                  />
                ))}
              </Box>
            )}

            {/* Services Modal */}
            <Dialog
              open={servicesModalOpen}
              onClose={() => setServicesModalOpen(false)}
              maxWidth="md"
              fullWidth
              slotProps={{
                paper: {
                  sx: { maxHeight: "80vh" },
                },
              }}
            >
              <DialogTitle sx={{ m: 0, p: 2, pr: 6 }}>
                <Typography variant="h6" component="span" fontWeight={600}>
                  Select Services Provided
                </Typography>
                <Typography
                  variant="body2"
                  component="div"
                  color="text.secondary"
                  sx={{ mt: 0.5 }}
                >
                  Choose the types of care services your agency provides.
                </Typography>
                <IconButton
                  aria-label="close"
                  onClick={() => setServicesModalOpen(false)}
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
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {allServices.map((service) => (
                    <Accordion
                      key={service.id}
                      elevation={0}
                      sx={{
                        border: 1,
                        borderColor: "divider",
                        borderRadius: 1,
                        "&:before": { display: "none" },
                      }}
                    >
                      <AccordionSummary
                        expandIcon={<ExpandMore />}
                        sx={{
                          "& .MuiAccordionSummary-content": {
                            alignItems: "center",
                            gap: 1.5,
                            my: 1,
                          },
                        }}
                      >
                        <Checkbox
                          checked={selectedServices.some((s) => s.id === service.id)}
                          onChange={() => toggleService(service.id)}
                          onClick={(e) => e.stopPropagation()}
                          sx={{ p: 0 }}
                        />
                        <Typography fontWeight={500} sx={{ flex: 1 }}>
                          {service.name}
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails
                        sx={{ borderTop: 1, borderColor: "divider", pt: 2 }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          Service details
                        </Typography>
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </Box>
              </DialogContent>

              <DialogActions sx={{ p: 2, gap: 1 }}>
                <Button
                  variant="outlined"
                  onClick={() => setSelectedServices([])}
                  sx={{ textTransform: "none" }}
                >
                  Clear All
                </Button>
                <Button
                  variant="contained"
                  onClick={() => setServicesModalOpen(false)}
                  sx={{ textTransform: "none" }}
                >
                  Apply ({selectedServices.length})
                </Button>
              </DialogActions>
            </Dialog>
          </CardContent>
        </Card>

        {/* Funding Sources - Dropdown Style like Filters */}
        <Card>
          <CardHeader
            title="Funding Sources"
            subheader="Payment methods and funding sources accepted"
          />
          <CardContent>
            <Button
              variant="outlined"
              fullWidth
              onClick={(e) => setFundingSourceAnchor(e.currentTarget)}
              sx={{
                justifyContent: "space-between",
                textTransform: "none",
                color: "text.primary",
                borderColor: "divider",
                bgcolor: "background.paper",
                mb: 2,
              }}
              endIcon={<ExpandMore />}
            >
              <span>
                {selectedFundingSources.length > 0
                  ? `${selectedFundingSources.length} source${selectedFundingSources.length > 1 ? "s" : ""} selected`
                  : "Select funding sources"}
              </span>
            </Button>

            <Menu
              anchorEl={fundingSourceAnchor}
              open={Boolean(fundingSourceAnchor)}
              onClose={() => setFundingSourceAnchor(null)}
              PaperProps={{
                sx: {
                  maxHeight: 300,
                  width: fundingSourceAnchor?.offsetWidth || 200,
                },
              }}
            >
              {allFundingSources.map((source) => (
                <MenuItem
                  key={source.id}
                  onClick={() => toggleFundingSource(source.id)}
                  sx={{ py: 1 }}
                >
                  <Checkbox
                    checked={selectedFundingSources.some((f) => f.id === source.id)}
                    sx={{ mr: 1, p: 0 }}
                  />
                  <ListItemText primary={source.name} />
                </MenuItem>
              ))}
            </Menu>

            {selectedFundingSources.length > 0 && (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {selectedFundingSources.map((source) => (
                  <Chip
                    key={source.id}
                    label={source.name}
                    onDelete={() => toggleFundingSource(source.id)}
                    color="success"
                    variant="outlined"
                    icon={<AttachMoney />}
                  />
                ))}
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 2,
            pb: 4,
          }}
        >
          <Button variant="outlined" size="large" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            variant="contained"
            size="large"
            onClick={handleSave}
            disabled={isUpdating}
          >
            {isUpdating ? <CircularProgress size={24} /> : "Save Changes"}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}