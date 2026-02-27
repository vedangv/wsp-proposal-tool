import { describe, it, expect } from "vitest";
import api from "./client";

describe("api client", () => {
  it("has correct baseURL", () => {
    expect(api.defaults.baseURL).toBe("http://localhost:8000");
  });
});
