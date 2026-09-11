import { getTargetDimensions } from "./images";

describe("getTargetDimensions", () => {
  it("keeps images that are already within the limit", () => {
    expect(getTargetDimensions(1600, 1200)).toEqual({ width: 1600, height: 1200, scale: 1 });
  });

  it("scales landscape images by their long edge", () => {
    expect(getTargetDimensions(5120, 2880)).toEqual({ width: 2560, height: 1440, scale: 0.5 });
  });

  it("scales portrait images by their long edge", () => {
    expect(getTargetDimensions(3000, 6000)).toEqual({ width: 1280, height: 2560, scale: 1280 / 3000 });
  });
});
