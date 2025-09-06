export interface ValidationOptions {
    strict?: boolean;
    allowExtraProperties?: boolean;
}

export interface ValidationResult {
    isValid: boolean;
    errors?: string[];
    warnings?: string[];
}