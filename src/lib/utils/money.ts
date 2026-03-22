export function parseLooseAmount(input: string) {
  const match = input.match(/(\d[\d,]*\.?\d{0,2})/);

  if (!match) {
    return 0;
  }

  return Number(match[1].replaceAll(",", ""));
}

export function formatAssetAmount(amount: number, asset: string) {
  return `${amount.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} ${asset}`;
}

export function formatBaseUnitAmount(value: bigint, decimals: number) {
  const zero = BigInt(0);
  const negativeOne = BigInt(-1);
  const baseTen = BigInt(10);
  const sign = value < zero ? "-" : "";
  const absolute = value < zero ? value * negativeOne : value;
  const base = baseTen ** BigInt(decimals);
  const whole = absolute / base;
  const fraction = absolute % base;

  if (fraction === zero) {
    return `${sign}${whole.toString()}`;
  }

  const fractionText = fraction.toString().padStart(decimals, "0").replace(/0+$/, "");
  return `${sign}${whole.toString()}.${fractionText}`;
}

export function toBaseUnitAmount(value: number, decimals: number) {
  const factor = 10 ** decimals;

  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("Transfer amount must be greater than zero.");
  }

  return BigInt(Math.round(value * factor));
}
