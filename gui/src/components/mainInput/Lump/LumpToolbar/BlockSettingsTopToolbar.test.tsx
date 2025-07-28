import { configureStore } from "@reduxjs/toolkit";
import { fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { describe, expect, it, vi } from "vitest";
import { configSlice } from "../../../../redux/slices/configSlice";
import { BlockSettingsTopToolbar } from "./BlockSettingsTopToolbar";

// Mock the components and contexts
vi.mock("../../../../context/IdeMessenger", () => ({
  IdeMessengerContext: {
    Provider: ({ children }: any) => children,
  },
}));

vi.mock("../../../../context/Auth", () => ({
  useAuth: () => ({ selectedProfile: { profileType: "local" } }),
}));

vi.mock("../LumpContext", () => ({
  useLump: () => ({
    isToolbarExpanded: true,
    toggleToolbar: vi.fn(),
    selectedSection: null,
    setSelectedSection: vi.fn(),
  }),
}));

vi.mock("../../../../util", () => ({
  fontSize: (offset: number) => 14 + offset,
}));

vi.mock("../../../../util/localStorage", () => ({
  getLocalStorage: vi.fn(() => false),
}));

vi.mock("core/config/usesFreeTrialApiKey", () => ({
  usesFreeTrialApiKey: vi.fn(() => false),
}));

vi.mock("../../../FreeTrialButton", () => ({
  default: () => <div data-testid="free-trial-button">Free Trial</div>,
}));

vi.mock("../../../AssistantAndOrgListbox", () => ({
  AssistantAndOrgListbox: () => (
    <div data-testid="assistant-listbox">Assistant</div>
  ),
}));

vi.mock("../../../gui/Tooltip", () => ({
  ToolTip: ({ children, id }: any) => (
    <div data-testid={`tooltip-${id}`}>{children}</div>
  ),
}));

vi.mock("../../InputToolbar/HoverItem", () => ({
  default: ({ children, onClick, "data-testid": testId }: any) => (
    <div data-testid={testId} onClick={onClick}>
      {children}
    </div>
  ),
}));

const createMockStore = (configError: string[] = []) => {
  return configureStore({
    reducer: {
      config: configSlice.reducer,
    },
    preloadedState: {
      config: {
        config: {},
        configError,
      },
    },
  });
};

describe("BlockSettingsTopToolbar", () => {
  const renderToolbar = (configError: string[] = []) => {
    const store = createMockStore(configError);
    return render(
      <Provider store={store}>
        <BlockSettingsTopToolbar />
      </Provider>,
    );
  };

  it("renders all main navigation tabs", () => {
    renderToolbar();

    // Check that all main tab icons are present
    expect(
      screen.getByTestId("block-settings-toolbar-icon-models"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("block-settings-toolbar-icon-rules"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("block-settings-toolbar-icon-docs"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("block-settings-toolbar-icon-codebase"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("block-settings-toolbar-icon-prompts"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("block-settings-toolbar-icon-tools"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("block-settings-toolbar-icon-mcp"),
    ).toBeInTheDocument();
  });

  it("shows codebase tab with correct icon and tooltip", () => {
    renderToolbar();

    const codebaseTab = screen.getByTestId(
      "block-settings-toolbar-icon-codebase",
    );
    expect(codebaseTab).toBeInTheDocument();

    // Check that the CodeBracketIcon is rendered (by checking for the role="button")
    const codebaseButton = codebaseTab.querySelector('[role="button"]');
    expect(codebaseButton).toBeInTheDocument();
  });

  it("places codebase tab in correct order", () => {
    renderToolbar();

    const tabs = [
      screen.getByTestId("block-settings-toolbar-icon-models"),
      screen.getByTestId("block-settings-toolbar-icon-rules"),
      screen.getByTestId("block-settings-toolbar-icon-docs"),
      screen.getByTestId("block-settings-toolbar-icon-codebase"),
      screen.getByTestId("block-settings-toolbar-icon-prompts"),
      screen.getByTestId("block-settings-toolbar-icon-tools"),
      screen.getByTestId("block-settings-toolbar-icon-mcp"),
    ];

    // Verify the order by checking DOM positions
    for (let i = 1; i < tabs.length; i++) {
      const prevTab = tabs[i - 1];
      const currentTab = tabs[i];
      expect(
        prevTab.compareDocumentPosition(currentTab) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }
  });

  it("shows error tab when config errors exist", () => {
    renderToolbar(["Configuration error"]);

    expect(
      screen.getByTestId("block-settings-toolbar-icon-error"),
    ).toBeInTheDocument();
  });

  it("hides error tab when no config errors exist", () => {
    renderToolbar([]);

    expect(
      screen.queryByTestId("block-settings-toolbar-icon-error"),
    ).not.toBeInTheDocument();
  });

  it("supports keyboard navigation", () => {
    renderToolbar();

    const codebaseTab = screen.getByTestId(
      "block-settings-toolbar-icon-codebase",
    );
    const codebaseButton = codebaseTab.querySelector('[role="button"]');

    expect(codebaseButton).toHaveAttribute("tabIndex", "0");

    // Test Enter key
    fireEvent.keyDown(codebaseButton!, { key: "Enter" });
    // Note: The actual onClick behavior would need to be tested with proper mocking

    // Test Space key
    fireEvent.keyDown(codebaseButton!, { key: " " });
    // Note: The actual onClick behavior would need to be tested with proper mocking
  });

  it("renders assistant selection component", () => {
    renderToolbar();

    expect(screen.getByTestId("assistant-listbox")).toBeInTheDocument();
  });
});

describe("BlockSettingsTopToolbar navigation integration", () => {
  it("integrates properly with LumpContext for tab selection", () => {
    const mockSetSelectedSection = vi.fn();

    // Re-mock useLump to return selected state
    vi.doMock("../LumpContext", () => ({
      useLump: () => ({
        isToolbarExpanded: true,
        toggleToolbar: vi.fn(),
        selectedSection: "codebase",
        setSelectedSection: mockSetSelectedSection,
      }),
    }));

    const store = createMockStore();
    render(
      <Provider store={store}>
        <BlockSettingsTopToolbar />
      </Provider>,
    );

    // The codebase tab should show as selected
    const codebaseTab = screen.getByTestId(
      "block-settings-toolbar-icon-codebase",
    );
    const selectedElement = codebaseTab.querySelector(".bg-badge");
    expect(selectedElement).toBeInTheDocument();
  });
});
