/* eslint-disable no-console */
// Deliberately does NOT import `../config/env` — this script is how you
// produce OWNER_PASSWORD_HASH in the first place, before .env is complete.
import argon2 from "argon2";

async function main(): Promise<void> {
  const password = process.argv[2];
  if (!password) {
    console.error("Usage: npm run hash-password -- <password>");
    process.exit(1);
  }
  const hash = await argon2.hash(password);
  console.log(hash);
}

main().catch((error: unknown) => {
  console.error("Failed to hash password:", error);
  process.exit(1);
});
