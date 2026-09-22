// Admin utilities - replace with OAuth verification later
export async function verifyAdminAccess(): Promise<boolean> {
  // TODO: Replace with OAuth verification
  // For now, return false (will be unlocked via OAuth later)
  // In development, you can manually set isAdmin=true in the database
  return false;
}
