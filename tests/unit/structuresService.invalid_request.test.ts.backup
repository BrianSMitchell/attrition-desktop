/// <reference types="jest" />
/**
 * Negative test for StructuresService.start when catalogKey is omitted.
 * Must return the standardized INVALID_REQUEST DTO per .clinerules/dto-error-schema-and-logging.md
 */

import { StructuresService } from "../services/structuresService";

describe("StructuresService.start - INVALID_REQUEST when catalogKey missing", () => {
  it("returns the exact INVALID_REQUEST payload when buildingKey (catalogKey) is missing", async () => {
    // Arrange
    const empireId = "emp1";
    const locationCoord = "A00:00:00:00";

    // Act (force missing catalogKey by passing undefined as any)
    const result = await StructuresService.start(empireId, locationCoord, undefined as any);

    // Assert exact payload
    expect(result).toEqual({
      success: false,
      code: "INVALID_REQUEST",
      message: "catalogKey is required",
      details: { field: "catalogKey" },
    });
  });
});
