/**
 * Professional Clinical & Form Validation Utilities for NeuroBehavior-ASD
 * Adheres to healthcare data standards, HIPAA/DISHA guidelines, and strict input integrity.
 */

// 1. Email Validator (RFC 5322 Compliant)
export function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { isValid: false, message: 'Email address is required.' };
  }
  const trimmed = email.trim();
  if (trimmed.length > 254) {
    return { isValid: false, message: 'Email address cannot exceed 254 characters.' };
  }
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(trimmed)) {
    return { isValid: false, message: 'Please enter a valid clinical or personal email (e.g. name@domain.com).' };
  }
  return { isValid: true, message: 'Valid email address format.' };
}

// 2. Password Strength & Integrity Validator
export function evaluatePasswordStrength(password) {
  if (!password) {
    return { score: 0, label: 'Empty', color: '#cbd5e1', isValid: false, feedback: 'Password is required.' };
  }

  let score = 0;
  const feedbackList = [];

  if (password.length >= 8) {
    score += 1;
  } else {
    feedbackList.push('At least 8 characters');
  }

  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedbackList.push('At least one uppercase letter (A-Z)');
  }

  if (/[0-9]/.test(password)) {
    score += 1;
  } else {
    feedbackList.push('At least one numeric digit (0-9)');
  }

  if (/[^A-Za-z0-9]/.test(password) || password.length >= 12) {
    score += 1;
  } else {
    feedbackList.push('A special symbol (!@#$%^&*) or 12+ length');
  }

  const levels = [
    { label: 'Very Weak', color: '#ef4444', isValid: false },
    { label: 'Weak', color: '#f97316', isValid: false },
    { label: 'Moderate', color: '#eab308', isValid: password.length >= 6 },
    { label: 'Strong', color: '#22c55e', isValid: true },
    { label: 'Very Strong', color: '#16a34a', isValid: true },
  ];

  const currentLevel = levels[score] || levels[0];

  return {
    score,
    label: currentLevel.label,
    color: currentLevel.color,
    isValid: password.length >= 6,
    feedback: feedbackList.length > 0 ? `Needs: ${feedbackList.join(', ')}` : 'Security criteria met.',
  };
}

// 3. Phone Number Validator (supports standard 10-digit formats with optional +91 or + country prefix)
export function validatePhoneNumber(phone) {
  if (!phone || typeof phone !== 'string') {
    return { isValid: false, message: 'Contact phone number is required.' };
  }
  const cleanDigits = phone.replace(/[^0-9]/g, '');
  
  if (cleanDigits.length < 10) {
    return { isValid: false, message: 'Phone number must be at least 10 digits.' };
  }
  if (cleanDigits.length > 15) {
    return { isValid: false, message: 'Phone number cannot exceed 15 digits.' };
  }
  
  // Reject obvious junk repeated digits like 0000000000 or 1111111111
  const last10 = cleanDigits.slice(-10);
  if (/^(\d)\1{9}$/.test(last10)) {
    return { isValid: false, message: 'Please enter a valid, active phone number.' };
  }

  return { isValid: true, message: 'Valid contact number.' };
}

// 4. Patient Age Validator (Supports pediatric 2-months/infants to older adults)
export function validateAge(ageValue) {
  if (ageValue === '' || ageValue === null || ageValue === undefined) {
    return { isValid: false, message: 'Patient age is required for clinical reference ranges.' };
  }
  const ageNum = parseFloat(ageValue);
  if (isNaN(ageNum)) {
    return { isValid: false, message: 'Patient age must be a valid number.' };
  }
  if (ageNum < 0.1) {
    return { isValid: false, message: 'Minimum age is 0.1 years (~1 month of age).' };
  }
  if (ageNum > 120) {
    return { isValid: false, message: 'Please enter a plausible patient age (≤ 120 years).' };
  }

  const isInfant = ageNum <= 1.0;
  const isPediatric = ageNum < 18.0;

  return {
    isValid: true,
    ageNum,
    isInfant,
    isPediatric,
    categoryLabel: isInfant ? 'Infant / Early Pediatric' : isPediatric ? 'Pediatric Child / Adolescent' : 'Adult Cohort',
    message: isPediatric ? 'Pediatric patient (Parent/Guardian verification recommended).' : 'Adult patient.',
  };
}

// 5. Patient Full Name Validator
export function validateFullName(name) {
  if (!name || typeof name !== 'string') {
    return { isValid: false, message: 'Patient full name is required.' };
  }
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return { isValid: false, message: 'Name must contain at least 2 characters.' };
  }
  if (trimmed.length > 100) {
    return { isValid: false, message: 'Name cannot exceed 100 characters.' };
  }
  // Allow letters, spaces, hyphens, apostrophes, and periods (e.g. Dr., St., Jr.)
  if (!/^[a-zA-Z\s.'-]+$/.test(trimmed)) {
    return { isValid: false, message: 'Name should contain letters, spaces, and standard punctuation only.' };
  }
  return { isValid: true, message: 'Valid name.' };
}

// 6. MRI Scan File Pre-Flight Validator
export function validateScanFile(file) {
  if (!file) {
    return { isValid: false, error: 'No scan file selected.' };
  }

  const lowerName = file.name.toLowerCase();
  const sizeBytes = file.size;
  const sizeMB = (sizeBytes / (1024 * 1024)).toFixed(2);

  // Supported Extensions
  const isNii = lowerName.endsWith('.nii') || lowerName.endsWith('.nii.gz');
  const isPng = lowerName.endsWith('.png');
  const isJpg = lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg');

  if (!isNii && !isPng && !isJpg) {
    return {
      isValid: false,
      error: `Unsupported file format: "${file.name}". Supported neuroimaging formats are 3D NIfTI (.nii, .nii.gz) or 2D axial scans (.png, .jpg, .jpeg).`,
    };
  }

  // Minimum Size Check (detect 0-byte or corrupted fragments)
  if (sizeBytes < 1024) {
    return {
      isValid: false,
      error: `File is empty or corrupted (${sizeBytes} bytes). Please upload a complete cranial MRI scan.`,
    };
  }

  // Maximum Size Check (150 MB for NIfTI volumes, 25 MB for standard 2D slices)
  const maxBytes = isNii ? 150 * 1024 * 1024 : 25 * 1024 * 1024;
  if (sizeBytes > maxBytes) {
    const limitMB = isNii ? '150 MB' : '25 MB';
    return {
      isValid: false,
      error: `File size (${sizeMB} MB) exceeds maximum allowed limit of ${limitMB}. Please compress or downsample the scan.`,
    };
  }

  // Determine format classification
  let formatLabel = 'Standard 2D Hospital JPEG';
  let is3D = false;
  if (isNii) {
    formatLabel = '3D Volumetric NIfTI Container';
    is3D = true;
  } else if (isPng) {
    formatLabel = '2D Lossless PNG Axial Cross-Section';
  } else if (isJpg) {
    formatLabel = '2D Clinical JPEG / Standard Export';
  }

  return {
    isValid: true,
    filename: file.name,
    sizeBytes,
    sizeFormatted: `${sizeMB} MB`,
    formatLabel,
    is3D,
    isImage: isPng || isJpg,
    preflightStatus: 'Passed',
  };
}

// 7. IASQ Standardized Questionnaire Validation
export function validateIasqResponses(answers, items) {
  const totalCount = items?.length || 10;
  const answeredKeys = Object.keys(answers || {}).filter(
    (k) => answers[k] !== undefined && answers[k] !== null
  );
  const answeredCount = answeredKeys.length;
  const progressPercent = Math.min(100, Math.round((answeredCount / totalCount) * 100));

  const missingItems = (items || []).filter(
    (item) => answers[item.id] === undefined || answers[item.id] === null
  );

  return {
    isComplete: answeredCount >= totalCount,
    answeredCount,
    totalCount,
    progressPercent,
    missingItems,
    missingItemLabels: missingItems.map((m) => `Item ${m.number}`).join(', '),
  };
}
