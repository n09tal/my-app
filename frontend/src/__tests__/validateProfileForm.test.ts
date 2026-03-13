import {
  validateProfileForm,
  isProfileFormValid,
  ProfileFormData,
} from "@/utils/validateProfileForm";

const validData: ProfileFormData = {
  firstName: "John",
  lastName: "Doe",
  phone: "555-123-4567",
  address: "123 Main St",
  city: "Indianapolis",
  state: "Indiana",
  zipCode: "46202",
};

// Helper to test with overrides
const validate = (overrides: Partial<ProfileFormData>) => {
  return validateProfileForm({ ...validData, ...overrides });
};

describe("validateProfileForm", () => {

  describe("firstName", () => {
    it("returns error when empty", () => {
      const errors = validate({ firstName: "" });
      expect(errors.firstName).toBe("First name is required");
    });

    it("returns error when whitespace only", () => {
      const errors = validate({ firstName: "   " });
      expect(errors.firstName).toBe("First name is required");
    });

    it("returns error when exceeds 30 characters", () => {
      const errors = validate({ firstName: "A".repeat(31) });
      expect(errors.firstName).toBe("First name must be 30 characters or less");
    });

    it("allows 1 character", () => {
      const errors = validate({ firstName: "A" });
      expect(errors.firstName).toBeUndefined();
    });

    it("allows exactly 30 characters", () => {
      const errors = validate({ firstName: "A".repeat(30) });
      expect(errors.firstName).toBeUndefined();
    });
  });


  describe("lastName", () => {
    it("returns error when empty", () => {
      const errors = validate({ lastName: "" });
      expect(errors.lastName).toBe("Last name is required");
    });

    it("returns error when whitespace only", () => {
      const errors = validate({ lastName: "   " });
      expect(errors.lastName).toBe("Last name is required");
    });

    it("returns error when exceeds 30 characters", () => {
      const errors = validate({ lastName: "B".repeat(31) });
      expect(errors.lastName).toBe("Last name must be 30 characters or less");
    });

    it("allows 1 character", () => {
      const errors = validate({ lastName: "B" });
      expect(errors.lastName).toBeUndefined();
    });

    it("allows exactly 30 characters", () => {
      const errors = validate({ lastName: "B".repeat(30) });
      expect(errors.lastName).toBeUndefined();
    });
  });


  describe("phone", () => {
    it("allows empty (optional field)", () => {
      const errors = validate({ phone: "" });
      expect(errors.phone).toBeUndefined();
    });

    it("returns error when less than 10 characters", () => {
      const errors = validate({ phone: "123456789" }); // 9 chars
      expect(errors.phone).toBe("Phone must be at least 10 characters");
    });

    it("returns error when exceeds 16 characters", () => {
      const errors = validate({ phone: "1".repeat(17) });
      expect(errors.phone).toBe("Phone must be 16 characters or less");
    });

    it("allows exactly 10 characters (minimum)", () => {
      const errors = validate({ phone: "1234567890" });
      expect(errors.phone).toBeUndefined();
    });

    it("allows exactly 16 characters (maximum)", () => {
      const errors = validate({ phone: "1".repeat(16) });
      expect(errors.phone).toBeUndefined();
    });
  });


  describe("address", () => {
    it("allows empty (optional field)", () => {
      const errors = validate({ address: "" });
      expect(errors.address).toBeUndefined();
    });

    it("allows 1 character", () => {
      const errors = validate({ address: "A" });
      expect(errors.address).toBeUndefined();
    });

    it("allows exactly 200 characters", () => {
      const errors = validate({ address: "A".repeat(200) });
      expect(errors.address).toBeUndefined();
    });

    it("returns error when exceeds 200 characters", () => {
      const errors = validate({ address: "A".repeat(201) });
      expect(errors.address).toBe("Address must be 200 characters or less");
    });
  });


  describe("city", () => {
    it("allows empty (optional field)", () => {
      const errors = validate({ city: "" });
      expect(errors.city).toBeUndefined();
    });

    it("allows 1 character", () => {
      const errors = validate({ city: "C" });
      expect(errors.city).toBeUndefined();
    });

    it("allows exactly 50 characters", () => {
      const errors = validate({ city: "C".repeat(50) });
      expect(errors.city).toBeUndefined();
    });

    it("returns error when exceeds 50 characters", () => {
      const errors = validate({ city: "C".repeat(51) });
      expect(errors.city).toBe("City must be 50 characters or less");
    });
  });


  describe("state", () => {
    it("allows empty (optional field)", () => {
      const errors = validate({ state: "" });
      expect(errors.state).toBeUndefined();
    });

    it("returns error when 1 character (below minimum)", () => {
      const errors = validate({ state: "S" });
      expect(errors.state).toBe("State must be at least 2 characters");
    });

    it("allows exactly 2 characters (minimum)", () => {
      const errors = validate({ state: "IN" });
      expect(errors.state).toBeUndefined();
    });

    it("allows exactly 30 characters (maximum)", () => {
      const errors = validate({ state: "S".repeat(30) });
      expect(errors.state).toBeUndefined();
    });

    it("returns error when exceeds 30 characters", () => {
      const errors = validate({ state: "S".repeat(31) });
      expect(errors.state).toBe("State must be 30 characters or less");
    });
  });


  describe("zipCode", () => {
    it("allows empty (optional field)", () => {
      const errors = validate({ zipCode: "" });
      expect(errors.zipCode).toBeUndefined();
    });

    it("returns error when 4 characters", () => {
      const errors = validate({ zipCode: "1234" });
      expect(errors.zipCode).toBe("ZIP code must be 5 characters");
    });

    it("returns error when 6 characters", () => {
      const errors = validate({ zipCode: "123456" });
      expect(errors.zipCode).toBe("ZIP code must be 5 characters");
    });

    it("allows exactly 5 characters", () => {
      const errors = validate({ zipCode: "12345" });
      expect(errors.zipCode).toBeUndefined();
    });
  });


  describe("isProfileFormValid", () => {
    it("returns true for valid data", () => {
      expect(isProfileFormValid(validData)).toBe(true);
    });

    it("returns false when firstName is empty", () => {
      expect(isProfileFormValid({ ...validData, firstName: "" })).toBe(false);
    });

    it("returns false when lastName is empty", () => {
      expect(isProfileFormValid({ ...validData, lastName: "" })).toBe(false);
    });

    it("returns false with multiple invalid fields", () => {
      expect(
        isProfileFormValid({ ...validData, firstName: "", lastName: "" })
      ).toBe(false);
    });

    it("returns true with empty optional fields", () => {
      expect(
        isProfileFormValid({
          ...validData,
          phone: "",
          address: "",
          city: "",
          state: "",
          zipCode: "",
        })
      ).toBe(true);
    });
  });
});

