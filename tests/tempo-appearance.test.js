import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_APPEARANCE, normalizeAppearance } from "../core/tempo-appearance.js";

test("new users get requested default area colors and system theme", () => {
  const appearance = normalizeAppearance();
  assert.deepEqual(appearance, {
    theme: "system",
    density: "normal",
    areaColors: {
      Studio: "#D65B56",
      Lavoro: "#29845C",
      Personale: "#D6A323"
    }
  });
});

test("custom colors and display preferences are retained independently", () => {
  const actual = normalizeAppearance({
    theme: "dark",
    density: "compact",
    areaColors: { Studio: "#f00a22", Lavoro: "#00c020", Personale: "#e9c700" }
  });
  assert.equal(actual.theme, "dark");
  assert.equal(actual.density, "compact");
  assert.deepEqual(actual.areaColors, {
    Studio: "#F00A22", Lavoro: "#00C020", Personale: "#E9C700"
  });
  assert.equal(DEFAULT_APPEARANCE.areaColors.Studio, "#D65B56");
});

test("malformed imported appearance falls back to safe defaults", () => {
  const actual = normalizeAppearance({
    theme: "invalid", density: "huge",
    areaColors: { Studio: "url(javascript:bad)", Lavoro: "#abcdef", Personale: "#xyz" }
  });
  assert.equal(actual.theme, "system");
  assert.equal(actual.density, "normal");
  assert.equal(actual.areaColors.Studio, "#D65B56");
  assert.equal(actual.areaColors.Lavoro, "#ABCDEF");
  assert.equal(actual.areaColors.Personale, "#D6A323");
});
