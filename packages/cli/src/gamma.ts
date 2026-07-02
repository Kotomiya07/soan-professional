export function assertGamma(gamma: number): void {
  if (!Number.isFinite(gamma) || gamma < 0.1 || gamma > 2.2) {
    throw new Error(`--gamma must be between 0.1 and 2.2: ${gamma}`);
  }
}

export function applyGammaToRgba(data: Uint8ClampedArray, gamma: number): Uint8ClampedArray {
  assertGamma(gamma);
  if (gamma === 1) {
    return data;
  }

  const inverseGamma = 1 / gamma;
  for (let offset = 0; offset < data.length; offset += 4) {
    data[offset] = Math.round(255 * ((data[offset] ?? 0) / 255) ** inverseGamma);
    data[offset + 1] = Math.round(255 * ((data[offset + 1] ?? 0) / 255) ** inverseGamma);
    data[offset + 2] = Math.round(255 * ((data[offset + 2] ?? 0) / 255) ** inverseGamma);
  }
  return data;
}
