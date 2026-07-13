/**
 * Validation utilities for forms
 */

export const validators = {
  required: (value) => {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return 'Field ini wajib diisi';
    }
    return '';
  },

  email: (value) => {
    if (!value) return '';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return 'Format email tidak valid';
    }
    return '';
  },

  minLength: (min) => (value) => {
    if (!value) return '';
    if (value.length < min) {
      return `Minimal ${min} karakter`;
    }
    return '';
  },

  maxLength: (max) => (value) => {
    if (!value) return '';
    if (value.length > max) {
      return `Maksimal ${max} karakter`;
    }
    return '';
  },

  number: (value) => {
    if (!value) return '';
    if (isNaN(Number(value))) {
      return 'Harus berupa angka';
    }
    return '';
  },

  phone: (value) => {
    if (!value) return '';
    const phoneRegex = /^(\+62|62|0)[0-9]{8,15}$/;
    if (!phoneRegex.test(value)) {
      return 'Format nomor telepon tidak valid';
    }
    return '';
  },

  nik: (value) => {
    if (!value) return '';
    const nikRegex = /^[0-9]{16}$/;
    if (!nikRegex.test(value)) {
      return 'NIK harus 16 digit angka';
    }
    return '';
  },

  password: (value) => {
    if (!value) return '';
    const errors = [];
    
    if (value.length < 8) {
      errors.push('Minimal 8 karakter');
    }
    if (!/[A-Z]/.test(value)) {
      errors.push('Harus ada huruf kapital');
    }
    if (!/[a-z]/.test(value)) {
      errors.push('Harus ada huruf kecil');
    }
    if (!/[0-9]/.test(value)) {
      errors.push('Harus ada angka');
    }
    
    if (errors.length > 0) {
      return errors.join(', ');
    }
    return '';
  },

  positiveNumber: (value) => {
    if (!value) return '';
    if (Number(value) <= 0) {
      return 'Harus lebih dari 0';
    }
    return '';
  }
};

/**
 * Combine multiple validators
 */
export const validate = (value, rules) => {
  for (const rule of rules) {
    const error = rule(value);
    if (error) return error;
  }
  return '';
};

/**
 * Login form validation
 */
export const validateLoginForm = (values) => {
  const errors = {};
  
  const emailError = validate(values.email, [validators.required, validators.email]);
  if (emailError) errors.email = emailError;
  
  const passwordError = validate(values.password, [validators.required]);
  if (passwordError) errors.password = passwordError;
  
  return errors;
};

/**
 * User form validation
 */
export const validateUserForm = (values) => {
  const errors = {};
  
  const nameError = validate(values.nama_lengkap, [validators.required]);
  if (nameError) errors.nama_lengkap = nameError;
  
  const emailError = validate(values.email, [validators.required, validators.email]);
  if (emailError) errors.email = emailError;
  
  if (values.isNewUser || values.password) {
    const passwordError = validate(values.password, [validators.required, validators.password]);
    if (passwordError) errors.password = passwordError;
  }
  
  const roleError = validate(values.role, [validators.required]);
  if (roleError) errors.role = roleError;
  
  return errors;
};

/**
 * Patient form validation
 */
export const validatePatientForm = (values) => {
  const errors = {};
  
  const nameError = validate(values.nama_pasien, [validators.required]);
  if (nameError) errors.nama_pasien = nameError;
  
  if (values.nik) {
    const nikError = validate(values.nik, [validators.nik]);
    if (nikError) errors.nik = nikError;
  }
  
  if (values.no_telepon) {
    const phoneError = validate(values.no_telepon, [validators.phone]);
    if (phoneError) errors.no_telepon = phoneError;
  }
  
  return errors;
};
