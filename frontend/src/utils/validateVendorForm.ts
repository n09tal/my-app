// ============================================================================
// TYPES
// ============================================================================

export interface VendorFormData {
  displayName: string;      // maps to dba (max 255)
  description: string;      // TextField - no hard limit
  contactPhone: string;     // max 20
  contactEmail: string;     // EmailField - max 254
  website: string;          // URLField - max 200
  primaryCounty: string;    // max 100
  availability: string;     // max 100
}

export interface VendorValidationErrors {
  displayName?: string;
  description?: string;
  contactPhone?: string;
  contactEmail?: string;
  website?: string;
  primaryCounty?: string;
  availability?: string;
}

// ============================================================================
// CONSTANTS - From Django VendorDirectory model
// ============================================================================

export const VENDOR_FIELD_LIMITS = {
  displayName: { max: 255, required: true },     // dba field
  legalName: { max: 255, required: true },       // legal_name field
  description: { max: 5000, required: false },   // TextField - soft limit for UX
  contactPhone: { max: 20, required: false },
  contactEmail: { max: 254, required: false },   // Django EmailField default
  website: { max: 200, required: false },        // Django URLField default
  primaryCounty: { max: 100, required: false },
  availability: { max: 100, required: false },
};

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

function isValidUrl(url: string): boolean {
  if (!url) return true;
  try {
    const urlWithProtocol = url.startsWith("http") ? url : `https://${url}`;
    new URL(urlWithProtocol);
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// MAIN VALIDATION FUNCTION
// ============================================================================

export function validateVendorForm(data: VendorFormData): VendorValidationErrors {
  const errors: VendorValidationErrors = {};
  const limits = VENDOR_FIELD_LIMITS;

  // Display Name (dba) - Required
  if (!data.displayName.trim()) {
    errors.displayName = "Display name is required";
  } else if (data.displayName.length > limits.displayName.max) {
    errors.displayName = `Display name must be ${limits.displayName.max} characters or less`;
  }

  // Description - Optional, soft limit
  if (data.description && data.description.length > limits.description.max) {
    errors.description = `Description must be ${limits.description.max} characters or less`;
  }

  // Phone - Optional, max 20 chars
  if (data.contactPhone) {
    if (data.contactPhone.length > limits.contactPhone.max) {
      errors.contactPhone = `Phone must be ${limits.contactPhone.max} characters or less`;
    } else {
      const digitsOnly = data.contactPhone.replace(/\D/g, "");
      if (digitsOnly.length > 0 && digitsOnly.length < 10) {
        errors.contactPhone = "Phone must be at least 10 digits";
      }
    }
  }

  // Email - Optional, max 254, must be valid format
  if (data.contactEmail) {
    if (data.contactEmail.length > limits.contactEmail.max) {
      errors.contactEmail = `Email must be ${limits.contactEmail.max} characters or less`;
    } else if (!isValidEmail(data.contactEmail)) {
      errors.contactEmail = "Please enter a valid email address";
    }
  }

  // Website - Optional, max 200, must be valid URL
  if (data.website) {
    if (data.website.length > limits.website.max) {
      errors.website = `Website must be ${limits.website.max} characters or less`;
    } else if (!isValidUrl(data.website)) {
      errors.website = "Please enter a valid URL";
    }
  }

  // Primary County - Optional, max 100
  if (data.primaryCounty && data.primaryCounty.length > limits.primaryCounty.max) {
    errors.primaryCounty = `County must be ${limits.primaryCounty.max} characters or less`;
  }

  // Availability - Optional, max 100
  if (data.availability && data.availability.length > limits.availability.max) {
    errors.availability = `Availability must be ${limits.availability.max} characters or less`;
  }

  return errors;
}

// ============================================================================
// HELPER
// ============================================================================

export function isVendorFormValid(data: VendorFormData): boolean {
  return Object.keys(validateVendorForm(data)).length === 0;
}

