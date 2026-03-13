import {
  validateVendorForm,
  isVendorFormValid,
  VENDOR_FIELD_LIMITS,
  VendorFormData,
} from "@/utils/validateVendorForm";

const validForm: VendorFormData = {
  displayName: "Test Agency",
  description: "A test description",
  contactPhone: "555-123-4567",
  contactEmail: "contact@test.com",
  website: "https://test.com",
  primaryCounty: "Marion",
  availability: "MTWRF: 09:00-17:00",
};

describe("validateVendorForm", () => {
  describe("Display Name", () => {
    it("empty name - returns error", () => {
      const errors = validateVendorForm({ ...validForm, displayName: "" });
      expect(errors.displayName).toBe("Display name is required");
    });

    it("whitespace only name - returns error", () => {
      const errors = validateVendorForm({ ...validForm, displayName: "   " });
      expect(errors.displayName).toBe("Display name is required");
    });

    it("1 char name (min) - valid", () => {
      const errors = validateVendorForm({ ...validForm, displayName: "A" });
      expect(errors.displayName).toBeUndefined();
    });

    it("max length name (255 chars) - valid", () => {
      const maxName = "a".repeat(VENDOR_FIELD_LIMITS.displayName.max);
      const errors = validateVendorForm({ ...validForm, displayName: maxName });
      expect(errors.displayName).toBeUndefined();
    });

    it("max+1 length name (256 chars) - returns error", () => {
      const overMax = "a".repeat(VENDOR_FIELD_LIMITS.displayName.max + 1);
      const errors = validateVendorForm({ ...validForm, displayName: overMax });
      expect(errors.displayName).toContain("255 characters or less");
    });

    it("special chars - valid", () => {
      const errors = validateVendorForm({ ...validForm, displayName: "Agency & Sons (LLC) #1!" });
      expect(errors.displayName).toBeUndefined();
    });

    it("HTML injection - valid (sanitization is backend's job)", () => {
      const errors = validateVendorForm({ ...validForm, displayName: "<script>alert('xss')</script>" });
      expect(errors.displayName).toBeUndefined();
    });
  });

  describe("Description", () => {
    it("empty description - valid (not required)", () => {
      const errors = validateVendorForm({ ...validForm, description: "" });
      expect(errors.description).toBeUndefined();
    });

    it("1 char description (min) - valid", () => {
      const errors = validateVendorForm({ ...validForm, description: "A" });
      expect(errors.description).toBeUndefined();
    });

    it("max length description (5000 chars) - valid", () => {
      const maxDesc = "a".repeat(VENDOR_FIELD_LIMITS.description.max);
      const errors = validateVendorForm({ ...validForm, description: maxDesc });
      expect(errors.description).toBeUndefined();
    });

    it("max+1 length description (5001 chars) - returns error", () => {
      const overMax = "a".repeat(VENDOR_FIELD_LIMITS.description.max + 1);
      const errors = validateVendorForm({ ...validForm, description: overMax });
      expect(errors.description).toContain("5000 characters or less");
    });

    it("multiline description - valid", () => {
      const errors = validateVendorForm({ ...validForm, description: "Line 1\nLine 2\nLine 3" });
      expect(errors.description).toBeUndefined();
    });

    it("HTML in description - valid", () => {
      const errors = validateVendorForm({ ...validForm, description: "<b>Bold</b> text" });
      expect(errors.description).toBeUndefined();
    });
  });

  describe("Phone Number", () => {
    it("empty phone - valid (not required)", () => {
      const errors = validateVendorForm({ ...validForm, contactPhone: "" });
      expect(errors.contactPhone).toBeUndefined();
    });

    it("9 digits (min-1) - returns error", () => {
      const errors = validateVendorForm({ ...validForm, contactPhone: "555123456" });
      expect(errors.contactPhone).toContain("at least 10 digits");
    });

    it("10 digits (min) - valid", () => {
      const errors = validateVendorForm({ ...validForm, contactPhone: "5551234567" });
      expect(errors.contactPhone).toBeUndefined();
    });

    it("10 digits with dashes - valid", () => {
      const errors = validateVendorForm({ ...validForm, contactPhone: "555-123-4567" });
      expect(errors.contactPhone).toBeUndefined();
    });

    it("10 digits with parentheses - valid", () => {
      const errors = validateVendorForm({ ...validForm, contactPhone: "(555) 123-4567" });
      expect(errors.contactPhone).toBeUndefined();
    });

    it("max length phone (20 chars) - valid", () => {
      const maxPhone = "1".repeat(VENDOR_FIELD_LIMITS.contactPhone.max);
      const errors = validateVendorForm({ ...validForm, contactPhone: maxPhone });
      expect(errors.contactPhone).toBeUndefined();
    });

    it("max+1 length phone (21 chars) - returns error", () => {
      const overMax = "1".repeat(VENDOR_FIELD_LIMITS.contactPhone.max + 1);
      const errors = validateVendorForm({ ...validForm, contactPhone: overMax });
      expect(errors.contactPhone).toContain("20 characters or less");
    });
  });

  describe("Email Address", () => {
    it("empty email - valid (not required)", () => {
      const errors = validateVendorForm({ ...validForm, contactEmail: "" });
      expect(errors.contactEmail).toBeUndefined();
    });

    it("valid email - valid", () => {
      const errors = validateVendorForm({ ...validForm, contactEmail: "test@example.com" });
      expect(errors.contactEmail).toBeUndefined();
    });

    it("email with subdomain - valid", () => {
      const errors = validateVendorForm({ ...validForm, contactEmail: "test@mail.example.com" });
      expect(errors.contactEmail).toBeUndefined();
    });

    it("email with plus - valid", () => {
      const errors = validateVendorForm({ ...validForm, contactEmail: "test+tag@example.com" });
      expect(errors.contactEmail).toBeUndefined();
    });

    it("no @ symbol - returns error", () => {
      const errors = validateVendorForm({ ...validForm, contactEmail: "testexample.com" });
      expect(errors.contactEmail).toBe("Please enter a valid email address");
    });

    it("no domain - returns error", () => {
      const errors = validateVendorForm({ ...validForm, contactEmail: "test@" });
      expect(errors.contactEmail).toBe("Please enter a valid email address");
    });

    it("no TLD - returns error", () => {
      const errors = validateVendorForm({ ...validForm, contactEmail: "test@example" });
      expect(errors.contactEmail).toBe("Please enter a valid email address");
    });

    it("multiple @ symbols - returns error", () => {
      const errors = validateVendorForm({ ...validForm, contactEmail: "test@@example.com" });
      expect(errors.contactEmail).toBe("Please enter a valid email address");
    });

    it("max length email (254 chars) - valid", () => {
      const localPart = "a".repeat(VENDOR_FIELD_LIMITS.contactEmail.max - 12); // Leave room for @example.com
      const errors = validateVendorForm({ ...validForm, contactEmail: `${localPart}@example.com` });
      expect(errors.contactEmail).toBeUndefined();
    });

    it("max+1 length email (255 chars) - returns error", () => {
      const overMax = "a".repeat(VENDOR_FIELD_LIMITS.contactEmail.max + 1);
      const errors = validateVendorForm({ ...validForm, contactEmail: `${overMax}@example.com` });
      expect(errors.contactEmail).toContain("254 characters or less");
    });
  });

  describe("Website", () => {
    it("empty website - valid (not required)", () => {
      const errors = validateVendorForm({ ...validForm, website: "" });
      expect(errors.website).toBeUndefined();
    });

    it("https URL - valid", () => {
      const errors = validateVendorForm({ ...validForm, website: "https://example.com" });
      expect(errors.website).toBeUndefined();
    });

    it("http URL - valid", () => {
      const errors = validateVendorForm({ ...validForm, website: "http://example.com" });
      expect(errors.website).toBeUndefined();
    });

    it("URL without protocol - valid", () => {
      const errors = validateVendorForm({ ...validForm, website: "example.com" });
      expect(errors.website).toBeUndefined();
    });

    it("URL with www - valid", () => {
      const errors = validateVendorForm({ ...validForm, website: "www.example.com" });
      expect(errors.website).toBeUndefined();
    });

    it("URL with path - valid", () => {
      const errors = validateVendorForm({ ...validForm, website: "https://example.com/about" });
      expect(errors.website).toBeUndefined();
    });

    it("invalid URL - returns error", () => {
      const errors = validateVendorForm({ ...validForm, website: "not a url at all" });
      expect(errors.website).toBe("Please enter a valid URL");
    });

    it("just protocol - returns error", () => {
      const errors = validateVendorForm({ ...validForm, website: "https://" });
      expect(errors.website).toBe("Please enter a valid URL");
    });

    it("max length website (200 chars) - valid", () => {
      const domain = "a".repeat(VENDOR_FIELD_LIMITS.website.max - 12); // Leave room for https://.com
      const errors = validateVendorForm({ ...validForm, website: `https://${domain}.com` });
      expect(errors.website).toBeUndefined();
    });

    it("max+1 length website (201 chars) - returns error", () => {
      const overMax = "a".repeat(VENDOR_FIELD_LIMITS.website.max + 1);
      const errors = validateVendorForm({ ...validForm, website: overMax });
      expect(errors.website).toContain("200 characters or less");
    });
  });

  describe("Primary County", () => {
    it("empty county - valid (not required)", () => {
      const errors = validateVendorForm({ ...validForm, primaryCounty: "" });
      expect(errors.primaryCounty).toBeUndefined();
    });

    it("valid county - valid", () => {
      const errors = validateVendorForm({ ...validForm, primaryCounty: "Marion" });
      expect(errors.primaryCounty).toBeUndefined();
    });
  });

  describe("Availability", () => {
    it("empty availability - valid (not required)", () => {
      const errors = validateVendorForm({ ...validForm, availability: "" });
      expect(errors.availability).toBeUndefined();
    });

    it("1 char availability (min) - valid", () => {
      const errors = validateVendorForm({ ...validForm, availability: "M" });
      expect(errors.availability).toBeUndefined();
    });

    it("valid availability - valid", () => {
      const errors = validateVendorForm({ ...validForm, availability: "MTWRF: 09:00-17:00" });
      expect(errors.availability).toBeUndefined();
    });

    it("24 hours availability - valid", () => {
      const errors = validateVendorForm({ ...validForm, availability: "MTWRFSU: 24 hours" });
      expect(errors.availability).toBeUndefined();
    });

    it("multiple slots availability - valid", () => {
      const errors = validateVendorForm({ ...validForm, availability: "MWF: 09:00-12:00; TR: 13:00-17:00" });
      expect(errors.availability).toBeUndefined();
    });

    it("max length availability (100 chars) - valid", () => {
      const maxAvail = "a".repeat(VENDOR_FIELD_LIMITS.availability.max);
      const errors = validateVendorForm({ ...validForm, availability: maxAvail });
      expect(errors.availability).toBeUndefined();
    });

    it("max+1 length availability (101 chars) - returns error", () => {
      const overMax = "a".repeat(VENDOR_FIELD_LIMITS.availability.max + 1);
      const errors = validateVendorForm({ ...validForm, availability: overMax });
      expect(errors.availability).toContain("100 characters or less");
    });
  });

  describe("isVendorFormValid helper", () => {
    it("returns true for valid form", () => {
      expect(isVendorFormValid(validForm)).toBe(true);
    });

    it("returns false when display name is empty", () => {
      expect(isVendorFormValid({ ...validForm, displayName: "" })).toBe(false);
    });

    it("returns false when email is invalid", () => {
      expect(isVendorFormValid({ ...validForm, contactEmail: "invalid" })).toBe(false);
    });

    it("returns false when phone is too short", () => {
      expect(isVendorFormValid({ ...validForm, contactPhone: "123" })).toBe(false);
    });

    it("returns true with minimal valid data", () => {
      expect(isVendorFormValid({
        displayName: "A",
        description: "",
        contactPhone: "",
        contactEmail: "",
        website: "",
        primaryCounty: "",
        availability: "",
      })).toBe(true);
    });
  });
});
