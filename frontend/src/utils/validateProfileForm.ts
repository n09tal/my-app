export interface ProfileFormData {
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface ValidationErrors {
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

export function validateProfileForm(data: ProfileFormData): ValidationErrors {
  const errors: ValidationErrors = {};

  if (!data.firstName.trim()) {
    errors.firstName = "First name is required";
  } else if (data.firstName.length > 30) {
    errors.firstName = "First name must be 30 characters or less";
  }

  if (!data.lastName.trim()) {
    errors.lastName = "Last name is required";
  } else if (data.lastName.length > 30) {
    errors.lastName = "Last name must be 30 characters or less";
  }

  if (data.phone && data.phone.length > 16) {
    errors.phone = "Phone must be 16 characters or less";
  } else if (data.phone && data.phone.length < 10) {
    errors.phone = "Phone must be at least 10 characters";
  }

  if (data.address && data.address.length > 200) {
    errors.address = "Address must be 200 characters or less";
  }

  if (data.city && data.city.length > 50) {
    errors.city = "City must be 50 characters or less";
  }

  if (data.state && data.state.length > 30) {
    errors.state = "State must be 30 characters or less";
  } else if (data.state && data.state.length < 2) {
    errors.state = "State must be at least 2 characters";
  }

  if (data.zipCode && data.zipCode.length !== 5) {
    errors.zipCode = "ZIP code must be 5 characters";
  }

  return errors;
}

export function isProfileFormValid(data: ProfileFormData): boolean {
  return Object.keys(validateProfileForm(data)).length === 0;
}

