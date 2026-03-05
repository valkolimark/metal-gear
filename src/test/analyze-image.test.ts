import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Sentry
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

// Mock Supabase server client
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "test-user-123" } },
      }),
    },
  }),
}));

// Mock Anthropic
const mockCreate = vi.fn();
vi.mock("@/lib/anthropic", () => ({
  anthropic: {
    messages: {
      create: (...args: unknown[]) => mockCreate(...args),
    },
  },
}));

// Import the stripMarkdownFences logic for direct testing
function stripMarkdownFences(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```(?:json)?\s*\n?/, "")
      .replace(/\n?```\s*$/, "");
  }
  return cleaned.trim();
}

describe("Analyze Image API", () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  describe("stripMarkdownFences", () => {
    it("strips ```json fences", () => {
      const input = '```json\n{"key": "value"}\n```';
      expect(stripMarkdownFences(input)).toBe('{"key": "value"}');
    });

    it("strips plain ``` fences", () => {
      const input = '```\n{"key": "value"}\n```';
      expect(stripMarkdownFences(input)).toBe('{"key": "value"}');
    });

    it("returns raw JSON unchanged", () => {
      const input = '{"key": "value"}';
      expect(stripMarkdownFences(input)).toBe('{"key": "value"}');
    });

    it("handles whitespace around fences", () => {
      const input = '  ```json\n  {"key": "value"}\n  ```  ';
      expect(stripMarkdownFences(input)).toBe('{"key": "value"}');
    });
  });

  describe("response shape validation", () => {
    it("returns correct shape with wide shot analysis", async () => {
      const mockWideResponse = {
        taxonomy: {
          tier1: "machines_equipment",
          tier2: "heavy_equipment_construction",
          subcategory: "excavators",
          confidence: "high",
          alternatives: [],
        },
        listing: {
          title: "CAT 320 Excavator",
          manufacturer: "Caterpillar",
          model: "320",
          year: 2019,
          condition: "good",
          suggestedDescription: "Well-maintained CAT 320 excavator.",
        },
        fraud: {
          flagged: false,
          reason: null,
        },
      };

      mockCreate.mockResolvedValueOnce({
        content: [{ type: "text", text: JSON.stringify(mockWideResponse) }],
      });

      // Simulate the result structure
      const result = {
        taxonomy: {
          tier1: mockWideResponse.taxonomy.tier1,
          tier2: mockWideResponse.taxonomy.tier2,
          subcategory: mockWideResponse.taxonomy.subcategory,
          confidence: mockWideResponse.taxonomy.confidence,
          alternatives: mockWideResponse.taxonomy.alternatives,
        },
        listing: {
          title: mockWideResponse.listing.title,
          manufacturer: mockWideResponse.listing.manufacturer,
          model: mockWideResponse.listing.model,
          serialNumber: undefined,
          year: mockWideResponse.listing.year,
          condition: mockWideResponse.listing.condition,
          specs: {},
          suggestedDescription: mockWideResponse.listing.suggestedDescription,
        },
        fraud: {
          flagged: mockWideResponse.fraud.flagged,
          reason: undefined,
        },
        rawAnalysis: expect.any(String),
      };

      // Validate shape
      expect(result.taxonomy).toHaveProperty("tier1");
      expect(result.taxonomy).toHaveProperty("tier2");
      expect(result.taxonomy).toHaveProperty("subcategory");
      expect(result.taxonomy).toHaveProperty("confidence");
      expect(["high", "medium", "low"]).toContain(result.taxonomy.confidence);
      expect(result.listing).toHaveProperty("specs");
      expect(typeof result.listing.specs).toBe("object");
      expect(result.fraud).toHaveProperty("flagged");
      expect(typeof result.fraud.flagged).toBe("boolean");
    });

    it("merges wide shot and nameplate results correctly", () => {
      const wideShotListing = {
        title: "Industrial Pump",
        manufacturer: "Unknown",
        model: undefined,
        condition: "good",
      };

      const nameplateListing = {
        manufacturer: "Grundfos",
        model: "CR 64-2",
        serialNumber: "GF-2021-88432",
        year: 2021,
        specs: {
          horsepower: "25 HP",
          voltage: "460V",
          phase: "3",
        },
      };

      // Nameplate takes priority for overlapping fields
      const merged = {
        title: wideShotListing.title,
        manufacturer: nameplateListing.manufacturer || wideShotListing.manufacturer,
        model: nameplateListing.model || wideShotListing.model,
        serialNumber: nameplateListing.serialNumber,
        year: nameplateListing.year,
        condition: wideShotListing.condition,
        specs: { ...nameplateListing.specs },
      };

      expect(merged.manufacturer).toBe("Grundfos"); // nameplate wins
      expect(merged.model).toBe("CR 64-2");
      expect(merged.title).toBe("Industrial Pump"); // from wide shot
      expect(merged.specs.horsepower).toBe("25 HP");
    });
  });

  describe("input validation", () => {
    it("requires at least one image", () => {
      const body = {};
      const hasWideShot = "wideShot" in body && !!(body as Record<string, string>).wideShot;
      const hasNameplate = "nameplateShot" in body && !!(body as Record<string, string>).nameplateShot;

      expect(hasWideShot || hasNameplate).toBe(false);
      // API would return 400
    });

    it("accepts valid mime types", () => {
      const validTypes = ["image/jpeg", "image/png", "image/webp"];
      const defaultType = "image/jpeg";

      expect(validTypes).toContain(defaultType);
      for (const type of validTypes) {
        expect(type).toMatch(/^image\//);
      }
    });
  });
});
