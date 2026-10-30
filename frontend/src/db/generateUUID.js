
export const generateUUID = () => {
  // Use the native UUID generator when available.
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  // Fallback for environments without randomUUID().
  if (typeof crypto.getRandomValues !== "function") {
    throw new Error(
      "Secure random number generation is unavailable. Please use HTTPS."
    );
  }

  // Generate 16 cryptographically random bytes.
  const bytes = crypto.getRandomValues(new Uint8Array(16));

  // Set UUID version 4 bits.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;

  // Set UUID variant bits.
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0")
  );

  return (
    hex.slice(0, 4).join("") +
    "-" +
    hex.slice(4, 6).join("") +
    "-" +
    hex.slice(6, 8).join("") +
    "-" +
    hex.slice(8, 10).join("") +
    "-" +
    hex.slice(10, 16).join("")
  );
};
