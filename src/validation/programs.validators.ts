import { Program, ShowFormat, CameraConfig } from '../types/domain';

// Validate Program data
export function validateProgram(data: Partial<Program>): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate required fields
  if (!data.title || typeof data.title !== 'string' || data.title.trim() === '') {
    errors.push('Título é obrigatório e deve ser uma string não vazia');
  }

  if (!data.description || typeof data.description !== 'string') {
    errors.push('Descrição é obrigatória e deve ser uma string');
  }

  if (!data.host || typeof data.host !== 'string' || data.host.trim() === '') {
    errors.push('Host é obrigatório e deve ser uma string não vazia');
  }

  // Validate format
  const validFormats: ShowFormat[] = [
    'Entrevista',
    'Programa Solo',
    'Mesa Redonda',
    'Podcast/Videocast',
    'Debate',
    'Reportagem',
    'Especial'
  ];
  
  if (data.format !== undefined && !validFormats.includes(data.format)) {
    errors.push('Formato inválido');
  }

  // Validate defaultDurationMin
  if (data.defaultDurationMin !== undefined && 
      (typeof data.defaultDurationMin !== 'number' || data.defaultDurationMin < 0)) {
    errors.push('Duração mínima padrão deve ser um número não negativo');
  }

  // Validate strings that should be strings
  const stringFields = ['editorialStyle', 'scenario', 'defaultOpening', 'defaultClosing'];
  for (const field of stringFields) {
    if (data[field] !== undefined && typeof data[field] !== 'string') {
      errors.push(`${field} deve ser uma string`);
    }
  }

  // Validate cameras array
  if (data.cameras !== undefined) {
    if (!Array.isArray(data.cameras)) {
      errors.push('Câmeras deve ser um array');
    } else {
      for (let i = 0; i < data.cameras.length; i++) {
        const camera = data.cameras[i];
        if (!camera) {
          errors.push(`Câmera ${i}: é obrigatória`);
          continue;
        }
        
        if (!camera.id || typeof camera.id !== 'string') {
          errors.push(`Câmera ${i}: id é obrigatório e deve ser uma string`);
        }
        
        if (!camera.name || typeof camera.name !== 'string') {
          errors.push(`Câmera ${i}: name é obrigatório e deve ser uma string`);
        }
        
        if (camera.active !== undefined && typeof camera.active !== 'boolean') {
          errors.push(`Câmera ${i}: active deve ser um booleano`);
        }
      }
    }
  }

  // Validate standardStructure array
  if (data.standardStructure !== undefined && !Array.isArray(data.standardStructure)) {
    errors.push('Estrutura padrão deve ser um array');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Validate Program creation data (id, createdAt, updatedAt are optional)
export function validateProgramCreation(data: Partial<Program>): { isValid: boolean; errors: string[] } {
  return validateProgram(data);
}

// Validate Program update data (all fields are optional)
export function validateProgramUpdate(data: Partial<Program>): { isValid: boolean; errors: string[] } {
  return validateProgram(data);
}
