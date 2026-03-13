import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import EditAgencyPage from "@/app/agencies/[id]/edit/page";

const mockRouterPush = jest.fn();
const mockRouterBack = jest.fn();

jest.mock("next/navigation", () => ({
  useParams: () => ({ id: "1" }),
  useRouter: () => ({
    push: mockRouterPush,
    back: mockRouterBack,
  }),
}));

const mockUpdateVendor = jest.fn();

const mockUseVendor = jest.fn();
const mockUseUpdateVendorMutation = jest.fn();
const mockUseServices = jest.fn();
const mockUseFundingSources = jest.fn();
const mockUseCounties = jest.fn();

jest.mock("@/features/vendors", () => ({
  useVendor: () => mockUseVendor(),
  useUpdateVendorMutation: () => mockUseUpdateVendorMutation(),
  useServices: () => mockUseServices(),
  useFundingSources: () => mockUseFundingSources(),
  useCounties: () => mockUseCounties(),
}));

const defaultVendor = {
  id: 1,
  display_name: "Test Agency",
  legal_name: "Test Agency LLC",
  primary_county: "Marion",
  description: "A test agency description",
  contact_phone: "555-123-4567",
  contact_email: "contact@testagency.com",
  website: "https://testagency.com",
  languages: ["English", "Spanish"],
  services: [{ id: 1, name: "Nursing Care" }],
  funding_sources: [{ id: 1, name: "Medicaid" }],
  counties: [{ id: 1, name: "Marion" }],
  availability: "MTWRF: 09:00-17:00",
  image: "",
  verified: true,
  is_favorite: false,
  vendor_type: "Agency",
  dba: "",
  rating: 4.5,
  review_count: 10,
  claim_status: null,
  claimed_by: null,
};

const defaultCounties = [
  { id: 1, name: "Marion" },
  { id: 2, name: "Lake" },
  { id: 3, name: "Allen" },
  { id: 4, name: "Hamilton" },
  { id: 5, name: "St. Joseph" },
];

const defaultServices = [
  { id: 1, name: "Nursing Care" },
  { id: 2, name: "Physical Therapy" },
  { id: 3, name: "Meal Delivery" },
  { id: 4, name: "Transportation" },
];

const defaultFundingSources = [
  { id: 1, name: "Medicaid" },
  { id: 2, name: "Medicare" },
  { id: 3, name: "Private Pay" },
  { id: 4, name: "Insurance" },
];

interface MockOverrides {
  vendor?: Partial<typeof defaultVendor> | null;
  isLoading?: boolean;
  isError?: boolean;
}

const setupDefaultMocks = (overrides: MockOverrides = {}) => {
  const vendor = overrides.vendor === null
    ? null
    : { ...defaultVendor, ...overrides.vendor };

  mockUseVendor.mockReturnValue({
    vendor,
    isLoading: overrides.isLoading ?? false,
    isError: overrides.isError ?? false,
  });

  mockUseUpdateVendorMutation.mockReturnValue({
    updateVendor: mockUpdateVendor,
    isLoading: false,
  });

  mockUseServices.mockReturnValue({
    services: defaultServices,
    isLoading: false,
  });

  mockUseFundingSources.mockReturnValue({
    fundingSources: defaultFundingSources,
    isLoading: false,
  });

  mockUseCounties.mockReturnValue({
    counties: defaultCounties,
    isLoading: false,
  });
};


const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const renderPage = () => {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <EditAgencyPage />
    </QueryClientProvider>
  );
};

const clickSaveButton = () => {
  const saveButton = screen.getByRole("button", { name: /Save Changes/i });
  fireEvent.click(saveButton);
};

const clickCancelButton = () => {
  const cancelButton = screen.getByRole("button", { name: /Cancel/i });
  fireEvent.click(cancelButton);
};


describe("Edit Agency Page - Component Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupDefaultMocks();
  });


  describe("Page Loading", () => {
    it("renders the page with existing vendor data", () => {
      renderPage();
      expect(screen.getByDisplayValue("Test Agency")).toBeInTheDocument();
      expect(screen.getByDisplayValue("contact@testagency.com")).toBeInTheDocument();
    });

    it("displays the page title", () => {
      renderPage();
      expect(screen.getByText("Edit Agency Profile")).toBeInTheDocument();
    });

    it("pre-populates all form fields from vendor data", () => {
      renderPage();
      expect(screen.getByDisplayValue("Test Agency")).toBeInTheDocument();
      expect(screen.getByDisplayValue("A test agency description")).toBeInTheDocument();
      expect(screen.getByDisplayValue("555-123-4567")).toBeInTheDocument();
      expect(screen.getByDisplayValue("contact@testagency.com")).toBeInTheDocument();
      expect(screen.getByDisplayValue("https://testagency.com")).toBeInTheDocument();
    });
  });

  describe("Loading and Error States", () => {
    it("shows loading indicator when vendor data is loading", () => {
      setupDefaultMocks({ isLoading: true, vendor: null });
      renderPage();
      

      expect(screen.getByRole("progressbar") || screen.getByText(/loading/i)).toBeTruthy();
    });

    it("does not show form when vendor is loading", () => {
      setupDefaultMocks({ isLoading: true, vendor: null });
      renderPage();
      

      expect(screen.queryByDisplayValue("Test Agency")).not.toBeInTheDocument();
    });

    it("handles null vendor gracefully", () => {
      setupDefaultMocks({ vendor: null });
      renderPage();
      

      expect(screen.queryByDisplayValue("Test Agency")).not.toBeInTheDocument();
    });
  });

  describe("Form Actions", () => {
    it("calls updateVendor when Save is clicked with valid data", async () => {
      renderPage();
      clickSaveButton();

      await waitFor(() => {
        expect(mockUpdateVendor).toHaveBeenCalledTimes(1);
      });
    });

    it("navigates back when Cancel is clicked", () => {
      renderPage();
      clickCancelButton();
      expect(mockRouterBack).toHaveBeenCalled();
    });

    it("navigates to agency page on successful save", async () => {
      mockUpdateVendor.mockImplementation((data, options) => {
        options.onSuccess();
      });

      renderPage();
      clickSaveButton();

      await waitFor(() => {
        expect(mockRouterPush).toHaveBeenCalledWith("/agencies/1");
      });
    });
  });


  describe("Primary County Selection", () => {
    it("displays current primary county", () => {
      renderPage();

      expect(screen.getByDisplayValue("Marion")).toBeInTheDocument();
    });

    it("can change primary county selection", async () => {
      const user = userEvent.setup();
      renderPage();


      const primaryCountyInput = screen.getByLabelText(/Primary County/i);
      await user.clear(primaryCountyInput);
      await user.type(primaryCountyInput, "Lake");


      const option = await screen.findByText("Lake");
      await user.click(option);

      clickSaveButton();

      await waitFor(() => {
        expect(mockUpdateVendor).toHaveBeenCalledWith(
          expect.objectContaining({ primary_county: "Lake" }),
          expect.anything()
        );
      });
    });

    it("can clear primary county selection", async () => {
      const user = userEvent.setup();
      renderPage();

      const primaryCountyInput = screen.getByLabelText(/Primary County/i);
      await user.clear(primaryCountyInput);

      clickSaveButton();

      await waitFor(() => {
        expect(mockUpdateVendor).toHaveBeenCalledWith(
          expect.objectContaining({ primary_county: "" }),
          expect.anything()
        );
      });
    });
  });


  describe("Additional Counties Selection", () => {
    it("displays existing counties as chips", () => {
      renderPage();

      const additionalCountiesSection = screen.getByLabelText(/Additional Counties Served/i);
      expect(additionalCountiesSection).toBeInTheDocument();
    });

    it("can add additional county", async () => {
      const user = userEvent.setup();
      renderPage();

      const additionalCountiesInput = screen.getByLabelText(/Additional Counties Served/i);
      await user.click(additionalCountiesInput);
      await user.type(additionalCountiesInput, "Lake");

      const option = await screen.findByRole("option", { name: /Lake/i });
      await user.click(option);

      clickSaveButton();

      await waitFor(() => {
        expect(mockUpdateVendor).toHaveBeenCalledWith(
          expect.objectContaining({
            counties: expect.arrayContaining([1, 2]), 
          }),
          expect.anything()
        );
      });
    });

    it("sends empty array when no counties selected", async () => {
      setupDefaultMocks({ vendor: { counties: [] } });

      renderPage();
      clickSaveButton();

      await waitFor(() => {
        expect(mockUpdateVendor).toHaveBeenCalledWith(
          expect.objectContaining({
            counties: [],
          }),
          expect.anything()
        );
      });
    });
  });

  describe("Languages Selection", () => {
    it("displays existing languages as chips", () => {
      renderPage();
      expect(screen.getByText("English")).toBeInTheDocument();
      expect(screen.getByText("Spanish")).toBeInTheDocument();
    });

    it("can add a language", async () => {
      const user = userEvent.setup();
      renderPage();

      const languagesInput = screen.getByLabelText(/Languages Spoken/i);
      await user.click(languagesInput);
      await user.type(languagesInput, "French");

      const option = await screen.findByRole("option", { name: /French/i });
      await user.click(option);

      clickSaveButton();

      await waitFor(() => {
        expect(mockUpdateVendor).toHaveBeenCalledWith(
          expect.objectContaining({
            languages: expect.arrayContaining(["English", "Spanish", "French"]),
          }),
          expect.anything()
        );
      });
    });

    it("can remove a language by clicking chip delete", async () => {
      const user = userEvent.setup();
      renderPage();

      const spanishChip = screen.getByText("Spanish").closest(".MuiChip-root") as HTMLElement;
      const deleteButton = within(spanishChip!).getByTestId("CancelIcon");
      await user.click(deleteButton);

      clickSaveButton();

      await waitFor(() => {
        expect(mockUpdateVendor).toHaveBeenCalledWith(
          expect.objectContaining({
            languages: ["English"], 
          }),
          expect.anything()
        );
      });
    });

    it("sends empty array when no languages selected", async () => {
      const user = userEvent.setup();
      renderPage();

      const englishChip = screen.getByText("English").closest(".MuiChip-root") as HTMLElement;
      await user.click(within(englishChip).getByTestId("CancelIcon"));

      const spanishChip = screen.getByText("Spanish").closest(".MuiChip-root") as HTMLElement;
      await user.click(within(spanishChip).getByTestId("CancelIcon"));

      clickSaveButton();

      await waitFor(() => {
        expect(mockUpdateVendor).toHaveBeenCalledWith(
          expect.objectContaining({
            languages: [],
          }),
          expect.anything()
        );
      });
    });
  });

  describe("Services Selection", () => {
    it("displays count of selected services", () => {
      renderPage();
      expect(screen.getByText(/1 service selected/i)).toBeInTheDocument();
    });

    it("opens services modal when button clicked", async () => {
      const user = userEvent.setup();
      renderPage();

      const servicesButton = screen.getByRole("button", { name: /1 service selected/i });
      await user.click(servicesButton);

      expect(screen.getByText("Select Services Provided")).toBeInTheDocument();
    });

    it("can select additional service in modal", async () => {
      const user = userEvent.setup();
      renderPage();

      const servicesButton = screen.getByRole("button", { name: /1 service selected/i });
      await user.click(servicesButton);

      const physicalTherapyLabel = screen.getByText("Physical Therapy");
      const physicalTherapyCheckbox = within(
        physicalTherapyLabel.closest(".MuiAccordionSummary-root") as HTMLElement
      ).getByRole("checkbox");
      await user.click(physicalTherapyCheckbox);

      const applyButton = screen.getByRole("button", { name: /Apply/i });
      await user.click(applyButton);

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });

      clickSaveButton();

      await waitFor(() => {
        expect(mockUpdateVendor).toHaveBeenCalledWith(
          expect.objectContaining({
            services: expect.arrayContaining([1, 2]), 
          }),
          expect.anything()
        );
      });
    });

    it("can clear all services", async () => {
      const user = userEvent.setup();
      renderPage();

      const servicesButton = screen.getByRole("button", { name: /1 service selected/i });
      await user.click(servicesButton);

      const clearButton = screen.getByRole("button", { name: /Clear All/i });
      await user.click(clearButton);

      const applyButton = screen.getByRole("button", { name: /Apply/i });
      await user.click(applyButton);

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });

      clickSaveButton();

      await waitFor(() => {
        expect(mockUpdateVendor).toHaveBeenCalledWith(
          expect.objectContaining({
            services: [],
          }),
          expect.anything()
        );
      });
    });

    it("shows selected services as chips outside modal", () => {
      renderPage();
      expect(screen.getByText("Nursing Care")).toBeInTheDocument();
    });

    it("can remove service by clicking chip delete", async () => {
      const user = userEvent.setup();
      renderPage();

      const nursingChip = screen.getByText("Nursing Care").closest(".MuiChip-root") as HTMLElement;
      const deleteButton = within(nursingChip!).getByTestId("CancelIcon");
      await user.click(deleteButton);

      clickSaveButton();

      await waitFor(() => {
        expect(mockUpdateVendor).toHaveBeenCalledWith(
          expect.objectContaining({
            services: [],
          }),
          expect.anything()
        );
      });
    });
  });

  describe("Funding Sources Selection", () => {
    it("displays count of selected funding sources", () => {
      renderPage();
      expect(screen.getByText(/1 source selected/i)).toBeInTheDocument();
    });

    it("opens funding sources dropdown when button clicked", async () => {
      const user = userEvent.setup();
      renderPage();

      const fundingButton = screen.getByRole("button", { name: /1 source selected/i });
      await user.click(fundingButton);

      expect(screen.getByRole("menuitem", { name: /Medicare/i })).toBeInTheDocument();
    });

    it("can select additional funding source", async () => {
      const user = userEvent.setup();
      renderPage();

      const fundingButton = screen.getByRole("button", { name: /1 source selected/i });
      await user.click(fundingButton);

      const medicareOption = screen.getByRole("menuitem", { name: /Medicare/i });
      await user.click(medicareOption);

      await user.keyboard("{Escape}");

      clickSaveButton();

      await waitFor(() => {
        expect(mockUpdateVendor).toHaveBeenCalledWith(
          expect.objectContaining({
            funding_sources: expect.arrayContaining([1, 2]), 
          }),
          expect.anything()
        );
      });
    });

    it("shows selected funding sources as chips", () => {
      renderPage();
      expect(screen.getByText("Medicaid")).toBeInTheDocument();
    });

    it("can remove funding source by clicking chip delete", async () => {
      const user = userEvent.setup();
      renderPage();

      const medicaidChip = screen.getByText("Medicaid").closest(".MuiChip-root") as HTMLElement;
      const deleteButton = within(medicaidChip!).getByTestId("CancelIcon");
      await user.click(deleteButton);

      clickSaveButton();

      await waitFor(() => {
        expect(mockUpdateVendor).toHaveBeenCalledWith(
          expect.objectContaining({
            funding_sources: [],
          }),
          expect.anything()
        );
      });
    });
  });


  describe("Logo Upload", () => {
    it("displays upload button when no logo exists", () => {
      renderPage();
      expect(screen.getByRole("button", { name: /Upload Logo/i })).toBeInTheDocument();
    });

    it("displays change button when logo exists", () => {
      setupDefaultMocks({ vendor: { image: "data:image/png;base64,abc123" } });

      renderPage();
      expect(screen.getByRole("button", { name: /Change Logo/i })).toBeInTheDocument();
    });

    it("shows accepted file formats in helper text", () => {
      renderPage();
      expect(screen.getByText(/Accepted formats: JPG, PNG, GIF/i)).toBeInTheDocument();
    });

    it("shows max file size in helper text", () => {
      renderPage();
      expect(screen.getByText(/Max size: 5MB/i)).toBeInTheDocument();
    });
  });

  describe("Availability Schedule", () => {
    describe("Day Selection", () => {
      it("displays day chips for selection", () => {
        renderPage();
        expect(screen.getByText("M")).toBeInTheDocument();
        expect(screen.getByText("T")).toBeInTheDocument();
        expect(screen.getByText("W")).toBeInTheDocument();
        expect(screen.getByText("R")).toBeInTheDocument();
        expect(screen.getByText("F")).toBeInTheDocument();
        expect(screen.getByText("S")).toBeInTheDocument();
        expect(screen.getByText("U")).toBeInTheDocument();
      });

      it("can toggle a day on", async () => {
        const user = userEvent.setup();
        renderPage();

        const saturdayChip = screen.getAllByText("S")[0];
        await user.click(saturdayChip);

        clickSaveButton();

        await waitFor(() => {
          expect(mockUpdateVendor).toHaveBeenCalledWith(
            expect.objectContaining({
              availability: expect.stringContaining("S"),
            }),
            expect.anything()
          );
        });
      });

      it("can toggle a day off", async () => {
        const user = userEvent.setup();
        renderPage();

        const mondayChip = screen.getByText("M");
        await user.click(mondayChip);

        clickSaveButton();

        await waitFor(() => {
          expect(mockUpdateVendor).toHaveBeenCalledWith(
            expect.objectContaining({
              availability: expect.not.stringMatching(/^M/),
            }),
            expect.anything()
          );
        });
      });

      it("shows selected days summary", () => {
        renderPage();
        expect(screen.getByText(/Mon.*Tue.*Wed.*Thu.*Fri/i)).toBeInTheDocument();
      });
    });

    describe("Time Selection", () => {
      it("displays start and end time inputs", () => {
        renderPage();
        const timeInputs = screen.getAllByDisplayValue(/09:00|17:00/);
        expect(timeInputs.length).toBeGreaterThanOrEqual(2);
      });

      it("can change start time", async () => {
        const user = userEvent.setup();
        renderPage();

        const startTimeInput = screen.getByDisplayValue("09:00");
        await user.clear(startTimeInput);
        await user.type(startTimeInput, "08:00");

        clickSaveButton();

        await waitFor(() => {
          expect(mockUpdateVendor).toHaveBeenCalledWith(
            expect.objectContaining({
              availability: expect.stringContaining("08:00"),
            }),
            expect.anything()
          );
        });
      });

      it("can change end time", async () => {
        const user = userEvent.setup();
        renderPage();

        const endTimeInput = screen.getByDisplayValue("17:00");
        await user.clear(endTimeInput);
        await user.type(endTimeInput, "18:00");

        clickSaveButton();

        await waitFor(() => {
          expect(mockUpdateVendor).toHaveBeenCalledWith(
            expect.objectContaining({
              availability: expect.stringContaining("18:00"),
            }),
            expect.anything()
          );
        });
      });
    });

    describe("24 Hours Toggle", () => {
      it("displays 24 Hours button", () => {
        renderPage();
        expect(screen.getByRole("button", { name: /24 Hours/i })).toBeInTheDocument();
      });

      it("enables 24 hours mode when clicked", async () => {
        const user = userEvent.setup();
        renderPage();

        const twentyFourButton = screen.getByRole("button", { name: /24 Hours/i });
        await user.click(twentyFourButton);

        expect(screen.getByText(/Available 24 Hours/i)).toBeInTheDocument();
      });

      it("sends 24 hours in availability when enabled", async () => {
        const user = userEvent.setup();
        renderPage();

        const twentyFourButton = screen.getByRole("button", { name: /24 Hours/i });
        await user.click(twentyFourButton);

        clickSaveButton();

        await waitFor(() => {
          expect(mockUpdateVendor).toHaveBeenCalledWith(
            expect.objectContaining({
              availability: expect.stringContaining("24 hours"),
            }),
            expect.anything()
          );
        });
      });
    });

    describe("Multiple Time Slots", () => {
      it("displays Add Time Slot button", () => {
        renderPage();
        expect(screen.getByRole("button", { name: /Add Time Slot/i })).toBeInTheDocument();
      });

      it("can add a second time slot", async () => {
        const user = userEvent.setup();
        renderPage();

        const addButton = screen.getByRole("button", { name: /Add Time Slot/i });
        await user.click(addButton);

        expect(screen.getByText("Time Slot 1")).toBeInTheDocument();
        expect(screen.getByText("Time Slot 2")).toBeInTheDocument();
      });

      it("can remove a time slot (when more than one exists)", async () => {
        const user = userEvent.setup();
        renderPage();

        const addButton = screen.getByRole("button", { name: /Add Time Slot/i });
        await user.click(addButton);

        const deleteButtons = screen.getAllByTestId("DeleteIcon");
        await user.click(deleteButtons[deleteButtons.length - 1]);

        expect(screen.getByText("Time Slot 1")).toBeInTheDocument();
        expect(screen.queryByText("Time Slot 2")).not.toBeInTheDocument();
      });

      it("cannot remove the only time slot", () => {
        renderPage();
        const timeSlotSection = screen.getByText("Time Slot 1").closest("div");
        expect(timeSlotSection).toBeInTheDocument();
        const deleteIconInSlot = within(timeSlotSection!).queryByTestId("DeleteIcon");
        expect(deleteIconInSlot).not.toBeInTheDocument();
      });
    });

    describe("Availability Preview", () => {
      it("shows formatted availability preview", () => {
        renderPage();
        expect(screen.getByText(/Schedule Preview:/i)).toBeInTheDocument();
        expect(screen.getByText(/MTWRF: 09:00-17:00/)).toBeInTheDocument();
      });
    });
  });

  describe("Validation Errors", () => {
    it("shows error when display name is empty", async () => {
      const user = userEvent.setup();
      renderPage();

      const nameInput = screen.getByDisplayValue("Test Agency");
      await user.clear(nameInput);

      clickSaveButton();

      await waitFor(() => {
        expect(screen.getByText(/Display name is required/i)).toBeInTheDocument();
      });
    });

    it("shows error snackbar when validation fails", async () => {
      const user = userEvent.setup();
      renderPage();

      const nameInput = screen.getByDisplayValue("Test Agency");
      await user.clear(nameInput);

      clickSaveButton();

      await waitFor(() => {
        expect(screen.getByText(/Please fix the errors before saving/i)).toBeInTheDocument();
      });
    });

    it("does not call updateVendor when validation fails", async () => {
      const user = userEvent.setup();
      renderPage();

      const nameInput = screen.getByDisplayValue("Test Agency");
      await user.clear(nameInput);

      clickSaveButton();

      await waitFor(() => {
        expect(screen.getByText(/Display name is required/i)).toBeInTheDocument();
      });

      expect(mockUpdateVendor).not.toHaveBeenCalled();
    });

    it("shows character count for display name", () => {
      renderPage();
      expect(screen.getByText(/11\/255/)).toBeInTheDocument();
    });
  });

  describe("API Error Handling", () => {
    it("shows error snackbar when save fails", async () => {
      mockUpdateVendor.mockImplementation((data, options) => {
        options.onError({
          response: {
            data: {
              detail: "Server error occurred",
            },
          },
        });
      });

      renderPage();
      clickSaveButton();

      await waitFor(() => {
        expect(screen.getByText(/Server error occurred/i)).toBeInTheDocument();
      });
    });

    it("displays field-specific errors from server", async () => {
      mockUpdateVendor.mockImplementation((data, options) => {
        options.onError({
          response: {
            data: {
              primary_county: ["Invalid county selected"],
            },
          },
        });
      });

      renderPage();
      clickSaveButton();

      await waitFor(() => {
        expect(screen.getByText(/primary county.*Invalid county/i)).toBeInTheDocument();
      });
    });
  });
});

describe("Edit Agency Page - BVA Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupDefaultMocks();
  });

  describe("Selection Count Boundaries", () => {
    describe("Services Selection Count", () => {
      it("0 services - shows 'Select services' placeholder", async () => {
        const user = userEvent.setup();
        renderPage();

        const nursingChip = screen.getByText("Nursing Care").closest(".MuiChip-root") as HTMLElement;
        const deleteButton = within(nursingChip!).getByTestId("CancelIcon");
        await user.click(deleteButton);

        expect(screen.getByText(/Select services/i)).toBeInTheDocument();
      });

      it("1 service - shows '1 service selected'", () => {
        renderPage();
        expect(screen.getByText(/1 service selected/i)).toBeInTheDocument();
      });

      it("multiple services - shows count pluralized", async () => {
        const user = userEvent.setup();
        renderPage();

        const servicesButton = screen.getByRole("button", { name: /1 service selected/i });
        await user.click(servicesButton);

        const physicalTherapyLabel = screen.getByText("Physical Therapy");
        const physicalTherapyCheckbox = within(
          physicalTherapyLabel.closest(".MuiAccordionSummary-root") as HTMLElement
        ).getByRole("checkbox");
        await user.click(physicalTherapyCheckbox);

        const applyButton = screen.getByRole("button", { name: /Apply/i });
        await user.click(applyButton);

        expect(screen.getByText(/2 services selected/i)).toBeInTheDocument();
      });

      it("all services - can select all available", async () => {
        const user = userEvent.setup();
        renderPage();

        const servicesButton = screen.getByRole("button", { name: /1 service selected/i });
        await user.click(servicesButton);

        const servicesToSelect = ["Physical Therapy", "Meal Delivery", "Transportation"];
        for (const serviceName of servicesToSelect) {
          const label = screen.getByText(serviceName);
          const checkbox = within(
            label.closest(".MuiAccordionSummary-root") as HTMLElement
          ).getByRole("checkbox");
          await user.click(checkbox);
        }

        const applyButton = screen.getByRole("button", { name: /Apply/i });
        await user.click(applyButton);

        expect(screen.getByText(/4 services selected/i)).toBeInTheDocument();
      });
    });

    describe("Funding Sources Selection Count", () => {
      it("0 sources - shows 'Select funding sources' placeholder", async () => {
        const user = userEvent.setup();
        renderPage();

        const medicaidChip = screen.getByText("Medicaid").closest(".MuiChip-root") as HTMLElement;
        const deleteButton = within(medicaidChip!).getByTestId("CancelIcon");
        await user.click(deleteButton);

        expect(screen.getByText(/Select funding sources/i)).toBeInTheDocument();
      });

      it("1 source - shows '1 source selected'", () => {
        renderPage();
        expect(screen.getByText(/1 source selected/i)).toBeInTheDocument();
      });

      it("multiple sources - shows count pluralized", async () => {
        const user = userEvent.setup();
        renderPage();

        const fundingButton = screen.getByRole("button", { name: /1 source selected/i });
        await user.click(fundingButton);

        const medicareOption = screen.getByRole("menuitem", { name: /Medicare/i });
        await user.click(medicareOption);

        expect(screen.getByText(/2 sources selected/i)).toBeInTheDocument();
      });
    });

    describe("Languages Selection Count", () => {
      it("0 languages - field is empty", async () => {
        const user = userEvent.setup();
        renderPage();

        const englishChip = screen.getByText("English").closest(".MuiChip-root") as HTMLElement;
        await user.click(within(englishChip).getByTestId("CancelIcon"));

        const spanishChip = screen.getByText("Spanish").closest(".MuiChip-root") as HTMLElement;
        await user.click(within(spanishChip).getByTestId("CancelIcon"));

        expect(screen.queryByText("English")).not.toBeInTheDocument();
        expect(screen.queryByText("Spanish")).not.toBeInTheDocument();
      });

      it("1 language - shows single chip", async () => {
        const user = userEvent.setup();
        renderPage();

        const spanishChip = screen.getByText("Spanish").closest(".MuiChip-root") as HTMLElement;
        const deleteButton = within(spanishChip!).getByTestId("CancelIcon");
        await user.click(deleteButton);

        expect(screen.getByText("English")).toBeInTheDocument();
        expect(screen.queryByText("Spanish")).not.toBeInTheDocument();
      });

      it("2 languages - shows two chips", () => {
        renderPage();
        expect(screen.getByText("English")).toBeInTheDocument();
        expect(screen.getByText("Spanish")).toBeInTheDocument();
      });
    });
  });

  describe("Time Slot Boundaries", () => {
    it("1 time slot - delete button not shown", () => {
      renderPage();
      const timeSlotSection = screen.getByText("Time Slot 1").closest("div");
      expect(timeSlotSection).toBeInTheDocument();
      const deleteIconInSlot = within(timeSlotSection!).queryByTestId("DeleteIcon");
      expect(deleteIconInSlot).not.toBeInTheDocument();
    });

    it("2 time slots - both have delete buttons", async () => {
      const user = userEvent.setup();
      renderPage();

      const addButton = screen.getByRole("button", { name: /Add Time Slot/i });
      await user.click(addButton);

      const deleteIcons = screen.getAllByTestId("DeleteIcon");
      expect(deleteIcons.length).toBeGreaterThanOrEqual(2);
    });

    it("adding time slot increases slot count", async () => {
      const user = userEvent.setup();
      renderPage();

      expect(screen.getByText("Time Slot 1")).toBeInTheDocument();
      expect(screen.queryByText("Time Slot 2")).not.toBeInTheDocument();

      const addButton = screen.getByRole("button", { name: /Add Time Slot/i });
      await user.click(addButton);

      expect(screen.getByText("Time Slot 1")).toBeInTheDocument();
      expect(screen.getByText("Time Slot 2")).toBeInTheDocument();
    });

    it("removing time slot decreases slot count", async () => {
      const user = userEvent.setup();
      renderPage();

      const addButton = screen.getByRole("button", { name: /Add Time Slot/i });
      await user.click(addButton);
      await user.click(addButton);

      expect(screen.getByText("Time Slot 3")).toBeInTheDocument();

      const deleteIcons = screen.getAllByTestId("DeleteIcon");
      await user.click(deleteIcons[deleteIcons.length - 1]);

      expect(screen.queryByText("Time Slot 3")).not.toBeInTheDocument();
    });
  });

  describe("Day Selection Boundaries", () => {
    it("0 days selected - no days summary shown", async () => {
      const user = userEvent.setup();
      renderPage();

      const days = ["M", "T", "W", "R", "F"];
      for (const day of days) {
        const chip = screen.getByText(day);
        await user.click(chip);
      }

      expect(screen.queryByText(/Mon.*Tue.*Wed.*Thu.*Fri/i)).not.toBeInTheDocument();
    });

    it("1 day selected - shows single day", async () => {
      const user = userEvent.setup();
      renderPage();

      const daysToRemove = ["T", "W", "R", "F"];
      for (const day of daysToRemove) {
        const chip = screen.getByText(day);
        await user.click(chip);
      }

      expect(screen.getByText("Mon")).toBeInTheDocument();
    });

    it("all 7 days selected - shows all days", async () => {
      const user = userEvent.setup();
      renderPage();

      const saturday = screen.getAllByText("S")[0];
      const sunday = screen.getByText("U");
      await user.click(saturday);
      await user.click(sunday);

      clickSaveButton();

      await waitFor(() => {
        expect(mockUpdateVendor).toHaveBeenCalledWith(
          expect.objectContaining({
            availability: expect.stringMatching(/MTWRFSU/i),
          }),
          expect.anything()
        );
      });
    });
  });
});

