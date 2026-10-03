export const validateName = (value: string): boolean => {
  return value.trim().length > 0;
};

export const validateType = (value: string): boolean => {
  return value.trim().length > 0;
};

export const validateGroupType = (value: string): boolean => {
  return value.trim().length > 0;
};

export const validateRole = (value: string): boolean => {
  return value.trim().length > 0;
};

export const validateCompany = (value: string): boolean => {
  return value.trim().length > 0;
};

export const validateCompanyOrGroup = (value: string): boolean => {
  return value.trim().length > 0;
};

export const validateBio = (value: string): boolean => {
  return value.trim().length > 0;
};

export const validateContacts = (value: string): boolean => {
  return value.trim().length > 0;
};

export const validateNotes = (value: string): boolean => {
  return value.trim().length > 0;
};

export const validateLinks = (value: string): boolean => {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed);
  } catch (e) {
    return false;
  }
};

export const validateMembers = (value: string): boolean => {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed);
  } catch (e) {
    return false;
  }
};

export const validateEntityType = (value: string): boolean => {
  return value.trim().length > 0;
};

export const validateSocialHandles = (value: string): boolean => {
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed);
  } catch (e) {
    return false;
  }
};

export const validatePreviousEpisodes = (value: string): boolean => {
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return false;
    }
    // Check that all elements are strings
    return parsed.every(item => typeof item === 'string');
  } catch (e) {
    return false;
  }
};

export const validatePreviousResearchSummary = (value: string): boolean => {
  return value.trim().length > 0;
};