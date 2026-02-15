// Admin emails - only these users see the admin panel
const ADMIN_EMAILS = [
  'admin@aivision.com',
  'kristian@aivision.com',
  // Add more admin emails here
];

export const isAdmin = (email) => {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
};

export default ADMIN_EMAILS;
