import React from "react";
import { render, fireEvent } from "@testing-library/react";
import { SearchFilters } from "@/components/SearchFilters/SearchFiltersMaster";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
  })),
  useSearchParams: jest.fn(() => ({
    get: jest.fn(() => null),
  })),
}));

describe("SearchFilters: Combined Filters", () => {
  it("Test No Filters", () => {
    const mockOnSearch = jest.fn();

    const { getByRole } = render(
      React.createElement(
        React.Suspense,
        { fallback: React.createElement("div", null, "Loading...") },
        React.createElement(SearchFilters, { onSearch: mockOnSearch }),
      ),
    );

    const searchButton = getByRole("button", { name: /Search Providers/i });
    fireEvent.click(searchButton);

    expect(mockOnSearch).toHaveBeenCalledWith({
      agencyName: "",
      zipCode: "",
      services: [],
      minRating: "",
      languages: [],
      fundingSources: [],
    });
  });
});

describe("SearchFilters: agencyName Filter", () => {
  it("Test singular agency name filter", () => {
    const mockOnSearch = jest.fn();

    const { getByRole, getByPlaceholderText } = render(
      React.createElement(
        React.Suspense,
        { fallback: React.createElement("div", null, "Loading...") },
        React.createElement(SearchFilters, { onSearch: mockOnSearch }),
      ),
    );

    const agencyInput = getByPlaceholderText("Search by provider name...");
    fireEvent.change(agencyInput, { target: { value: "Agency Name" } });

    const searchButton = getByRole("button", { name: /Search Providers/i });
    fireEvent.click(searchButton);

    expect(mockOnSearch).toHaveBeenCalledWith({
      agencyName: "Agency Name",
      zipCode: "",
      services: [],
      minRating: "",
      languages: [],
      fundingSources: [],
    });
  });
  it("Test singular agency name filter with special characters", () => {
    const mockOnSearch = jest.fn();

    const { getByRole, getByPlaceholderText } = render(
      React.createElement(
        React.Suspense,
        { fallback: React.createElement("div", null, "Loading...") },
        React.createElement(SearchFilters, { onSearch: mockOnSearch }),
      ),
    );

    const agencyInput = getByPlaceholderText("Search by provider name...");
    fireEvent.change(agencyInput, { target: { value: "Agency 12345 !@$$%" } });

    const searchButton = getByRole("button", { name: /Search Providers/i });
    fireEvent.click(searchButton);

    expect(mockOnSearch).toHaveBeenCalledWith({
      agencyName: "Agency 12345 !@$$%",
      zipCode: "",
      services: [],
      minRating: "",
      languages: [],
      fundingSources: [],
    });
  });
  it("Test singular agency name max length", () => {
    const mockOnSearch = jest.fn();

    const { getByRole, getByPlaceholderText } = render(
      React.createElement(
        React.Suspense,
        { fallback: React.createElement("div", null, "Loading...") },
        React.createElement(SearchFilters, { onSearch: mockOnSearch }),
      ),
    );

    const agencyInput = getByPlaceholderText("Search by provider name...");
    fireEvent.change(agencyInput, {
      target: {
        value:
          "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwx",
      },
    });

    const searchButton = getByRole("button", { name: /Search Providers/i });
    fireEvent.click(searchButton);

    expect(mockOnSearch).toHaveBeenCalledWith({
      agencyName:
        "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwx",
      zipCode: "",
      services: [],
      minRating: "",
      languages: [],
      fundingSources: [],
    });
  });
  it("Test singular agency name max length + 1", () => {
    const mockOnSearch = jest.fn();

    const { getByRole, getByPlaceholderText } = render(
      React.createElement(
        React.Suspense,
        { fallback: React.createElement("div", null, "Loading...") },
        React.createElement(SearchFilters, { onSearch: mockOnSearch }),
      ),
    );

    const agencyInput = getByPlaceholderText("Search by provider name...");
    fireEvent.change(agencyInput, {
      target: {
        value:
          "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxy",
      },
    });

    const searchButton = getByRole("button", { name: /Search Providers/i });
    fireEvent.click(searchButton);

    expect(mockOnSearch).toHaveBeenCalledWith({
      agencyName:
        "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwx",
      zipCode: "",
      services: [],
      minRating: "",
      languages: [],
      fundingSources: [],
    });
  });
  it("Test singular agency name undefined value", () => {
    const mockOnSearch = jest.fn();

    const { getByRole, getByPlaceholderText } = render(
      React.createElement(
        React.Suspense,
        { fallback: React.createElement("div", null, "Loading...") },
        React.createElement(SearchFilters, { onSearch: mockOnSearch }),
      ),
    );

    const agencyInput = getByPlaceholderText("Search by provider name...");
    fireEvent.change(agencyInput, { target: { value: undefined } });

    const searchButton = getByRole("button", { name: /Search Providers/i });
    fireEvent.click(searchButton);

    expect(mockOnSearch).toHaveBeenCalledWith({
      agencyName: "",
      zipCode: "",
      services: [],
      minRating: "",
      languages: [],
      fundingSources: [],
    });
  });
  it("Test singular agency name null value", () => {
    const mockOnSearch = jest.fn();

    const { getByRole, getByPlaceholderText } = render(
      React.createElement(
        React.Suspense,
        { fallback: React.createElement("div", null, "Loading...") },
        React.createElement(SearchFilters, { onSearch: mockOnSearch }),
      ),
    );

    const agencyInput = getByPlaceholderText("Search by provider name...");
    fireEvent.change(agencyInput, { target: { value: null } });

    const searchButton = getByRole("button", { name: /Search Providers/i });
    fireEvent.click(searchButton);

    expect(mockOnSearch).toHaveBeenCalledWith({
      agencyName: "",
      zipCode: "",
      services: [],
      minRating: "",
      languages: [],
      fundingSources: [],
    });
  });

  describe("SearchFilters: ZIP Code Filters", () => {
    it("Test zip code filter 5 digits", () => {
      const mockOnSearch = jest.fn();

      const { getByRole, getByPlaceholderText } = render(
        React.createElement(
          React.Suspense,
          { fallback: React.createElement("div", null, "Loading...") },
          React.createElement(SearchFilters, { onSearch: mockOnSearch }),
        ),
      );

      const zipCodeInput = getByPlaceholderText("Enter ZIP");
      fireEvent.change(zipCodeInput, { target: { value: "12345" } });

      const searchButton = getByRole("button", { name: /Search Providers/i });
      fireEvent.click(searchButton);

      expect(mockOnSearch).toHaveBeenCalledWith({
        agencyName: "",
        zipCode: "12345",
        services: [],
        minRating: "",
        languages: [],
        fundingSources: [],
      });
    });
  });
  it("Test zip code filter 6 digits", () => {
    const mockOnSearch = jest.fn();

    const { getByRole, getByPlaceholderText } = render(
      React.createElement(
        React.Suspense,
        { fallback: React.createElement("div", null, "Loading...") },
        React.createElement(SearchFilters, { onSearch: mockOnSearch }),
      ),
    );

    const zipCodeInput = getByPlaceholderText("Enter ZIP");
    fireEvent.change(zipCodeInput, { target: { value: "123456" } });

    const searchButton = getByRole("button", { name: /Search Providers/i });
    fireEvent.click(searchButton);

    expect(mockOnSearch).toHaveBeenCalledWith({
      agencyName: "",
      zipCode: "12345",
      services: [],
      minRating: "",
      languages: [],
      fundingSources: [],
    });
  });
  it("Test zip code filter 4 digits", () => {
    const mockOnSearch = jest.fn();

    const { getByRole, getByPlaceholderText } = render(
      React.createElement(
        React.Suspense,
        { fallback: React.createElement("div", null, "Loading...") },
        React.createElement(SearchFilters, { onSearch: mockOnSearch }),
      ),
    );

    const zipCodeInput = getByPlaceholderText("Enter ZIP");
    fireEvent.change(zipCodeInput, { target: { value: "1234" } });

    const searchButton = getByRole("button", { name: /Search Providers/i });
    fireEvent.click(searchButton);

    expect(mockOnSearch).toHaveBeenCalledWith({
      agencyName: "",
      zipCode: "",
      services: [],
      minRating: "",
      languages: [],
      fundingSources: [],
    });
  });
  it("Test zip code filter special characters", () => {
    const mockOnSearch = jest.fn();

    const { getByRole, getByPlaceholderText } = render(
      React.createElement(
        React.Suspense,
        { fallback: React.createElement("div", null, "Loading...") },
        React.createElement(SearchFilters, { onSearch: mockOnSearch }),
      ),
    );

    const zipCodeInput = getByPlaceholderText("Enter ZIP");
    fireEvent.change(zipCodeInput, { target: { value: "!@#$%" } });

    const searchButton = getByRole("button", { name: /Search Providers/i });
    fireEvent.click(searchButton);

    expect(mockOnSearch).toHaveBeenCalledWith({
      agencyName: "",
      zipCode: "",
      services: [],
      minRating: "",
      languages: [],
      fundingSources: [],
    });
  });
  it("Test zip code filter chars", () => {
    const mockOnSearch = jest.fn();

    const { getByRole, getByPlaceholderText } = render(
      React.createElement(
        React.Suspense,
        { fallback: React.createElement("div", null, "Loading...") },
        React.createElement(SearchFilters, { onSearch: mockOnSearch }),
      ),
    );

    const zipCodeInput = getByPlaceholderText("Enter ZIP");
    fireEvent.change(zipCodeInput, { target: { value: "abcde" } });

    const searchButton = getByRole("button", { name: /Search Providers/i });
    fireEvent.click(searchButton);

    expect(mockOnSearch).toHaveBeenCalledWith({
      agencyName: "",
      zipCode: "",
      services: [],
      minRating: "",
      languages: [],
      fundingSources: [],
    });
  });
  it("Test zip code filter undefined value", () => {
    const mockOnSearch = jest.fn();

    const { getByRole, getByPlaceholderText } = render(
      React.createElement(
        React.Suspense,
        { fallback: React.createElement("div", null, "Loading...") },
        React.createElement(SearchFilters, { onSearch: mockOnSearch }),
      ),
    );

    const zipCodeInput = getByPlaceholderText("Enter ZIP");
    fireEvent.change(zipCodeInput, { target: { value: undefined } });

    const searchButton = getByRole("button", { name: /Search Providers/i });
    fireEvent.click(searchButton);

    expect(mockOnSearch).toHaveBeenCalledWith({
      agencyName: "",
      zipCode: "",
      services: [],
      minRating: "",
      languages: [],
      fundingSources: [],
    });
  });
  it("Test zip code filter null value", () => {
    const mockOnSearch = jest.fn();

    const { getByRole, getByPlaceholderText } = render(
      React.createElement(
        React.Suspense,
        { fallback: React.createElement("div", null, "Loading...") },
        React.createElement(SearchFilters, { onSearch: mockOnSearch }),
      ),
    );

    const zipCodeInput = getByPlaceholderText("Enter ZIP");
    fireEvent.change(zipCodeInput, { target: { value: null } });

    const searchButton = getByRole("button", { name: /Search Providers/i });
    fireEvent.click(searchButton);

    expect(mockOnSearch).toHaveBeenCalledWith({
      agencyName: "",
      zipCode: "",
      services: [],
      minRating: "",
      languages: [],
      fundingSources: [],
    });
  });
  it("Test zip code filter combined input", () => {
    const mockOnSearch = jest.fn();

    const { getByRole, getByPlaceholderText } = render(
      React.createElement(
        React.Suspense,
        { fallback: React.createElement("div", null, "Loading...") },
        React.createElement(SearchFilters, { onSearch: mockOnSearch }),
      ),
    );

    const zipCodeInput = getByPlaceholderText("Enter ZIP");
    fireEvent.change(zipCodeInput, { target: { value: "1234a" } });

    const searchButton = getByRole("button", { name: /Search Providers/i });
    fireEvent.click(searchButton);

    expect(mockOnSearch).toHaveBeenCalledWith({
      agencyName: "",
      zipCode: "",
      services: [],
      minRating: "",
      languages: [],
      fundingSources: [],
    });
  });
});
